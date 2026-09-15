# EnergyOS — Renewable Intelligence Platform

A fully client-side web application for renewable energy grid operations.
Built with vanilla HTML/CSS/JavaScript and Chart.js.

## Features

| Module | Description |
|---|---|
| **Dashboard** | Live KPIs, 24-hour demand vs supply, generation mix, per-asset health tiles |
| **Demand Forecast** | 12h / 24h / 7-day LSTM-style demand forecasting with confidence bands and spike detection |
| **Load Balancing** | Regional load analysis, grid health radar, prioritised balancing actions with one-click approval |
| **Anomaly Detection** | ML-powered detection across all assets — filterable table, detail drill-down, time-series visualisation |
| **Root Cause Analysis** | Per-asset fault trees with cause categories, probability scores, and O&M recommendations |
| **Operator Brief** | Auto-generated integrated brief: executive summary, anomalies, curtailment minimisation plan, action timeline |

---

## Project Structure

```
energy-optimizer/
├── README.md
├── .gitignore
└── src/
    ├── index.html                  ← App shell (sidebar, topbar, toast system)
    ├── assets/
    │   ├── css/
    │   │   ├── main.css            ← Design system, layout, colour tokens
    │   │   ├── components.css      ← Cards, KPIs, tables, badges, tabs
    │   │   └── dashboard.css       ← Dashboard & page-specific styles
    │   └── js/
    │       ├── core/
    │       │   ├── data.js         ← Simulated grid/asset/forecast data layer
    │       │   ├── charts.js       ← Chart.js wrappers (line, bar, doughnut, radar)
    │       │   └── app.js          ← SPA router, nav, dashboard init, toasts
    │       └── modules/
    │           ├── forecast.js     ← Demand spike forecasting
    │           ├── loadbalancer.js ← Load-balancing recommendations
    │           ├── anomaly.js      ← Anomaly detection & drill-down
    │           ├── rootcause.js    ← Root cause analysis per asset
    │           └── brief.js        ← Operator optimisation brief generator
    └── pages/
        ├── dashboard.html
        ├── forecast.html
        ├── loadbalancer.html
        ├── anomaly.html
        ├── rootcause.html
        └── brief.html
```

---

## Running Locally

This app uses `fetch()` to load page fragments, so it must be served over HTTP (not opened as a `file://` URL).

**Python (recommended):**
```bash
cd energy-optimizer/src
python -m http.server 8080
```
Then open → [http://localhost:8080](http://localhost:8080)

**Node.js (`npx serve`):**
```bash
cd energy-optimizer/src
npx serve .
```

**VS Code Live Server:**
Right-click `src/index.html` → *Open with Live Server*.

---

## Tech Stack

- **HTML5** — semantic page fragments loaded via `fetch()`
- **CSS3** — custom design system with CSS variables, no framework
- **Vanilla JavaScript** — modular IIFE pattern, no bundler required
- **[Chart.js 4.4](https://www.chartjs.org/)** — all charts (CDN)

---

## Data

All data is synthetically generated in `src/assets/js/core/data.js`.
No external API calls are made. Refresh the page or click **Refresh** to reseed.
