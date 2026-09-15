/* ============================================================
   EnergyOS — Operator Brief Generator
   ============================================================ */

const BriefModule = (() => {
  let brief = null;

  function init() {
    brief = EnergyData.operatorBrief();
    renderGeneratedAt();
    renderBriefKpis();
    renderFleetStatus();
    renderCurtailRisk();
    renderSummary();
    renderAnomalies();
    renderCurtailmentPlan();
    renderActions();
    renderForecastChart();
    renderRecoveryChart();
    renderTimeline();
    renderRevenueChart();
    renderAnomalyMix();
    bindEvents();
  }

  // ── Generated timestamp ────────────────────────────────────
  function renderGeneratedAt() {
    const el = document.getElementById('briefGeneratedAt');
    if (el) el.textContent = `Generated: ${brief.generatedAt} · Period: ${brief.period}`;
  }

  // ── Brief KPI Grid ─────────────────────────────────────────
  function renderBriefKpis() {
    const s = brief.summary;
    const totalRecovery = brief.curtailmentPlan.reduce((sum, r) => sum + parseInt(r.saving), 0);
    const kpis = [
      { label: 'Peak Demand Forecast', value: s.peakDemand.replace(' MW',''), unit: 'MW', color: 'red',
        delta: 'Next 12 hours', dir: 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
      { label: 'Curtailment Risk', value: s.curtailmentRisk.replace(' MW',''), unit: 'MW', color: 'amber',
        delta: 'Action required', dir: 'down',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>` },
      { label: 'Revenue at Risk', value: s.estimatedRevLoss, unit: '', color: 'red',
        delta: 'Without mitigation', dir: 'down',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>` },
      { label: 'Recovery Potential', value: `${totalRecovery}`, unit: 'MWh', color: 'green',
        delta: 'If all actions taken', dir: 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
    ];

    document.getElementById('briefKpiGrid').innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.color}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}<span class="unit">${k.unit}</span></div>
        <div class="kpi-delta ${k.dir}">${k.delta}</div>
        <div class="kpi-icon ${k.color}">${k.icon}</div>
      </div>
    `).join('');
  }

  // ── Fleet Status Doughnut ──────────────────────────────────
  function renderFleetStatus() {
    const rootCauses = EnergyData.rootCauses();
    const critical = rootCauses.filter(a => a.status === 'critical').length;
    const degraded = rootCauses.filter(a => a.status === 'degraded').length;
    const optimal  = rootCauses.filter(a => a.status === 'optimal').length;

    Charts.doughnut(
      'briefFleetStatusChart',
      ['Optimal', 'Degraded', 'Critical'],
      [optimal, degraded, critical],
      ['#4ade80', '#f59e0b', '#ef4444'],
      { legend: true }
    );
  }

  // ── Curtailment Risk Bar ───────────────────────────────────
  function renderCurtailRisk() {
    const labels  = brief.curtailmentPlan.map(r => r.asset);
    const riskMW  = brief.curtailmentPlan.map(r => r.targetMW - r.currentMW);

    Charts.bar('briefCurtailRiskChart', labels, [
      { label: 'Recoverable MW', data: riskMW, backgroundColor: 'rgba(245,158,11,0.7)' },
    ], { yMin: 0, legend: false });
  }

  // ── Executive Summary ──────────────────────────────────────
  function renderSummary() {
    const s = brief.summary;
    const rows = [
      { label: 'Forecast Period',        value: brief.period },
      { label: 'Peak Demand Forecast',   value: s.peakDemand },
      { label: 'Total Renewable Capacity', value: s.totalCapacity },
      { label: 'Active Anomalies',       value: `<span class="badge badge-red">${s.activeAnomalies} critical</span>` },
      { label: 'Forecasted Spike Events',value: `<span class="badge badge-amber">${s.forecastedSpikes}</span>` },
      { label: 'Total Curtailment Risk', value: `<strong style="color:var(--amber)">${s.curtailmentRisk}</strong>` },
      { label: 'Estimated Revenue Loss', value: `<strong style="color:var(--red)">${s.estimatedRevLoss}</strong>` },
    ];

    document.getElementById('briefSummaryRows').innerHTML = rows.map(r => `
      <div class="brief-row">
        <span class="brief-row-label">${r.label}</span>
        <span class="brief-row-value">${r.value}</span>
      </div>
    `).join('');
  }

  // ── Critical Anomalies ─────────────────────────────────────
  function renderAnomalies() {
    const sevMap = { high: 'error', medium: 'warning', critical: 'error', low: 'info' };

    document.getElementById('briefAnomalies').innerHTML = brief.criticalAnomalies.map(a => `
      <div class="alert-box ${sevMap[a.severity] || 'warning'}" style="margin-bottom:10px;">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
          <line x1="12" y1="9" x2="12" y2="13"/>
          <line x1="12" y1="17" x2="12.01" y2="17"/>
        </svg>
        <div class="alert-box-body">
          <div class="alert-box-title">${a.id} · ${a.assetName} — ${a.type}</div>
          <div class="alert-box-msg">${a.description} Detected: ${a.detectedAt} · Confidence: ${a.confidence}%</div>
        </div>
      </div>
    `).join('');
  }

  // ── Curtailment Plan ───────────────────────────────────────
  function renderCurtailmentPlan() {
    document.getElementById('curtailmentPlanRows').innerHTML = brief.curtailmentPlan.map(row => `
      <div class="curtail-plan">
        <div>
          <div class="curtail-asset">${row.asset}</div>
          <div style="font-size:11px;color:var(--text-muted);">${row.issue} — ${row.action}</div>
        </div>
        <div class="curtail-val" style="color:var(--red)">${row.currentMW} MW</div>
        <div class="curtail-val" style="color:var(--green)">${row.targetMW} MW</div>
        <div class="curtail-val">
          <span class="badge badge-green">${row.saving}</span>
        </div>
      </div>
    `).join('');
  }

  // ── Priority Actions ───────────────────────────────────────
  function renderActions() {
    const actionColors = ['blue','green','amber','red'];
    document.getElementById('briefActions').innerHTML = brief.topActions.map((a, i) => `
      <div class="rec-chip">
        <div class="rec-chip-icon ${actionColors[i % 4]}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="rec-chip-body">
          <div class="rec-chip-title">Priority ${a.priority}: ${a.action}</div>
          <div class="rec-chip-desc">${a.from} → ${a.to} · ${Math.abs(a.mw)} MW · ${a.impact}</div>
        </div>
        <span class="badge ${a.status === 'advisory' ? 'badge-amber' : 'badge-blue'}">${a.status}</span>
      </div>
    `).join('');
  }

  // ── Forecast Chart ─────────────────────────────────────────
  function renderForecastChart() {
    const forecast = EnergyData.demandForecast(12);
    const labels   = EnergyData.futureLabels(12);
    const demand   = forecast.map(f => f.predicted);
    const capacity = labels.map(() => +(EnergyData.rand(580, 640)).toFixed(0));
    const curtailed = demand.map((d, i) => Math.max(0, d - capacity[i]));

    Charts.line('briefForecastChart', labels, [
      {
        label: 'Forecast Demand (MW)',
        data: demand,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.08)',
        fill: true,
      },
      {
        label: 'Available Capacity (MW)',
        data: capacity,
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.06)',
        fill: true,
        borderDash: [5, 3],
      },
    ], { legend: true, yMin: 400 });
  }

  // ── Recovery Chart ─────────────────────────────────────────
  function renderRecoveryChart() {
    const labels  = brief.curtailmentPlan.map(r => r.asset);
    const current = brief.curtailmentPlan.map(r => r.currentMW);
    const target  = brief.curtailmentPlan.map(r => r.targetMW);

    Charts.bar('recoveryChart', labels, [
      { label: 'Current (MW)', data: current, backgroundColor: 'rgba(239,68,68,0.55)' },
      { label: 'Target (MW)',  data: target,  backgroundColor: 'rgba(74,222,128,0.55)' },
    ], { yMin: 0, legend: true });
  }

  // ── Action Timeline ────────────────────────────────────────
  function renderTimeline() {
    const items = [
      { time: 'Immediate', label: 'Isolate BA-01 packs 3 & 4 — thermal alert', color: 'red' },
      { time: 'Within 1hr', label: 'Deploy cleaning crew to PV-01 — soiling loss', color: 'amber' },
      { time: 'Within 2hr', label: 'Redirect 45 MW surplus North → Central', color: 'blue' },
      { time: 'Within 4hr', label: 'Schedule WF-02 yaw calibration', color: 'amber' },
      { time: 'Within 6hr', label: 'Pre-charge BA-02 from overnight wind output', color: 'green' },
      { time: 'Tonight',    label: 'Run full inverter diagnostics on PV-01 strings 3-7', color: 'blue' },
    ];

    document.getElementById('briefTimeline').innerHTML = `
      <div class="timeline">
        ${items.map(item => `
          <div class="timeline-item">
            <div class="timeline-dot ${item.color}"></div>
            <div class="timeline-content">
              <div class="timeline-title">${item.label}</div>
              <div class="timeline-meta">${item.time}</div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // ── Revenue Impact Chart ───────────────────────────────────
  function renderRevenueChart() {
    const labels  = brief.curtailmentPlan.map(r => r.asset);
    const savings = brief.curtailmentPlan.map(r => {
      const mwh = parseInt(r.saving);
      return +(mwh * 85).toFixed(0);  // £85/MWh proxy price
    });

    Charts.bar('briefRevenueChart', labels, [
      { label: '£ Revenue Saved', data: savings, backgroundColor: 'rgba(74,222,128,0.65)' },
    ], { yMin: 0, legend: false });
  }

  // ── Anomaly Type Mix ───────────────────────────────────────
  function renderAnomalyMix() {
    const anomalies = EnergyData.anomalyDetections();
    const typeMap = {};
    anomalies.forEach(a => {
      typeMap[a.type] = (typeMap[a.type] || 0) + 1;
    });
    const labels = Object.keys(typeMap);
    const values = labels.map(l => typeMap[l]);
    const colors = ['#ef4444','#f59e0b','#3b82f6','#4ade80','#a78bfa'];

    Charts.doughnut('briefAnomalyMixChart', labels, values, colors.slice(0, labels.length), { legend: true });
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents() {
    document.getElementById('regenerateBriefBtn')?.addEventListener('click', () => {
      brief = EnergyData.operatorBrief();
      init();
      App.toast('Operator brief regenerated', 'success');
    });

    document.getElementById('printBriefBtn')?.addEventListener('click', () => {
      window.print();
    });
  }

  return { init };
})();
