/* ============================================================
   EnergyOS — Anomaly Detection Module
   ============================================================ */

const AnomalyModule = (() => {
  let allAnomalies = [];
  let currentFilter = 'all';
  let selectedAnomaly = null;

  function init() {
    allAnomalies = EnergyData.anomalyDetections();
    renderKpis();
    renderSeverityTrend();
    renderConfidenceHist();
    renderTable();
    renderDefaultTimeSeries();
    renderDetectionPerf();
    renderDistribution();
    renderScatter();
    renderHourlyChart();
    bindEvents();
  }

  // ── KPIs ───────────────────────────────────────────────────
  function renderKpis() {
    const total    = allAnomalies.length;
    const critical = allAnomalies.filter(a => a.status === 'critical').length;
    const active   = allAnomalies.filter(a => a.status === 'active').length;
    const avgConf  = (allAnomalies.reduce((s, a) => s + a.confidence, 0) / total).toFixed(1);

    const kpis = [
      { label: 'Total Anomalies', value: total, unit: 'detected', color: 'blue',
        delta: 'Last 24 hours', dir: 'neutral',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>` },
      { label: 'Critical Alerts', value: critical, unit: 'assets', color: 'red',
        delta: critical > 0 ? '⚠ Immediate action' : '✓ Clear',
        dir: critical > 0 ? 'down' : 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
      { label: 'Active Monitoring', value: active, unit: 'assets', color: 'amber',
        delta: 'Under observation', dir: 'neutral',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>` },
      { label: 'Avg Confidence', value: avgConf, unit: '%', color: 'green',
        delta: 'Detection accuracy', dir: 'neutral',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
    ];

    document.getElementById('anomalyKpis').innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.color}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}<span class="unit">${k.unit}</span></div>
        <div class="kpi-delta ${k.dir}">${k.delta}</div>
        <div class="kpi-icon ${k.color}">${k.icon}</div>
      </div>
    `).join('');
  }

  // ── Severity Trend ─────────────────────────────────────────
  function renderSeverityTrend() {
    const days = EnergyData.dayLabels(7);
    const critical = days.map(() => EnergyData.randInt(0, 2));
    const high     = days.map(() => EnergyData.randInt(1, 4));
    const medium   = days.map(() => EnergyData.randInt(2, 6));

    Charts.stackedBar('anomalySeverityTrendChart', days, [
      { label: 'Critical', data: critical, backgroundColor: 'rgba(239,68,68,0.75)' },
      { label: 'High',     data: high,     backgroundColor: 'rgba(245,158,11,0.70)' },
      { label: 'Medium',   data: medium,   backgroundColor: 'rgba(59,130,246,0.60)' },
    ], { yMin: 0, legend: true });
  }

  // ── Confidence Histogram ───────────────────────────────────
  function renderConfidenceHist() {
    const buckets = ['70–75%','75–80%','80–85%','85–90%','90–95%','95–100%'];
    const counts  = [1, 2, 3, 5, 8, 6];
    Charts.bar('anomalyConfidenceHistChart', buckets, [
      { label: 'Anomaly Count', data: counts, backgroundColor: 'rgba(74,222,128,0.65)' },
    ], { yMin: 0, legend: false });
  }

  // ── Table ──────────────────────────────────────────────────
  function renderTable() {
    const filtered = currentFilter === 'all'
      ? allAnomalies
      : allAnomalies.filter(a => a.severity === currentFilter || a.status === currentFilter);

    const sevMap = {
      critical: 'badge-red',
      high: 'badge-red',
      medium: 'badge-amber',
      low: 'badge-blue',
    };
    const statusMap = {
      critical:   'badge-red',
      active:     'badge-amber',
      monitoring: 'badge-blue',
      resolved:   'badge-green',
    };

    document.getElementById('anomalyTableBody').innerHTML = filtered.map(a => `
      <tr style="cursor:pointer;" onclick="AnomalyModule.selectAnomaly('${a.id}')">
        <td><code style="font-size:11px;color:var(--cyan)">${a.id}</code></td>
        <td>
          <div style="font-weight:500;">${a.asset}</div>
          <div style="font-size:11px;color:var(--text-muted);">${a.assetName}</div>
        </td>
        <td>${a.type}</td>
        <td style="color:var(--text-muted)">${a.metric}</td>
        <td>${a.expected}</td>
        <td><strong style="color:${Math.abs(a.deviation) > 20 ? 'var(--red)' : 'var(--amber)'};">${a.actual}</strong></td>
        <td>
          <span style="color:${a.deviation < 0 ? 'var(--red)' : 'var(--amber)'}; font-weight:600;">
            ${a.deviation > 0 ? '+' : ''}${a.deviation.toFixed(1)}%
          </span>
        </td>
        <td>
          <div style="display:flex;align-items:center;gap:5px;">
            <div class="progress-bar" style="width:48px;"><div class="progress-fill ${a.confidence > 90 ? 'green' : a.confidence > 75 ? 'blue' : 'amber'}" style="width:${a.confidence}%;"></div></div>
            <span>${a.confidence}%</span>
          </div>
        </td>
        <td><span class="badge ${sevMap[a.severity] || 'badge-blue'}">${a.severity}</span></td>
        <td><span class="badge ${statusMap[a.status] || 'badge-blue'}">${a.status}</span></td>
        <td style="color:var(--text-muted)">${a.detectedAt}</td>
      </tr>
    `).join('');
  }

  // ── Default Time Series (auto-loaded with first anomaly) ───
  function renderDefaultTimeSeries() {
    const a = allAnomalies[0];
    if (!a) return;
    document.getElementById('tsAssetLabel').textContent = `${a.asset} — ${a.metric}`;
    const tsData = EnergyData.anomalyTimeSeries(a.asset);
    const tsLabels = EnergyData.timeLabels(48, 30);
    const threshold = Array(48).fill(a.expected);
    Charts.line('anomalyTsChart', tsLabels, [
      {
        label: a.metric,
        data: tsData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        fill: true,
      },
      {
        label: 'Expected',
        data: threshold,
        borderColor: '#4ade80',
        borderDash: [5, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ], { maxXTicks: 10, legend: true });
  }

  // ── Select anomaly ─────────────────────────────────────────
  function selectAnomaly(id) {
    selectedAnomaly = allAnomalies.find(a => a.id === id);
    if (!selectedAnomaly) return;

    const a = selectedAnomaly;
    document.getElementById('tsAssetLabel').textContent = `${a.asset} — ${a.metric}`;

    document.getElementById('anomalyDetailContent').innerHTML = `
      <div class="alert-box ${a.status === 'critical' ? 'error' : a.severity === 'high' ? 'error' : 'warning'}" style="margin-bottom:14px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        <div class="alert-box-body">
          <div class="alert-box-title">${a.id} — ${a.type}</div>
          <div class="alert-box-msg">${a.description}</div>
        </div>
      </div>
      <div class="brief-row"><span class="brief-row-label">Asset</span><span class="brief-row-value">${a.assetName} (${a.asset})</span></div>
      <div class="brief-row"><span class="brief-row-label">Metric</span><span class="brief-row-value">${a.metric}</span></div>
      <div class="brief-row"><span class="brief-row-label">Expected</span><span class="brief-row-value">${a.expected}</span></div>
      <div class="brief-row"><span class="brief-row-label">Actual</span><span class="brief-row-value" style="color:var(--red);font-weight:700;">${a.actual}</span></div>
      <div class="brief-row"><span class="brief-row-label">Deviation</span><span class="brief-row-value" style="color:var(--red);">${a.deviation > 0 ? '+' : ''}${a.deviation.toFixed(1)}%</span></div>
      <div class="brief-row"><span class="brief-row-label">Confidence</span><span class="brief-row-value">${a.confidence}%</span></div>
      <div class="brief-row"><span class="brief-row-label">Detected At</span><span class="brief-row-value">${a.detectedAt}</span></div>
      <div style="margin-top:14px;display:flex;gap:8px;">
        <button class="btn btn-sm btn-danger">Escalate</button>
        <button class="btn btn-sm btn-outline" onclick="App.navigate('rootcause')">View RCA</button>
      </div>
    `;

    // Render anomaly time series
    const tsData = EnergyData.anomalyTimeSeries(a.asset);
    const tsLabels = EnergyData.timeLabels(48, 30);
    const threshold = Array(48).fill(a.expected);

    Charts.line('anomalyTsChart', tsLabels, [
      {
        label: a.metric,
        data: tsData,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.08)',
        fill: true,
      },
      {
        label: 'Expected',
        data: threshold,
        borderColor: '#4ade80',
        borderDash: [5, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ], { maxXTicks: 10, legend: true });
  }

  // ── Detection Performance ──────────────────────────────────
  function renderDetectionPerf() {
    const methods = ['Isolation Forest','Z-Score','LSTM Autoencoder','CUSUM','Wavelet'];
    const precision = [94.2, 86.5, 97.1, 81.3, 89.7];
    const recall    = [91.8, 83.2, 95.6, 78.9, 86.4];

    Charts.bar('detectionPerfChart', methods, [
      { label: 'Precision (%)', data: precision, backgroundColor: 'rgba(59,130,246,0.65)' },
      { label: 'Recall (%)',    data: recall,    backgroundColor: 'rgba(74,222,128,0.55)' },
    ], { yMin: 60, legend: true });
  }

  // ── Distribution Doughnut ──────────────────────────────────
  function renderDistribution() {
    Charts.doughnut(
      'anomalyDistChart',
      ['Wind', 'Solar', 'Hydro', 'Battery'],
      [2, 2, 1, 1],
      ['#3b82f6','#f59e0b','#4ade80','#ef4444'],
      { legend: true }
    );
  }

  // ── Deviation vs Confidence Scatter ────────────────────────
  function renderScatter() {
    // Build scatter points from real anomalies + synthetic padding
    const realPoints = allAnomalies.map(a => ({
      x: Math.abs(a.deviation),
      y: a.confidence,
    }));
    // Add synthetic points to fill chart
    const extraPoints = Array.from({ length: 20 }, () => ({
      x: +(EnergyData.rand(5, 350)).toFixed(1),
      y: +(EnergyData.rand(70, 99)).toFixed(1),
    }));
    const allPoints = [...realPoints, ...extraPoints];

    Charts.scatter('anomalyScatterChart', [
      {
        label: 'Anomaly',
        data: allPoints,
        backgroundColor: 'rgba(239,68,68,0.65)',
        borderColor: 'rgba(239,68,68,0.9)',
      },
    ], {
      xLabel: 'Absolute Deviation (%)',
      yLabel: 'Confidence (%)',
      legend: false,
    });
  }

  // ── Hourly Anomaly Count ───────────────────────────────────
  function renderHourlyChart() {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`);
    const counts = hours.map(() => EnergyData.randInt(0, 5));
    // Spike at known alert times
    counts[8]  = 3;
    counts[9]  = 4;
    counts[11] = 5;

    Charts.bar('anomalyHourlyChart', hours, [
      {
        label: 'Anomalies Detected',
        data: counts,
        backgroundColor: counts.map(v => v >= 4 ? 'rgba(239,68,68,0.75)' : v >= 2 ? 'rgba(245,158,11,0.65)' : 'rgba(59,130,246,0.55)'),
      },
    ], { yMin: 0, legend: false });
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents() {
    document.querySelectorAll('#anomalyFilterTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#anomalyFilterTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderTable();
      });
    });
  }

  return { init, selectAnomaly };
})();
