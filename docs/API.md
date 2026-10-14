# WattWise AI — REST API Documentation

Base URL: `http://localhost:5000/api/v1`  
Protocol: `HTTP/1.1`  
Data Format: `application/json` (except CSV upload/export)  
Authentication: HTTP Bearer Token (`Authorization: Bearer <JWT>`)

---

## Standard Response Format

All JSON responses follow a consistent schema:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional descriptive status message"
}
```

### Error Response
```json
{
  "success": false,
  "message": "Human-readable explanation of error",
  "errors": [
    { "field": "kWh", "message": "kWh must be a non-negative number" }
  ]
}
```

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### `POST /auth/register`
Creates a new user account.

**Request Body:**
```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "_id": "670c1e8b2f1a9b0012345678",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user",
    "settings": {
      "tariffPerKwh": 8.0,
      "fixedMonthlyCharge": 100,
      "emissionFactor": 0.82,
      "currency": "INR"
    }
  }
}
```

### `POST /auth/login`
Authenticates existing credentials and returns a JWT token.

**Request Body:**
```json
{
  "email": "jane@example.com",
  "password": "SecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
  "user": {
    "_id": "670c1e8b2f1a9b0012345678",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user"
  }
}
```

### `GET /auth/me`
Fetches current user profile. Requires `Bearer <JWT>`.

**Response (200 OK):**
```json
{
  "success": true,
  "user": {
    "_id": "670c1e8b2f1a9b0012345678",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "settings": { "tariffPerKwh": 8.0, "currency": "INR" }
  }
}
```

---

## 2. Energy Readings Endpoints (`/api/v1/energy`)

### `GET /energy`
Fetches paginated energy readings for the authenticated user.

**Query Parameters:**
- `page` (integer, optional, default: `1`)
- `limit` (integer, optional, default: `20`, max: `500`)
- `startDate` (ISO8601 string, optional)
- `endDate` (ISO8601 string, optional)
- `meterId` (string, optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "_id": "670c201e2f1a9b0012345679",
      "readingDate": "2026-10-14T12:00:00.000Z",
      "kWh": 11.25,
      "meterId": "main",
      "category": "residential",
      "notes": "Normal household usage",
      "source": "manual",
      "isSample": false
    }
  ],
  "pagination": {
    "total": 60,
    "page": 1,
    "limit": 20,
    "pages": 3
  }
}
```

### `POST /energy`
Manually logs a new energy reading.

**Request Body:**
```json
{
  "readingDate": "2026-10-14",
  "kWh": 12.8,
  "meterId": "main",
  "category": "residential",
  "notes": "Air conditioner ran overnight"
}
```

**Response (201 Created):** Returns created reading document.

### `PUT /energy/:id`
Updates an existing energy reading owned by the user.

### `DELETE /energy/:id`
Deletes an energy reading owned by the user.

### `POST /energy/import`
Uploads and parses a CSV file (`multipart/form-data`, file field: `file`, max 5 MB).  
Validates headers, data types, and rejects duplicates.

**Response (201 Created / 200 OK):**
```json
{
  "success": true,
  "message": "Imported 45 readings (2 duplicates skipped).",
  "imported": 45,
  "duplicatesSkipped": 2,
  "errors": []
}
```

### `GET /energy/export`
Exports user's readings as a downloadable CSV file.

**Response Header:** `Content-Type: text/csv`  
**Content-Disposition:** `attachment; filename="wattwise-export.csv"`

### `POST /energy/seed-sample`
Generates and inserts realistic sample energy data for demonstration.

**Request Body:** `{ "days": 60 }`  
**Response (201 Created):** `{ "success": true, "count": 60, "isSample": true }`

---

## 3. Analytics Endpoints (`/api/v1/analytics`)

### `GET /analytics/summary`
Calculates consumption KPIs, estimated billing costs, and period-over-period comparisons.

