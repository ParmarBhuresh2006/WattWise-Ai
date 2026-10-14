# WattWise AI — Data Dictionary & Schema Specification

## 1. Database Collections (MongoDB / Mongoose)

### 1.1 `users` Collection

Stores registered user profiles, authentication credentials, and user-configurable tariff settings.

| Field | Type | Required | Default | Constraints & Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | — | Primary Key |
| `name` | String | Yes | — | User's full name (max 100 characters, trimmed) |
| `email` | String | Yes | — | Unique, lowercase, valid email regex pattern |
| `password` | String | Yes | — | bcrypt hash (min 8 chars plain; `select: false` by default) |
| `role` | String | No | `'user'` | Enum: `['user', 'admin']` |
| `settings.tariffPerKwh` | Number | No | `8.0` | Configured electricity rate per kWh (e.g. INR) |
| `settings.fixedMonthlyCharge` | Number | No | `100.0` | Fixed monthly service fee |
| `settings.emissionFactor` | Number | No | `0.82` | Grid emission factor in kg CO₂/kWh (CEA India avg) |
| `settings.currency` | String | No | `'INR'` | Currency code (e.g. `INR`, `USD`, `EUR`, `GBP`) |
| `createdAt` | Date | Auto | `now` | Creation timestamp |
| `updatedAt` | Date | Auto | `now` | Last update timestamp |

---

### 1.2 `energyreadings` Collection

Stores historical and imported electricity readings. Always recorded in **kilowatt-hours (kWh)**.

| Field | Type | Required | Default | Constraints & Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | — | Primary Key |
| `user` | ObjectId | Yes | — | Foreign reference to `users._id` (indexed) |
| `readingDate` | Date | Yes | — | Measurement date/timestamp (indexed) |
| `kWh` | Number | Yes | — | Energy consumed; min: `0.0`, max: `100000.0` |
| `meterId` | String | No | `'main'` | Identifier for sub-meter or branch circuit |
| `category` | String | No | `''` | Enum: `['residential', 'commercial', 'industrial', 'other', '']` |
| `notes` | String | No | `''` | Optional remarks (max 500 characters) |
| `source` | String | No | `'manual'` | Enum: `['manual', 'csv_import', 'generated_sample']` |
| `isSample` | Boolean | No | `false` | Distinguishes synthetic sample data from real readings |
| `createdAt` | Date | Auto | `now` | Record entry timestamp |
| `updatedAt` | Date | Auto | `now` | Record modification timestamp |

**Indexes:**
- `{ user: 1, readingDate: -1 }`: Optimizes chronological range queries per user.
- `{ user: 1, meterId: 1, readingDate: -1 }`: Optimizes sub-meter specific queries.

---

### 1.3 `energygoals` Collection

Tracks user-defined consumption reduction targets over specific periods.

| Field | Type | Required | Default | Constraints & Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | — | Primary Key |
| `user` | ObjectId | Yes | — | Foreign reference to `users._id` (indexed) |
| `title` | String | Yes | — | Description (e.g., "October Conservation Target") |
| `targetKwh` | Number | Yes | — | Target cap in kWh (min: `0.1`) |
| `period` | String | No | `'monthly'` | Enum: `['monthly', 'weekly']` |
| `startDate` | Date | Yes | — | Goal period start date |
| `endDate` | Date | Yes | — | Goal period end date |
| `isActive` | Boolean | No | `true` | Active goal status indicator |
| `notes` | String | No | `''` | Optional goal notes |

---

### 1.4 `mlmodelmetas` Collection

Maintains a versioned audit trail of trained machine learning models and performance metrics.

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `_id` | ObjectId | Auto | — | Primary Key |
| `version` | String | Yes | — | Version string (e.g., `YYYYMMDD_HHMMSS`) |
| `trainedAt` | Date | Yes | — | Exact training timestamp |
| `algorithm` | String | Yes | — | Name of winning candidate (e.g., `Ridge`) |
| `features` | [String] | Yes | — | Array of 12 input feature names used |
| `trainingSamples`| Number | Yes | — | Number of training instances utilized |
| `metrics.mae` | Number | Yes | — | Test fold Mean Absolute Error (kWh) |
| `metrics.rmse`| Number | Yes | — | Test fold Root Mean Squared Error (kWh) |
| `metrics.r2`  | Number | Yes | — | Test fold $R^2$ determination coefficient |
| `metrics.baselineMae` | Number | Yes | — | Persistence baseline MAE for direct comparison |
| `metrics.baselineRmse`| Number | Yes | — | Persistence baseline RMSE for direct comparison |
| `modelPath` | String | Yes | — | Absolute filesystem path to serialized `.pkl` |
| `isActive` | Boolean | No | `true` | Indicates active model used for inference |

---

## 2. CSV File Import Schema

WattWise AI supports CSV data import via the web interface (`/energy` -> "Import CSV") or REST API (`POST /api/v1/energy/import`).

### Column Specifications

| Header Name | Permitted Aliases | Data Type | Required | Example |
|---|---|---|---|---|
| `date` | `timestamp`, `time`, `readingDate` | String (ISO / YYYY-MM-DD) | **YES** | `2026-10-14` |
| `kWh` | `energy`, `consumption`, `reading` | Float (non-negative) | **YES** | `12.450` |
| `meterId` | `meter`, `submeter` | String (max 50 chars) | No | `main_panel` |
| `category` | `type`, `building_type` | String | No | `residential` |
| `notes` | `note`, `remarks` | String (max 500 chars) | No | `Normal usage` |

### Sample CSV Snippet
```csv
date,kWh,meterId,category,notes
2026-09-01,11.23,main,residential,Baseline reading
2026-09-02,10.84,main,residential,Normal usage
2026-09-03,14.50,main,residential,High laundry usage
2026-09-04,9.75,main,residential,Reduced usage
```

### Validation Rules
1. **Header Detection:** The CSV parser automatically detects case-insensitive variations of `date` and `kWh`.
2. **Date Parsing:** Dates must be valid Gregorian calendar dates. Invalid dates are rejected and logged in the error summary.
3. **Value Bounds:** Negative numbers or non-numeric strings trigger row-level rejection.
4. **Duplicate Prevention:**
   - Intra-file duplicates (multiple rows with identical date and meter) are automatically filtered out.
   - Cross-database duplicates (rows matching existing readings for the authenticated user) are skipped without terminating valid rows.
