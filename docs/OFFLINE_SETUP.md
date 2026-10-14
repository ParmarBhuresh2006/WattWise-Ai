# WattWise AI — Offline Setup & Execution Guide (Windows)

This document provides exact, reproducible instructions for installing, configuring, and executing **WattWise AI** in an **entirely offline environment** on Windows.

---

## 1. Non-Negotiable Offline Constraints

- **Zero Cloud Dependencies:** The application does not require Firebase, Supabase, AWS, Azure, or GCP.
- **Zero External AI APIs:** No OpenAI, Google Gemini, Anthropic Claude, or hosted prediction endpoints are used. All models run on the local CPU via scikit-learn.
- **Zero External Data Services:** Electricity tariffs, calendar features, and anomaly calculations are strictly generated locally.
- **Local Network Boundary:** All inter-process communication is bound to `127.0.0.1` (localhost).

---

## 2. Prerequisites

Ensure the following tools are installed on your Windows machine:

1. **Node.js (v18.0.0 or higher)**
   - Check: `node --version` (e.g., `v20.x` or `v22.x`)
   - Check: `npm --version`
2. **Python (v3.10 or higher)**
   - Check: `python --version`
   - Check: `pip --version`
3. **MongoDB Community Server (v6.0 or higher)**
   - Downloaded and installed locally as a Windows Service or standalone binary.
   - Default port: `27017`

---

## 3. Step-by-Step Installation

### Step 1: Setup Environment Files

Copy the example environment configurations:

**In root directory:**
```powershell
copy .env.example .env
```

**In `backend/` directory:**
Ensure `backend/.env` exists with the following configuration:
```env
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/wattwise
JWT_SECRET=wattwise_super_secure_offline_jwt_secret_key_32chars
JWT_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:5173
ML_ENGINE_HOST=127.0.0.1
ML_ENGINE_PORT=8001
PYTHON_PATH=python
ADMIN_EMAIL=admin@wattwise.local
ADMIN_PASSWORD=Admin@WattWise2024
```

**In `frontend/` directory:**
Ensure `frontend/.env` exists:
```env
VITE_API_URL=http://localhost:5000/api/v1
```

---

### Step 2: Install Python Dependencies

Open a command prompt in the `ml-engine` directory:

```cmd
cd "D:\Github\WattWise Ai\ml-engine"
pip install -r requirements.txt
```

*Required packages (pinned in `requirements.txt`):*
- `numpy>=2.0.0`
- `pandas>=2.2.0`
- `scikit-learn>=1.5.0`
- `joblib>=1.4.0`
- `flask>=3.0.0`
- `matplotlib>=3.8.0`
- `pytest>=8.0.0`

---

### Step 3: Install Node.js Backend Dependencies

Open a command prompt in the `backend` directory:

```cmd
cd "D:\Github\WattWise Ai\backend"
npm install
```

---

### Step 4: Install Node.js Frontend Dependencies

Open a command prompt in the `frontend` directory:

```cmd
cd "D:\Github\WattWise Ai\frontend"
npm install
```

---

### Step 5: Initialize Database & Seed Local Admin

Ensure local MongoDB is running:
```cmd
net start MongoDB
```
*(Or launch mongod manually: `mongod --dbpath "D:\Github\WattWise Ai\data\db"`)*

Seed the administrative account:
```cmd
cd "D:\Github\WattWise Ai\backend"
npm run seed:admin
```
Expected output: `[seed] Admin created: admin@wattwise.local`

---

## 4. Running the Complete Application

### Option A: One-Click Startup (Recommended)

Double-click `scripts\start-all.bat` from File Explorer or run in terminal:

```cmd
cd "D:\Github\WattWise Ai"
scripts\start-all.bat
```

This launches three separate terminal windows:
1. **Python ML Engine:** `http://127.0.0.1:8001`
2. **Node.js Express Backend:** `http://127.0.0.1:5000`
3. **React Vite Frontend:** `http://localhost:5173`

---

### Option B: Manual Multi-Terminal Startup

Open **three separate command prompt windows**:

**Terminal 1 — Python ML Engine:**
```cmd
cd "D:\Github\WattWise Ai\ml-engine\src"
python server.py
```
*Notice: Confirms binding to `http://127.0.0.1:8001` (loopback only).*

**Terminal 2 — Node.js Backend:**
```cmd
cd "D:\Github\WattWise Ai\backend"
npm run dev
```
*Notice: Confirms `[MongoDB] Connected: 127.0.0.1` and `Backend running at http://127.0.0.1:5000`.*

**Terminal 3 — React Frontend:**
```cmd
cd "D:\Github\WattWise Ai\frontend"
npm run dev
```
*Notice: Serves UI on `http://localhost:5173`.*

---

## 5. Verification & Testing Instructions

1. Open your browser and navigate to **`http://localhost:5173`**.
2. Click **"Create one"** and register a user account, or log in with:
   - Email: `admin@wattwise.local`
   - Password: `Admin@WattWise2024`
3. Navigate to **Energy Records** (`/energy`):
   - Click **"Demo Data"** to load 60 days of synthetic baseline readings, OR
   - Click **"Import CSV"** and select `ml-engine\data\raw\sample_energy.csv`.
4. Navigate to **Dashboard** (`/dashboard`):
   - Observe total kWh, average daily usage, and estimated monthly electricity cost computed using your configured tariff.
5. Navigate to **AI Forecast** (`/forecast`):
   - Notice the ML Engine status banner shows "Online".
   - Click **"Train on My Data"**.
   - Notice the training pipeline fits candidate models, compares against the persistence baseline, and displays measured test MAE and RMSE.
   - Select a 7-day or 14-day horizon and click **"Generate Forecast"**.
6. Navigate to **Anomalies** (`/anomalies`):
   - Click **"Detect Anomalies"** to identify statistical spikes.
7. Navigate to **Recommendations** (`/recommendations`):
   - Inspect data-backed tips calculated from recent usage patterns.
8. Navigate to **Reports** (`/reports`):
   - Click **"Generate Report"**, then test **"Print / PDF"** and **"Export CSV"**.

---

## 6. How to Stop and Restart Services

### Stopping Services
- Press `Ctrl + C` in each running terminal window, or close the terminal windows.
- To verify no lingering processes:
  ```powershell
  # Check ports in PowerShell:
  Get-NetTCPConnection -LocalPort 5000, 8001, 5173 -ErrorAction SilentlyContinue
  ```

### Restarting Services
Simply run `scripts\start-all.bat` again. All MongoDB data and serialized ML model artifacts persist across restarts.

---

## 7. Troubleshooting Common Local Issues

| Issue | Cause | Solution |
|---|---|---|
| `Error: connect ECONNREFUSED 127.0.0.1:27017` | MongoDB service is not started | Run `net start MongoDB` as Administrator or start `mongod`. |
| `ML Engine offline` banner in UI | Python server is not running | Run `python server.py` in `ml-engine/src`. |
| `Port 5000 already in use` | Previous Node.js process did not exit | In PowerShell, run `Stop-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess -Force`. |
| `Port 8001 already in use` | Previous Python process is still bound | In PowerShell, run `Stop-Process -Id (Get-NetTCPConnection -LocalPort 8001).OwningProcess -Force`. |
| `Insufficient data for training` | Fewer than 30 readings logged | Click **"Demo Data"** in Energy Records or click **"Train with Sample Data (Demo)"** in AI Forecast. |
