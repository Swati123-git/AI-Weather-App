# 🌦️ AeroPulse AI — End-to-End Weather Monitoring & Alert System

A full-stack, enterprise-grade **AI-Powered Weather Monitoring and Early Alert System** featuring a **Flask + Machine Learning** backend and a **React 19 + Vite** responsive dashboard.

---

## 🏗️ Architecture Overview

```
                                 ┌───────────────────────────────────┐
                                 │   React 19 + Vite Frontend (5173) │
                                 │   - Recharts Visualizations       │
                                 │   - Leaflet Geospatial Radar Map  │
                                 │   - Real-Time Alert Center        │
                                 │   - Glassmorphic Responsive UI    │
                                 └─────────────────▲─────────────────┘
                                                   │  REST API / JSON
                                                   │  (Mock Fallback if offline)
                                 ┌─────────────────▼─────────────────┐
                                 │    Flask 3.0 REST Backend (5000)  │
                                 │    - Blueprints & CORS            │
                                 │    - 10-Min In-Memory Cache       │
                                 │    - Rate-Limit Resiliency        │
                                 └───────┬──────────────┬────────────┘
                                         │              │
                   ┌─────────────────────▼─┐          ┌─▼──────────────────────┐
                   │ SQLite Database       │          │ Scikit-Learn ML Engine │
                   │ - cities              │          │ - Random Forest Temp   │
                   │ - weather_readings    │          │ - Random Forest Rain   │
                   │ - alerts              │          │ - Tree Variance Conf.  │
                   │ - settings            │          └────────────────────────┘
                   └───────────────────────┘
                                         │
                   ┌─────────────────────▼─┐
                   │  APScheduler Worker   │
                   │  - 30-min telemetry   │
                   │  - Deduplication (3h) │
                   │  - SMTP Email Alerts  │
                   └───────────────────────┘
```

---

## 🌟 Key Features

### 1. 🎛️ Live Telemetry Dashboard (`/`)
- **Global City Search & Predictive Autocomplete**: Search any global metropolis with instant debounced recommendations.
- **GPS Location Detection**: HTML5 Geolocation API with reverse-geocoding fallback.
- **Live Meteorological Cards**: Real-time temperature, feels like, min/max, relative humidity, barometric pressure, wind velocity/direction, visibility, and sunrise/sunset.
- **Air Quality Index (AQI)**: Granular pollutant tracking (PM2.5, PM10, NO₂, O₃, SO₂, CO) with qualitative health warnings.
- **AI Prediction Engine**: Dual-task Random Forest ensemble rain probability, thermal drift trajectory, confidence score, and primary risk drivers.

### 2. 📅 Synoptic Forecast (`/forecast`)
- **24-Hour Interactive Timeline (Recharts)**: Interactive area chart toggleable between Temperature (°C), Rain Probability (%), Wind Speed (km/h), and Humidity (%).
- **5-Day Synoptic Outlook**: Daily cards with high/low temperatures, precipitation percentages, wind velocity, and synoptic weather codes.

### 3. 🚨 Alerts & Incident Center (`/alerts`)
- **Severity Badges**:
  - 🟢 **Low** — Informational advisories
  - 🟡 **Medium** — Cautionary advisories
  - 🟠 **High** — Severe weather warnings (auto-notified)
  - 🔴 **Critical** — Emergency life-safety alarms (in-browser toast + SMTP email)
- **AI Diagnostic Reasoning**: Interpretable machine learning explanations detailing exact atmospheric triggers.
- **Safety Mitigations**: Prescriptive hazard checklists to minimize risk exposure.
- **Filtering & Read State**: Filter by severity or read/unread state; includes one-click "Mark All as Read".
- **Background Polling & Simulation**: Automated 60-second polling cycle and a "Simulate Critical Alert" demo trigger.

### 4. 🗺️ Interactive Geospatial Map (`/map`)
- **Leaflet & React-Leaflet Integration**: Geospatial marker plotting for active monitored global stations.
- **Dynamic Pulsing Radar Ripple Markers**: Color-coded markers pulsing according to threat level.
- **Weather Overlays**: Switch between Night Vision, Voyager, and OpenStreetMap basemaps, plus Rain Radar and Heatmap overlays.

### 5. 📈 Climatology & History (`/history`)
- **30-Day Temperature Trends**: Recorded Highs, Lows, and Daily Means.
- **Daily Precipitation Volume**: Cumulative liquid millimeters bar chart.
- **Weekly Incident Frequency**: Stacked bar chart broken down by Low, Medium, High, and Critical alerts.
- **Summary KPIs**: 30-day mean temperature, total precipitation, peak temperature, and incident counts.