**Query Parameters:**
- `period`: `daily` | `weekly` | `monthly` (default: `monthly`)
- `year`: 4-digit year (optional)
- `month`: 1-12 (optional)

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "period": "monthly",
    "startDate": "2026-10-01T00:00:00.000Z",
    "endDate": "2026-10-31T23:59:59.999Z",
    "totalKwh": 342.6,
    "avgDailyKwh": 11.05,
    "readingCount": 31,
    "estimatedCost": 2840.8,
    "prevTotalKwh": 365.2,
    "prevEstimatedCost": 3021.6,
    "changePercent": -6.2,
    "tariffPerKwh": 8.0,
    "currency": "INR",
    "carbonEmissionsKg": 280.93
  }
}
```

### `GET /analytics/consumption`
Aggregates time-series consumption for Recharts visualizations.

**Query Parameters:**
- `groupBy`: `day` | `week` | `month`
- `startDate`: string (optional)
- `endDate`: string (optional)

### `GET /analytics/cost`
Returns multi-month electricity cost estimates broken down into energy cost and fixed charges.

---

## 4. Machine Learning Endpoints (`/api/v1/ml`)

### `GET /ml/status`
Checks connectivity with the local Python inference engine and returns active model metadata.

**Response (200 OK):**
```json
{
  "success": true,
  "engineOnline": true,
  "model": {
    "version": "20261014_165348",
    "trainedAt": "2026-10-14T16:53:48.122Z",
    "algorithm": "Ridge",
    "features": ["hour", "day_of_week", "lag_1", "lag_7", "rolling_mean_7"],
    "trainingSamples": 608,
    "metrics": {
      "mae": 0.6816,
      "rmse": 0.88,
      "r2": 0.3819,
      "baselineMae": 1.114,
      "baselineRmse": 1.4102
    }
  }
}
```

### `POST /ml/train`
Triggers supervised training across candidate models (Ridge, Random Forest, HistGradientBoosting) using chronological validation.

**Request Body (Optional):**
```json
{
  "useSample": false
}
```
*Note: Set `"useSample": true` to train on synthetic baseline data if fewer than 30 user readings exist.*

**Response (200 OK):** Returns fitted model metrics and selected algorithm name.

### `GET /ml/evaluation`
Returns the evaluation report comparing the selected ML model against the persistence baseline.

### `POST /ml/forecast`
Generates predictions for future dates using the trained pipeline.

**Request Body:**
```json
{
  "horizon": 7
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "forecast": [
      { "date": "2026-10-15", "kWh": 10.264 },
      { "date": "2026-10-16", "kWh": 10.412 },
      { "date": "2026-10-17", "kWh": 8.741 }
    ],
    "horizon": 7,
    "algorithm": "Ridge",
    "avgForecastKwh": 9.85,
    "limitation": "Forecast based on historical patterns only."
  }
}
```

### `POST /ml/detect-anomalies`
Identifies statistical consumption outliers with human-readable explanations.

**Request Body (Optional):**
```json
{
  "startDate": "2026-09-01",
  "endDate": "2026-10-14"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "totalReadings": 44,
    "anomalyCount": 1,
    "method": "iqr",
    "anomalies": [
      {
        "date": "2026-10-02T12:00:00",
        "observedKwh": 38.5,
        "expectedKwh": 11.2,
        "deviationKwh": 27.3,
        "direction": "high",
        "score": 3.84,
        "explanation": "Reading of 38.50 kWh is above the expected range (6.40–16.80 kWh). This warrants investigation."
      }
    ]
  }
}
```

---

## 5. Recommendations Endpoints (`/api/v1/recommendations`)

### `GET /recommendations`
Returns personalized energy conservation tips derived from actual usage patterns.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "period-increase",
      "title": "Consumption increased vs. previous period",
      "explanation": "Your last 30-day consumption (342.6 kWh) is 12.4% higher than prior 30 days.",
      "evidence": "Recent: 342.6 kWh vs. Prior: 304.8 kWh",
      "action": "Review high-consumption appliances during peak hours.",
      "estimatedImpact": "Potential saving of ₹302 if usage returns to previous levels.",
      "confidence": "medium"
    }
  ]
}
```

### `POST /recommendations/:id/dismiss`
Dismisses a recommendation card.

---

## 6. Goals Endpoints (`/api/v1/goals`)

- `GET /goals`: Lists all active/completed goals with current progress calculation.
- `POST /goals`: Creates a monthly or weekly reduction target.
- `PUT /goals/:id`: Updates an existing goal.
- `DELETE /goals/:id`: Removes a goal.

---

## 7. Settings Endpoints (`/api/v1/settings`)

- `GET /settings`: Returns user's configured tariff (price per kWh, fixed charge, emission factor, currency).
- `PUT /settings`: Updates tariff and emissions parameters.

---

## 8. Health Check Endpoint

### `GET /health`
Returns system status for monitoring and uptime probes.

**Response (200 OK):**
```json
{
  "status": "ok",
  "service": "wattwise-backend"
}
```
