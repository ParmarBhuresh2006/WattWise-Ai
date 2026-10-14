/**
 * Backend integration tests — run with: npm test (from backend/)
 * Requires: MongoDB running locally on 127.0.0.1:27017
 */
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/wattwise_test';
process.env.JWT_SECRET = 'test_jwt_secret_32chars_minimum_xx';
process.env.ML_ENGINE_HOST = '127.0.0.1';
process.env.ML_ENGINE_PORT = '8001';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/server');

// ─── Test Data ────────────────────────────────────────────────────────────────
const testUser = { name: 'Test User', email: 'test@example.com', password: 'TestPass123' };
let token = '';
let readingId = '';

beforeAll(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
});

afterAll(async () => {
  // Clean up test data
  const User = require('../src/models/User');
  const EnergyReading = require('../src/models/EnergyReading');
  await User.deleteMany({ email: testUser.email });
  await EnergyReading.deleteMany({});
  await mongoose.disconnect();
});

// ─── Auth Tests ───────────────────────────────────────────────────────────────
describe('POST /api/v1/auth/register', () => {
  test('should register a new user', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.password).toBeUndefined();
    token = res.body.token;
  });

  test('should reject duplicate email', async () => {
    const res = await request(app).post('/api/v1/auth/register').send(testUser);
    expect(res.status).toBe(409);
  });

  test('should reject missing name', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ email: 'a@b.com', password: 'Pass1234' });
    expect(res.status).toBe(400);
  });

  test('should reject short password', async () => {
    const res = await request(app).post('/api/v1/auth/register').send({ name: 'X', email: 'x@x.com', password: 'short' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  test('should login with correct credentials', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: testUser.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    token = res.body.token;
  });

  test('should reject wrong password', async () => {
    const res = await request(app).post('/api/v1/auth/login').send({ email: testUser.email, password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/auth/me', () => {
  test('should return authenticated user', async () => {
    const res = await request(app).get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
  });

  test('should reject unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/auth/me');
    expect(res.status).toBe(401);
  });
});

// ─── Energy CRUD Tests ────────────────────────────────────────────────────────
describe('Energy Records', () => {
  test('POST /api/v1/energy — should create a reading', async () => {
    const res = await request(app)
      .post('/api/v1/energy')
      .set('Authorization', `Bearer ${token}`)
      .send({ readingDate: '2024-06-15', kWh: 12.5, meterId: 'M1', notes: 'Test' });
    expect(res.status).toBe(201);
    expect(res.body.data.kWh).toBe(12.5);
    readingId = res.body.data._id;
  });

  test('POST /api/v1/energy — should reject negative kWh', async () => {
    const res = await request(app)
      .post('/api/v1/energy')
      .set('Authorization', `Bearer ${token}`)
      .send({ readingDate: '2024-06-15', kWh: -5 });
    expect(res.status).toBe(400);
  });

  test('GET /api/v1/energy — should list readings', async () => {
    const res = await request(app).get('/api/v1/energy').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/v1/energy/:id — should return specific reading', async () => {
    const res = await request(app).get(`/api/v1/energy/${readingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.data._id).toBe(readingId);
  });

  test('PUT /api/v1/energy/:id — should update reading', async () => {
    const res = await request(app)
      .put(`/api/v1/energy/${readingId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ kWh: 15.0 });
    expect(res.status).toBe(200);
    expect(res.body.data.kWh).toBe(15.0);
  });

  test('DELETE /api/v1/energy/:id — should delete reading', async () => {
    const res = await request(app)
      .delete(`/api/v1/energy/${readingId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  test('GET /api/v1/energy/:id — should 404 after delete', async () => {
    const res = await request(app).get(`/api/v1/energy/${readingId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });
});

// ─── Analytics Tests ──────────────────────────────────────────────────────────
describe('Analytics', () => {
  beforeAll(async () => {
    // Create some readings for analytics
    const EnergyReading = require('../src/models/EnergyReading');
    const User = require('../src/models/User');
    const user = await User.findOne({ email: testUser.email });
    const now = new Date();
    const readings = Array.from({ length: 30 }, (_, i) => {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      return { user: user._id, readingDate: d, kWh: 10 + Math.random() * 5, source: 'manual' };
    });
    await EnergyReading.insertMany(readings);
  });

  test('GET /api/v1/analytics/summary', async () => {
    const res = await request(app).get('/api/v1/analytics/summary').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.totalKwh).toBe('number');
  });

  test('GET /api/v1/analytics/consumption', async () => {
    const res = await request(app).get('/api/v1/analytics/consumption').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/v1/analytics/cost', async () => {
    const res = await request(app).get('/api/v1/analytics/cost').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });
});

// ─── Settings Tests ───────────────────────────────────────────────────────────
describe('Settings', () => {
  test('GET /api/v1/settings', async () => {
    const res = await request(app).get('/api/v1/settings').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(typeof res.body.data.tariffPerKwh).toBe('number');
  });

  test('PUT /api/v1/settings — should update tariff', async () => {
    const res = await request(app)
      .put('/api/v1/settings')
      .set('Authorization', `Bearer ${token}`)
      .send({ tariffPerKwh: 9.5, fixedMonthlyCharge: 150 });
    expect(res.status).toBe(200);
    expect(res.body.data.tariffPerKwh).toBe(9.5);
  });
});

// ─── Goals Tests ──────────────────────────────────────────────────────────────
describe('Goals', () => {
  let goalId;
  test('POST /api/v1/goals', async () => {
    const res = await request(app)
      .post('/api/v1/goals')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Reduce June usage',
        targetKwh: 200,
        period: 'monthly',
        startDate: '2024-06-01',
        endDate: '2024-06-30',
      });
    expect(res.status).toBe(201);
    goalId = res.body.data._id;
  });

  test('GET /api/v1/goals', async () => {
    const res = await request(app).get('/api/v1/goals').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('DELETE /api/v1/goals/:id', async () => {
    const res = await request(app).delete(`/api/v1/goals/${goalId}`).set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });
});

// ─── Data isolation test ──────────────────────────────────────────────────────
describe('Data Isolation', () => {
  let user2Token;
  test('User 2 cannot see User 1 readings', async () => {
    // Register user 2
    const reg = await request(app).post('/api/v1/auth/register').send({
      name: 'User Two', email: 'user2@example.com', password: 'TestPass456',
    });
    user2Token = reg.body.token;

    // User 2's readings should be empty
    const res = await request(app).get('/api/v1/energy').set('Authorization', `Bearer ${user2Token}`);
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBe(0);
  });

  afterAll(async () => {
    const User = require('../src/models/User');
    await User.deleteMany({ email: 'user2@example.com' });
  });
});

// ─── Recommendations Tests ───────────────────────────────────────────────────
describe('Recommendations', () => {
  test('GET /api/v1/recommendations — returns data-backed recommendations', async () => {
    const res = await request(app).get('/api/v1/recommendations').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/v1/recommendations/:id/dismiss — dismisses recommendation', async () => {
    const res = await request(app)
      .post('/api/v1/recommendations/period-increase/dismiss')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.dismissedId).toBe('period-increase');
  });
});

// ─── Sample Data Seeding & CSV Import Deduplication ───────────────────────────
describe('Sample Seeding & Deduplication', () => {
  test('POST /api/v1/energy/seed-sample — seeds sample readings', async () => {
    const res = await request(app)
      .post('/api/v1/energy/seed-sample')
      .set('Authorization', `Bearer ${token}`)
      .send({ days: 30 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.count).toBe('number');
  });

  test('POST /api/v1/energy/import — rejects non-CSV content', async () => {
    const res = await request(app)
      .post('/api/v1/energy/import')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', Buffer.from('hello,world'), 'test.txt');
    expect(res.status).toBe(500); // Multer fileFilter error triggers centralized handler
  });

  test('GET /health — health check returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('wattwise-backend');
  });
});
