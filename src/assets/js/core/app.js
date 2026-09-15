/* ============================================================
   EnergyOS — App Router, Navigation & Dashboard
   ============================================================ */

const App = (() => {
  let currentPage = 'dashboard';

  // ── Page Registry ──────────────────────────────────────────
  const pages = {
    dashboard:   { title: 'Dashboard',          file: '../pages/dashboard.html',   module: null },
    forecast:    { title: 'Demand Forecast',     file: '../pages/forecast.html',    module: 'ForecastModule' },
    loadbalancer:{ title: 'Load Balancing',      file: '../pages/loadbalancer.html',module: 'LoadBalancerModule' },
    anomaly:     { title: 'Anomaly Detection',   file: '../pages/anomaly.html',     module: 'AnomalyModule' },
    rootcause:   { title: 'Root Cause Analysis', file: '../pages/rootcause.html',   module: 'RootCauseModule' },
    brief:       { title: 'Operator Brief',      file: '../pages/brief.html',       module: 'BriefModule' },
  };

  // ── Boot ───────────────────────────────────────────────────
  function boot() {
    updateClock();
    setInterval(updateClock, 1000);

    // Nav links
    document.querySelectorAll('.nav-item').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(link.dataset.page);
        // Close mobile sidebar
        document.getElementById('sidebar').classList.remove('open');
      });
    });

    // Mobile menu toggle
    document.getElementById('menuToggle')?.addEventListener('click', () => {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Refresh button
    document.getElementById('refreshBtn')?.addEventListener('click', () => {
      navigate(currentPage, true);
      toast('Data refreshed', 'success');
    });

    navigate('dashboard');
    setInterval(autoRefreshAlerts, 15000);
  }

  // ── Navigation ─────────────────────────────────────────────
  function navigate(pageId, force = false) {
    if (!pages[pageId]) return;
    if (pageId === currentPage && !force) return;

    const loader = document.getElementById('pageLoader');
    const content = document.getElementById('mainContent');
    const page = pages[pageId];

    // Update nav
    document.querySelectorAll('.nav-item').forEach(l => {
      l.classList.toggle('active', l.dataset.page === pageId);
    });

    document.getElementById('topbarTitle').textContent = page.title;
    currentPage = pageId;

    // Show loader
    content.innerHTML = '';
    if (loader) loader.style.display = 'flex';

    // Fetch and inject page fragment
    fetch(page.file)
      .then(r => {
        if (!r.ok) throw new Error(`Cannot load ${page.file}`);
        return r.text();
      })
      .then(html => {
        // Destroy old charts
        Charts.destroyAll();
        content.innerHTML = html;

        // Double rAF: first frame injects content, second frame runs after layout is complete
        requestAnimationFrame(() => requestAnimationFrame(() => {
          // Init module
          if (page.module && window[page.module]) {
            window[page.module].init();
          } else if (pageId === 'dashboard') {
            initDashboard();
          }
          updateAlertCount();
        }));
      })
      .catch(err => {
        content.innerHTML = `
          <div class="page-header">
            <h1>${page.title}</h1>
          </div>
          <div class="alert-box error">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div class="alert-box-body">
              <div class="alert-box-title">Page Load Error</div>
              <div class="alert-box-msg">${err.message}. Make sure you're running EnergyOS from a web server.</div>
            </div>
          </div>
        `;
      });
  }

  // ── Dashboard ──────────────────────────────────────────────
  function initDashboard() {
    renderDashboardKpis();
    renderDemandChart();
    renderGenMix();
    renderAssetGrid();
    renderEventTimeline();
    renderRegionalLoadBars();
    renderForecastMini();
    bindDashboardEvents();
  }

  function renderDashboardKpis() {
    const anomalies = EnergyData.anomalyDetections();
    const kpis = [
      { label: 'Total Generation',   value: '742',  unit: 'MW', color: 'green',  delta: '+3.2%', dir: 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>` },
      { label: 'Grid Demand',        value: '618',  unit: 'MW', color: 'blue',   delta: '+1.8%', dir: 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
      { label: 'Active Anomalies',   value: anomalies.filter(a => a.status !== 'resolved').length, unit: 'assets', color: 'red', delta: '⚠ 2 critical', dir: 'down',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>` },
      { label: 'Curtailment Risk',   value: '47.3', unit: 'MW', color: 'amber',  delta: '↓ Needs action', dir: 'down',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>` },
    ];

    document.getElementById('kpiGrid').innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.color}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}<span class="unit">${k.unit}</span></div>
        <div class="kpi-delta ${k.dir}">${k.delta}</div>
        <div class="kpi-icon ${k.color}">${k.icon}</div>
      </div>
    `).join('');
  }

  function renderDemandChart() {
    const labels  = EnergyData.timeLabels(24);
    const demand  = EnergyData.demandHistory(24);
    const supply  = demand.map(v => +(v * EnergyData.rand(0.85, 1.1)).toFixed(1));

    Charts.line('demandChart', labels, [
      {
        label: 'Grid Demand (MW)',
        data: demand,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
      },
      {
        label: 'Renewable Supply (MW)',
        data: supply,
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.07)',
        fill: true,
      },
    ], { legend: true, maxXTicks: 8 });
  }

  function renderGenMix() {
    Charts.doughnut(
      'genMixChart',
      ['Wind','Solar','Hydro','Battery'],
      [295, 340, 100, 90],
      ['#3b82f6','#f59e0b','#4ade80','#a78bfa'],
      { legend: true }
    );
  }

  function renderAssetGrid() {
    const assets = EnergyData.ASSETS;
    const statusClass = { optimal: 'ok', degraded: 'warning', critical: 'anomaly' };
    const typeIcon = {
      wind:    '💨', solar: '☀️', hydro: '💧', battery: '🔋'
    };

    document.getElementById('assetGrid').innerHTML = assets.map(a => {
      const eff = +(EnergyData.rand(60, 100)).toFixed(0);
      const status = eff >= 90 ? 'optimal' : eff >= 75 ? 'degraded' : 'critical';
      const barColor = eff >= 90 ? '#4ade80' : eff >= 75 ? '#f59e0b' : '#ef4444';

      return `
        <div class="asset-tile ${statusClass[status]}" onclick="App.navigate('rootcause')">
          <div class="asset-name">
            <span>${typeIcon[a.type]} ${a.id}</span>
            <span class="badge ${status === 'optimal' ? 'badge-green' : status === 'degraded' ? 'badge-amber' : 'badge-red'}" style="font-size:10px;">${status}</span>
          </div>
          <div class="asset-metric">${+(a.capacity * eff / 100).toFixed(0)} <span style="font-size:12px;color:var(--text-muted)">MW</span></div>
          <div class="asset-label">${eff}% efficiency · ${a.region}</div>
          <div class="asset-efficiency">
            <div class="asset-efficiency-fill" style="width:${eff}%;background:${barColor};height:4px;border-radius:2px;"></div>
          </div>
        </div>
      `;
    }).join('');

    const degraded = assets.filter(() => EnergyData.rand() < 0.4).length;
    document.getElementById('degradedCount').textContent = `${degraded} degraded`;
  }

  function renderEventTimeline() {
    const events = [
      { type: 'red',   title: 'BA-01 thermal alert — packs 3 & 4 at 41.5°C', time: '11:20' },
      { type: 'red',   title: 'WF-02 output 32% below expected wind-speed forecast', time: '08:32' },
      { type: 'amber', title: 'PV-01 inverter efficiency dropped to 91.7%', time: '09:15' },
      { type: 'amber', title: 'North region approaching 90% load capacity', time: '10:48' },
      { type: 'blue',  title: 'Load balance action #3 queued: HY-02 → East', time: '10:22' },
      { type: 'green', title: 'WF-01 reconnected after reactive power check', time: '10:05' },
      { type: 'green', title: 'Daily demand forecast model retrained (accuracy: 94.1%)', time: '06:00' },
    ];

    document.getElementById('eventTimeline').innerHTML = events.map(e => `
      <div class="timeline-item">
        <div class="timeline-dot ${e.type}"></div>
        <div class="timeline-content">
          <div class="timeline-title">${e.title}</div>
        </div>
        <span class="timeline-time">${e.time}</span>
      </div>
    `).join('');
  }

  function renderRegionalLoadBars() {
    const dist = EnergyData.loadDistribution();
    document.getElementById('regionalLoad').innerHTML = dist.map(r => {
      const color = r.load > 90 ? 'red' : r.load > 75 ? 'amber' : 'green';
      return `
        <div style="margin-bottom:14px;">
          <div class="flex-between" style="margin-bottom:4px;">
            <span style="font-size:13px;font-weight:500;">${r.region}</span>
            <span style="font-size:12px;color:var(--${color});font-weight:600;">${r.load.toFixed(1)}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill ${color}" style="width:${r.load}%;"></div>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderForecastMini() {
    const forecast = EnergyData.demandForecast(6);
    const labels   = EnergyData.futureLabels(6);
    Charts.line('forecastMiniChart', labels, [
      {
        label: 'Forecast (MW)',
        data: forecast.map(f => f.predicted),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.12)',
        fill: true,
        pointRadius: 4,
      },
    ], { legend: false, maxXTicks: 6 });
  }

  function bindDashboardEvents() {
    document.getElementById('clearEventsBtn')?.addEventListener('click', () => {
      const tl = document.getElementById('eventTimeline');
      if (tl) tl.innerHTML = `<div style="color:var(--text-muted);padding:20px 0;font-size:13px;text-align:center;">No events</div>`;
    });
  }

  // ── Alerts ─────────────────────────────────────────────────
  function updateAlertCount() {
    const count = EnergyData.anomalyDetections().filter(a => a.status !== 'resolved').length;
    const badge = document.getElementById('alertCount');
    if (badge) badge.textContent = count;
  }

  function autoRefreshAlerts() {
    updateAlertCount();
    updateClock();
  }

  // ── Clock ──────────────────────────────────────────────────
  function updateClock() {
    const el = document.getElementById('lastUpdated');
    if (el) el.textContent = 'Updated: ' + new Date().toLocaleTimeString('en-GB');
  }

  // ── Toast ──────────────────────────────────────────────────
  function toast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    const id = 'toast-' + Date.now();
    const icons = {
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
      info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
    };

    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.id = id;
    el.innerHTML = `<span style="color:var(--${type === 'success' ? 'green' : type === 'error' ? 'red' : type === 'warning' ? 'amber' : 'accent'})">${icons[type] || ''}</span><span>${message}</span>`;
    container.appendChild(el);

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transform = 'translateX(20px)';
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      setTimeout(() => el.remove(), 350);
    }, 3000);
  }

  return { boot, navigate, toast };
})();

// Boot on DOM ready
document.addEventListener('DOMContentLoaded', () => App.boot());