### 6. ⚙️ Settings & Notification Dispatch (`/settings`)
- **Customizable Triggers**: Toggle specific hazards (Floods, Thunderstorms, Heatwave, Gales, Air Quality).
- **Severity Threshold**: Configure cutoff risk level to eliminate low-priority alerts.
- **Multi-Channel Dispatch**: Configure In-Browser Toasts, Email notifications (Flask-Mail/SMTP), and SMS notifications.
- **Dual Persistence**: Saves to SQLite database (`POST /api/settings`) with automatic LocalStorage fallback.

---

## 🤖 Machine Learning Models

The machine learning subsystem (`ml/`) uses a dual-task ensemble trained on meteorological telemetry:
1. **Temperature Predictor (`ml/models/temp_model.joblib`)**:
   - `RandomForestRegressor` predicting 1-hour and 6-hour thermal progression based on barometric pressure change, moisture saturation, cloud optical depth, and wind shear.
   - Calculates dynamic confidence based on standard deviation across individual regression trees.
2. **Precipitation Classifier (`ml/models/rain_model.joblib`)**:
   - `RandomForestClassifier` estimating rain probability percentage with calibrated class probability outputs.

---

## 📡 Backend REST API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check and system uptime status |
| `GET` | `/api/weather?city=` | Current weather telemetry & air quality readings |
| `GET` | `/api/forecast?city=` | 24-hour hourly timeline + 5-day daily outlook |
| `GET` | `/api/predict?city=` | AI rain probability, thermal trend & confidence % |
| `GET` | `/api/alerts?severity=&city=` | List active alerts filtered by severity or city |
| `PATCH` | `/api/alerts/<id>/read` | Mark an alert as read |
| `GET` | `/api/settings` | Retrieve user alert preferences & thresholds |
| `POST` | `/api/settings` | Save user alert preferences and notification targets |
| `GET` | `/api/history?city=&days=` | Past 30-day temperature, rainfall, and weekly alerts |

---

## 🚀 Getting Started

### 1. Prerequisites
- **Python** 3.10+ (tested on Python 3.14)
- **Node.js** 18+ & **npm** 9+

### 2. Quick Start (Run Both Frontend & Backend)
You can launch both services together with a single command:
```bash
python run_system.py
```
*(On Windows, you can also simply double-click `start.bat`)*

- **Frontend Dashboard**: `http://localhost:5173`
- **Backend API Server**: `http://localhost:5000`

---

### 3. Running Services Independently

#### Backend
```bash
# Install Python dependencies
pip install -r requirements.txt

# Run Flask backend server
python app.py
```

#### Frontend
```bash
# Install npm dependencies
npm install

# Start Vite development server
npm run dev
```

---

## 📊 Model Evaluation & Demo Scripts

### 1. Run Machine Learning Model Evaluation
Evaluates 1-hour ahead temperature prediction comparing the **Random Forest Regressor** against the **Persistence Baseline** on the holdout test set (chronological 70/15/15 split with 4-hour boundary gaps):
```bash
python ml/evaluate_model.py
# Or specify pilot station explicitly:
python ml/evaluate_model.py --city Lucknow
```
**Artifacts Generated:**
- `ml/results.csv`: Table with sample counts, date ranges, MAE, RMSE, and baseline comparisons.
- `ml/actual_vs_predicted.png`: Time-series forecast chart for the first 7 days of the test set.
- `ml/models/temp_eval_model.joblib`: Persisted best-tuned Random Forest model.

---

### 2. Run Interactive Demo Alert
Simulates an atmospheric hazard by reading the latest station temperature, setting a threshold slightly below it, and tripping the alert engine:
```bash
# Trigger high-temperature alert for active station or Lucknow
python demo_alert.py --city Lucknow

# Clean up demo alert and restore default thresholds:
python demo_alert.py --cleanup
```
Once triggered, the alert immediately displays across:
- **Dashboard**: `http://localhost:5173/`
- **Alerts Center**: `http://localhost:5173/alerts`
- **Weather Radar Map**: `http://localhost:5173/map`

---

## 🧪 Automated Testing

Run the full automated test suite (backend API endpoints, alert engine, ML predictions, and model evaluation pipeline):
```bash
npm test
# OR directly with pytest:
python -m pytest tests
```

**Test Coverage Summary (28 Tests Passing):**
- `test_alert_engine.py`: 10 tests for weather threshold evaluation, heatwave/coldwave limits, precipitation and wind thresholds.
- `test_api_endpoints.py`: 10 integration tests validating all REST endpoints, query parameters, input validation, and alert state transitions.
- `test_ml_predict.py`: 4 tests validating feature extraction, model loading, precipitation probability bounds, and dual-task predictions.
- `test_model_evaluation.py`: 4 tests validating dynamic date calculation, lagged & cyclical feature generation, chronological splitting with boundary gaps, and evaluation metrics computation.

---

## 📦 Production Build

To build the optimized frontend client:
```bash
npm run build
```
Build outputs are generated in `dist/` with automated vendor chunk splitting (`vendor-react`, `vendor-recharts`, `vendor-leaflet`, `vendor-icons`).
