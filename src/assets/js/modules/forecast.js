/* ============================================================
   EnergyOS — Demand Spike Forecasting Module
   ============================================================ */

const ForecastModule = (() => {
  let currentTab = '12h';

  // ── Init ───────────────────────────────────────────────────
  function init() {
    renderKpis();
    renderModelAccuracy();
    renderBandWidth();
    renderForecastChart();
    renderSpikeEvents();
    renderForecastTable();
    renderWeeklyPattern();
    renderSpikeHourDist();
    renderGenMixForecast();
    bindEvents();
  }

  // ── KPIs ───────────────────────────────────────────────────
  function renderKpis() {
    const forecast = EnergyData.demandForecast(12);
    const peak = Math.max(...forecast.map(f => f.predicted));
    const avg  = (forecast.reduce((s,f) => s + f.predicted, 0) / forecast.length).toFixed(0);
    const spikes = forecast.filter(f => f.predicted > 580).length;
    const avgConf = (forecast.reduce((s,f) => s + f.confidence, 0) / forecast.length).toFixed(1);

    const kpis = [
      { label: 'Peak Demand', value: `${peak.toFixed(0)}`, unit: 'MW', color: 'red',
        delta: '+7.1%', dir: 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
      { label: 'Avg Forecast', value: avg, unit: 'MW', color: 'blue',
        delta: '+2.3%', dir: 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>` },
      { label: 'Spike Events', value: `${spikes}`, unit: 'events', color: 'amber',
        delta: '12-hr window', dir: 'neutral',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>` },
      { label: 'Avg Confidence', value: avgConf, unit: '%', color: 'green',
        delta: 'Model accuracy', dir: 'neutral',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
    ];

    document.getElementById('forecastKpis').innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.color}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}<span class="unit">${k.unit}</span></div>
        <div class="kpi-delta ${k.dir}">${k.delta}</div>
        <div class="kpi-icon ${k.color}">${k.icon}</div>
      </div>
    `).join('');
  }

  // ── Main Forecast Chart ────────────────────────────────────
  function renderForecastChart() {
    const histLen = currentTab === '12h' ? 12 : currentTab === '24h' ? 18 : 7;
    const fLen    = currentTab === '12h' ? 12 : currentTab === '24h' ? 12 : 7;

    const histLabels   = EnergyData.timeLabels(histLen);
    const futureLabels = EnergyData.futureLabels(fLen);
    const allLabels    = [...histLabels, ...futureLabels.slice(1)];

    const histData = EnergyData.demandHistory(histLen);
    const forecast = EnergyData.demandForecast(fLen);
    const paddedHist = [...histData, ...Array(fLen - 1).fill(null)];

    const predicted = [
      ...Array(histLen - 1).fill(null),
      histData[histLen - 1],
      ...forecast.map(f => f.predicted),
    ];
    const upper = [...Array(histLen).fill(null), ...forecast.map(f => f.upper)];
    const lower = [...Array(histLen).fill(null), ...forecast.map(f => f.lower)];

    Charts.line('forecastMainChart', allLabels, [
      {
        label: 'Historical Demand',
        data: paddedHist,
        borderColor: '#8899b0',
        backgroundColor: 'rgba(136,153,176,0.08)',
        fill: true,
        borderDash: undefined,
      },
      {
        label: 'Forecast',
        data: predicted,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: false,
        borderDash: [6, 3],
        pointRadius: 3,
      },
      {
        label: 'Upper Bound',
        data: upper,
        borderColor: 'rgba(239,68,68,0.4)',
        backgroundColor: 'rgba(239,68,68,0.07)',
        fill: '+1',
        borderDash: [3, 3],
        pointRadius: 0,
        borderWidth: 1,
      },
      {
        label: 'Lower Bound',
        data: lower,
        borderColor: 'rgba(239,68,68,0.4)',
        fill: false,
        borderDash: [3, 3],
        pointRadius: 0,
        borderWidth: 1,
      },
    ], { yLabel: 'MW', maxXTicks: 10, legend: true });
  }

  // ── Spike Events ───────────────────────────────────────────
  function renderSpikeEvents() {
    const spikes = EnergyData.spikeEvents();
    const sevMap = { high: 'badge-red', medium: 'badge-amber', low: 'badge-blue' };

    document.getElementById('spikeEventsList').innerHTML = spikes.map(s => `
      <div class="rec-chip">
        <div class="rec-chip-icon ${s.severity === 'high' ? 'red' : s.severity === 'medium' ? 'amber' : 'blue'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
        </div>
        <div class="rec-chip-body">
          <div class="rec-chip-title">
            ${s.time} — ${s.asset}
            <span class="badge ${sevMap[s.severity]}" style="margin-left:6px;">${s.severity}</span>
          </div>
          <div class="rec-chip-desc">
            Predicted: <strong>${s.predicted} MW</strong> &nbsp;|&nbsp;
            Current:   <strong>${s.current} MW</strong> &nbsp;|&nbsp;
            Delta:     <strong style="color:var(--red)">${s.delta}</strong><br/>
            Cause: ${s.cause}
          </div>
        </div>
      </div>
    `).join('');

    const highCount = spikes.filter(s => s.severity === 'high').length;
    document.getElementById('spikeBadge').textContent = `${highCount} High Priority`;
  }

  // ── Forecast Table ─────────────────────────────────────────
  function renderForecastTable() {
    const forecast = EnergyData.demandForecast(12);
    const labels   = EnergyData.futureLabels(12);

    document.getElementById('forecastTableBody').innerHTML = forecast.map((f, i) => {
      const risk = f.predicted > 620 ? 'badge-red' : f.predicted > 560 ? 'badge-amber' : 'badge-green';
      const riskLabel = f.predicted > 620 ? 'High' : f.predicted > 560 ? 'Medium' : 'Low';
      return `
        <tr>
          <td>${labels[i]}</td>
          <td><strong>${f.predicted}</strong></td>
          <td style="color:var(--text-muted)">${f.lower}</td>
          <td style="color:var(--text-muted)">${f.upper}</td>
          <td>
            <div style="display:flex;align-items:center;gap:6px;">
              <div class="progress-bar" style="width:60px;">
                <div class="progress-fill blue" style="width:${f.confidence}%;"></div>
              </div>
              <span>${f.confidence}%</span>
            </div>
          </td>
          <td><span class="badge ${risk}">${riskLabel}</span></td>
        </tr>
      `;
    }).join('');
  }

  // ── Weekly Pattern ─────────────────────────────────────────
  function renderWeeklyPattern() {
    const days = EnergyData.dayLabels(7);
    const historical = days.map(() => +(EnergyData.rand(540, 660)).toFixed(0));
    const forecasted = days.map(() => +(EnergyData.rand(550, 680)).toFixed(0));

    Charts.bar('weeklyPatternChart', days, [
      { label: 'Historical Peak', data: historical, backgroundColor: 'rgba(136,153,176,0.55)' },
      { label: 'Forecast Peak',   data: forecasted, backgroundColor: 'rgba(59,130,246,0.65)'  },
    ], { yMin: 400, legend: true });
  }

  // ── Model Accuracy Trend ───────────────────────────────────
  function renderModelAccuracy() {
    const days = EnergyData.dayLabels(7);
    const mape = days.map(() => +(EnergyData.rand(2.5, 6.5)).toFixed(2));
    const rmse = days.map(() => +(EnergyData.rand(12, 28)).toFixed(1));

    Charts.bar('forecastAccuracyChart', days, [
      { label: 'MAPE (%)',   data: mape, backgroundColor: 'rgba(59,130,246,0.65)' },
      { label: 'RMSE (MW)', data: rmse, backgroundColor: 'rgba(245,158,11,0.55)', type: 'line',
        borderColor: '#f59e0b', pointRadius: 4, fill: false, borderWidth: 2 },
    ], { yMin: 0, legend: true });
  }

  // ── Confidence Band Width ──────────────────────────────────
  function renderBandWidth() {
    const forecast = EnergyData.demandForecast(12);
    const labels   = EnergyData.futureLabels(12);
    const widths   = forecast.map(f => +(f.upper - f.lower).toFixed(1));

    Charts.line('forecastBandWidthChart', labels, [
      {
        label: 'Band Width (MW)',
        data: widths,
        borderColor: '#a78bfa',
        backgroundColor: 'rgba(167,139,250,0.12)',
        fill: true,
        pointRadius: 3,
      },
    ], { yMin: 0, legend: false });
  }

  // ── Spike Hour Distribution ────────────────────────────────
  function renderSpikeHourDist() {
    const hours = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2,'0')}:00`);
    // Historical probability profile — higher in morning, lunch and evening peaks
    const prob = [2,1,1,1,2,4,8,14,18,16,12,10,12,10,9,11,15,19,18,13,9,7,5,3];

    Charts.bar('spikeHourDistChart', hours, [
      {
        label: 'Spike Probability (%)',
        data: prob,
        backgroundColor: prob.map(v => v >= 15 ? 'rgba(239,68,68,0.75)' : v >= 10 ? 'rgba(245,158,11,0.65)' : 'rgba(59,130,246,0.55)'),
      },
    ], { yMin: 0, legend: false });
  }

  // ── Generation Mix Forecast ────────────────────────────────
  function renderGenMixForecast() {
    const labels = EnergyData.futureLabels(12);
    const wind    = labels.map(() => +(EnergyData.rand(80, 120)).toFixed(0));
    const solar   = labels.map(() => +(EnergyData.rand(60, 180)).toFixed(0));
    const hydro   = labels.map(() => +(EnergyData.rand(40, 55)).toFixed(0));
    const battery = labels.map(() => +(EnergyData.rand(20, 50)).toFixed(0));

    Charts.stackedBar('forecastGenMixChart', labels, [
      { label: 'Wind (MW)',    data: wind,    backgroundColor: 'rgba(59,130,246,0.7)'  },
      { label: 'Solar (MW)',   data: solar,   backgroundColor: 'rgba(245,158,11,0.7)' },
      { label: 'Hydro (MW)',   data: hydro,   backgroundColor: 'rgba(74,222,128,0.7)' },
      { label: 'Battery (MW)', data: battery, backgroundColor: 'rgba(167,139,250,0.7)'},
    ], { yMin: 0, legend: true });
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents() {
    document.querySelectorAll('#forecastTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#forecastTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentTab = btn.dataset.tab;
        renderForecastChart();
        App.toast(`Forecast updated: ${currentTab} window`, 'info');
      });
    });

    document.getElementById('runForecastBtn')?.addEventListener('click', () => {
      document.getElementById('forecastModelBadge').textContent = 'Recalculating…';
      setTimeout(() => {
        renderKpis();
        renderForecastChart();
        renderForecastTable();
        document.getElementById('forecastModelBadge').textContent = 'LSTM Model v2.3';
        App.toast('Forecast model refreshed with latest data', 'success');
      }, 900);
    });

    document.getElementById('exportForecastBtn')?.addEventListener('click', () => {
      App.toast('Forecast exported to CSV', 'success');
    });
  }

  return { init };
})();
