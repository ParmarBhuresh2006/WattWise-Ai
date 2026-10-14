const EnergyReading = require('../models/EnergyReading');
const { parse } = require('csv-parse/sync');
const { stringify } = require('csv-stringify/sync');

// GET /api/v1/energy
exports.getReadings = async (req, res, next) => {
  try {
    const { startDate, endDate, meterId, page = 1, limit = 50 } = req.query;
    const filter = { user: req.user._id };

    if (startDate || endDate) {
      filter.readingDate = {};
      if (startDate) filter.readingDate.$gte = new Date(startDate);
      if (endDate) filter.readingDate.$lte = new Date(endDate);
    }
    if (meterId) filter.meterId = meterId;

    const skip = (Number(page) - 1) * Number(limit);
    const [readings, total] = await Promise.all([
      EnergyReading.find(filter).sort({ readingDate: -1 }).skip(skip).limit(Number(limit)),
      EnergyReading.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: readings,
      pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/energy
exports.createReading = async (req, res, next) => {
  try {
    const { readingDate, kWh, meterId, category, notes } = req.body;
    const reading = await EnergyReading.create({
      user: req.user._id,
      readingDate: new Date(readingDate),
      kWh: Number(kWh),
      meterId: meterId || 'main',
      category: category || '',
      notes: notes || '',
      source: 'manual',
    });
    res.status(201).json({ success: true, data: reading });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/energy/:id
exports.getReading = async (req, res, next) => {
  try {
    const reading = await EnergyReading.findOne({ _id: req.params.id, user: req.user._id });
    if (!reading) return res.status(404).json({ success: false, message: 'Reading not found.' });
    res.json({ success: true, data: reading });
  } catch (err) {
    next(err);
  }
};

// PUT /api/v1/energy/:id
exports.updateReading = async (req, res, next) => {
  try {
    const { readingDate, kWh, meterId, category, notes } = req.body;
    const reading = await EnergyReading.findOne({ _id: req.params.id, user: req.user._id });
    if (!reading) return res.status(404).json({ success: false, message: 'Reading not found.' });

    if (readingDate !== undefined) reading.readingDate = new Date(readingDate);
    if (kWh !== undefined) reading.kWh = Number(kWh);
    if (meterId !== undefined) reading.meterId = meterId;
    if (category !== undefined) reading.category = category;
    if (notes !== undefined) reading.notes = notes;

    await reading.save();
    res.json({ success: true, data: reading });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/v1/energy/:id
exports.deleteReading = async (req, res, next) => {
  try {
    const reading = await EnergyReading.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    if (!reading) return res.status(404).json({ success: false, message: 'Reading not found.' });
    res.json({ success: true, message: 'Reading deleted.' });
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/energy/import  — CSV upload
exports.importCSV = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No CSV file uploaded.' });

    const content = req.file.buffer.toString('utf8');
    let records;
    try {
      records = parse(content, { columns: true, skip_empty_lines: true, trim: true });
    } catch (parseErr) {
      return res.status(400).json({ success: false, message: `CSV parse error: ${parseErr.message}` });
    }

    if (!records.length) {
      return res.status(400).json({ success: false, message: 'CSV file is empty.' });
    }

    // Detect column names (case-insensitive)
    const firstRow = records[0];
    const cols = Object.keys(firstRow).map((k) => k.toLowerCase());
    const dateCol = Object.keys(firstRow).find((k) => /date|timestamp|time/i.test(k));
    const kwhCol = Object.keys(firstRow).find((k) => /kwh|energy|consumption|reading/i.test(k));

    if (!dateCol || !kwhCol) {
      return res.status(400).json({
        success: false,
        message: `CSV must have a date column (date/timestamp) and an energy column (kWh/energy/consumption). Found: ${cols.join(', ')}`,
      });
    }

    const meterCol = Object.keys(firstRow).find((k) => /meter/i.test(k));
    const catCol = Object.keys(firstRow).find((k) => /category|type/i.test(k));
    const notesCol = Object.keys(firstRow).find((k) => /note/i.test(k));

    const toInsert = [];
    const errors = [];

    for (let i = 0; i < records.length; i++) {
      const row = records[i];
      const rawDate = row[dateCol];
      const rawKwh = row[kwhCol];

      const d = new Date(rawDate);
      if (isNaN(d.getTime())) {
        errors.push(`Row ${i + 2}: invalid date "${rawDate}"`);
        continue;
      }
      const kwh = parseFloat(rawKwh);
      if (isNaN(kwh) || kwh < 0) {
        errors.push(`Row ${i + 2}: invalid kWh value "${rawKwh}"`);
        continue;
      }

      const meter = meterCol ? (row[meterCol] || 'main') : 'main';
      toInsert.push({
        user: req.user._id,
        readingDate: d,
        kWh: kwh,
        meterId: meter,
        category: catCol ? (row[catCol] || '') : '',
        notes: notesCol ? (row[notesCol] || '') : '',
        source: 'csv_import',
      });
    }

    if (!toInsert.length) {
      return res.status(400).json({ success: false, message: 'No valid rows to import.', errors });
    }

    // Deduplicate within the file itself
    const uniqueBatch = [];
    const seenBatchKeys = new Set();
    let intraFileDuplicates = 0;

    for (const item of toInsert) {
      const key = `${item.readingDate.toISOString()}_${item.meterId}`;
      if (seenBatchKeys.has(key)) {
        intraFileDuplicates++;
        continue;
      }
      seenBatchKeys.add(key);
      uniqueBatch.push(item);
    }

    // Check against existing database records for this user
    const dateValues = uniqueBatch.map((r) => r.readingDate.getTime());
    const minDate = new Date(Math.min(...dateValues));
    const maxDate = new Date(Math.max(...dateValues));

    const existingRecords = await EnergyReading.find({
      user: req.user._id,
      readingDate: { $gte: minDate, $lte: maxDate },
    }).select('readingDate meterId').lean();

    const existingSet = new Set(
      existingRecords.map((r) => `${new Date(r.readingDate).toISOString()}_${r.meterId || 'main'}`)
    );

    const readyToInsert = uniqueBatch.filter((item) => {
      const key = `${item.readingDate.toISOString()}_${item.meterId}`;
      return !existingSet.has(key);
    });

    const duplicatesSkipped = (toInsert.length - uniqueBatch.length) + (uniqueBatch.length - readyToInsert.length);

    let inserted = [];
    if (readyToInsert.length > 0) {
      inserted = await EnergyReading.insertMany(readyToInsert, { ordered: false });
    }

    res.status(readyToInsert.length > 0 ? 201 : 200).json({
      success: true,
      message: readyToInsert.length > 0
        ? `Imported ${inserted.length} readings (${duplicatesSkipped} duplicates skipped).`
        : `No new readings imported. All ${duplicatesSkipped} rows were duplicates.`,
      imported: inserted.length,
      duplicatesSkipped,
      errors,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/v1/energy/export
exports.exportCSV = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const filter = { user: req.user._id };
    if (startDate || endDate) {
      filter.readingDate = {};
      if (startDate) filter.readingDate.$gte = new Date(startDate);
      if (endDate) filter.readingDate.$lte = new Date(endDate);
    }

    const readings = await EnergyReading.find(filter).sort({ readingDate: 1 });
    const rows = readings.map((r) => ({
      date: r.readingDate.toISOString().slice(0, 10),
      kWh: r.kWh,
      meterId: r.meterId,
      category: r.category,
      notes: r.notes,
    }));

    const csv = stringify(rows, { header: true });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="wattwise-export.csv"');
    res.send(csv);
  } catch (err) {
    next(err);
  }
};

// POST /api/v1/energy/seed-sample — Populate realistic sample data for demonstration
exports.seedSampleReadings = async (req, res, next) => {
  try {
    const days = Math.min(Math.max(Number(req.body.days || 60), 14), 365);
    const now = new Date();
    const toInsert = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      d.setHours(12, 0, 0, 0);

      const dayOfWeek = d.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const baseKwh = 10.0;
      const weekendFactor = isWeekend ? 1.2 : 1.0;
      const seasonal = 1.0 + 0.15 * Math.sin((d.getMonth() / 12) * 2 * Math.PI);
      const noise = (Math.random() - 0.5) * 1.8;
      const kwh = Math.max(1.0, +(baseKwh * weekendFactor * seasonal + noise).toFixed(3));

      toInsert.push({
        user: req.user._id,
        readingDate: d,
        kWh: kwh,
        meterId: 'main',
        category: 'residential',
        notes: 'SYNTHETIC_SAMPLE_DATA_NOT_REAL_MEASUREMENTS',
        source: 'generated_sample',
        isSample: true,
      });
    }

    // Filter out dates already present for this user
    const minDate = toInsert[0].readingDate;
    const maxDate = toInsert[toInsert.length - 1].readingDate;
    const existing = await EnergyReading.find({
      user: req.user._id,
      readingDate: { $gte: minDate, $lte: maxDate },
    }).select('readingDate').lean();

    const existingDays = new Set(
      existing.map((r) => new Date(r.readingDate).toISOString().slice(0, 10))
    );

    const nonDuplicates = toInsert.filter(
      (r) => !existingDays.has(r.readingDate.toISOString().slice(0, 10))
    );

    let inserted = [];
    if (nonDuplicates.length > 0) {
      inserted = await EnergyReading.insertMany(nonDuplicates, { ordered: false });
    }

    res.status(201).json({
      success: true,
      message: `Generated and loaded ${inserted.length} sample readings (${toInsert.length - nonDuplicates.length} already existed).`,
      count: inserted.length,
      isSample: true,
    });
  } catch (err) {
    next(err);
  }
};
