require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const energyRoutes = require('./routes/energy');
const analyticsRoutes = require('./routes/analytics');
const mlRoutes = require('./routes/ml');
const recommendationsRoutes = require('./routes/recommendations');
const goalsRoutes = require('./routes/goals');
const settingsRoutes = require('./routes/settings');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: { success: false, message: 'Too many requests, please try again later.' },
});
app.use('/api', limiter);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'wattwise-backend' }));

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/energy', energyRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/ml', mlRoutes);
app.use('/api/v1/recommendations', recommendationsRoutes);
app.use('/api/v1/goals', goalsRoutes);
app.use('/api/v1/settings', settingsRoutes);

app.use((req, res) => res.status(404).json({ success: false, message: `Route ${req.method} ${req.path} not found.` }));

app.use(errorHandler);

const start = async () => {
  await connectDB();
  app.listen(PORT, '127.0.0.1', () => {
    console.log(`[WattWise] Backend running at http://127.0.0.1:${PORT}`);
  });
};

if (require.main === module) {
  start().catch((err) => {
    console.error('[WattWise] Startup failed:', err.message);
    process.exit(1);
  });
}

module.exports = app;

