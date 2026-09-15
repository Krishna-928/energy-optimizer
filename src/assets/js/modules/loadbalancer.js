/* ============================================================
   EnergyOS — Load Balancing Module
   ============================================================ */

const LoadBalancerModule = (() => {
  let actions = [];
  let approvedIds = new Set();

  function init() {
    actions = EnergyData.loadActions();
    renderKpis();
    renderRegionalChart();
    renderRadarChart();
    renderLoadTrend();
    renderCurtailHistory();
    renderActions();
    renderImportExport();
    renderDispatchTable();
    renderDispatchTypeChart();
    renderRenewableShare();
    bindEvents();
  }

  // ── KPIs ───────────────────────────────────────────────────
  function renderKpis() {
    const dist = EnergyData.loadDistribution();
    const overloaded = dist.filter(r => r.load > 90).length;
    const totalMW    = dist.reduce((s, r) => s + r.load, 0).toFixed(0);
    const curtailMW  = 47.3;
    const balanceScore = Math.max(0, 100 - overloaded * 15 - curtailMW / 10).toFixed(0);

    const kpis = [
      { label: 'Grid Balance Score', value: balanceScore, unit: '/100', color: balanceScore > 80 ? 'green' : 'amber',
        delta: balanceScore > 80 ? '↑ Stable' : '↓ Action needed',
        dir: balanceScore > 80 ? 'up' : 'down',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>` },
      { label: 'Overloaded Regions', value: overloaded, unit: 'regions', color: overloaded > 0 ? 'red' : 'green',
        delta: overloaded > 0 ? 'Immediate action' : 'All clear',
        dir: overloaded > 0 ? 'down' : 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>` },
      { label: 'Total Active Load', value: totalMW, unit: 'MW', color: 'blue',
        delta: '≈ 78% of capacity',
        dir: 'neutral',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>` },
      { label: 'Curtailment Risk', value: curtailMW, unit: 'MW', color: 'amber',
        delta: '≈ £240k revenue loss',
        dir: 'down',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
    ];

    document.getElementById('lbKpis').innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.color}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}<span class="unit">${k.unit}</span></div>
        <div class="kpi-delta ${k.dir}">${k.delta}</div>
        <div class="kpi-icon ${k.color}">${k.icon}</div>
      </div>
    `).join('');
  }

  // ── Regional Load Chart ────────────────────────────────────
  function renderRegionalChart() {
    const dist = EnergyData.loadDistribution();
    const labels = dist.map(r => r.region);
    const loads  = dist.map(r => +r.load.toFixed(1));
    const colors = loads.map(v => v > 90 ? 'rgba(239,68,68,0.7)' : v > 75 ? 'rgba(245,158,11,0.7)' : 'rgba(59,130,246,0.7)');

    Charts.bar('regionalLoadChart', labels, [
      {
        label: 'Current Load (%)',
        data: loads,
        backgroundColor: colors,
        borderColor: colors.map(c => c.replace('0.7', '1')),
        borderWidth: 1,
      },
      {
        label: 'Capacity (100%)',
        data: labels.map(() => 100),
        backgroundColor: 'rgba(136,153,176,0.1)',
        borderColor: 'rgba(136,153,176,0.3)',
        borderWidth: 1,
        borderDash: [4, 3],
      },
    ], { yMin: 0, legend: true });
  }

  // ── Grid Radar ─────────────────────────────────────────────
  function renderRadarChart() {
    const dims = ['Stability','Efficiency','Balance','Resilience','Renewables %','Forecast Accuracy'];
    const current  = [78, 82, 65, 88, 91, 87];
    const optimal  = [95, 95, 95, 95, 95, 95];

    Charts.radar('gridRadarChart', dims, [
      {
        label: 'Current',
        data: current,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.15)',
        pointBackgroundColor: '#3b82f6',
        borderWidth: 2,
      },
      {
        label: 'Optimal Target',
        data: optimal,
        borderColor: '#4ade80',
        backgroundColor: 'rgba(74,222,128,0.07)',
        pointBackgroundColor: '#4ade80',
        borderWidth: 1.5,
        borderDash: [5, 4],
      },
    ], { legend: true });
  }

  // ── Actions List ───────────────────────────────────────────
  function renderActions() {
    const container = document.getElementById('actionsList');
    if (!container) return;

    container.innerHTML = actions.map((a, idx) => {
      const approved = approvedIds.has(idx);
      const isCurtail = a.mw < 0;
      const color = approved ? 'green' : isCurtail ? 'amber' : 'blue';
      return `
        <div class="rec-chip" id="action-${idx}">
          <div class="rec-chip-icon ${color}">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              ${isCurtail
                ? '<polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>'
                : '<polyline points="1 6 7.5 12.5 12.5 7.5 22 18"/><polyline points="16 6 22 6 22 12"/>'}
            </svg>
          </div>
          <div class="rec-chip-body" style="flex:1;">
            <div class="rec-chip-title">
              #${a.priority} — ${a.action}
              <span class="badge ${approved ? 'badge-green' : 'badge-blue'}" style="margin-left:6px;">
                ${approved ? 'Approved' : a.status}
              </span>
            </div>
            <div class="rec-chip-desc">
              <strong>${a.from}</strong> → <strong>${a.to}</strong> &nbsp;|&nbsp;
              <strong>${Math.abs(a.mw)} MW</strong> &nbsp;|&nbsp;
              ${a.impact}
            </div>
          </div>
          ${!approved ? `<button class="btn btn-sm btn-success" onclick="LoadBalancerModule.approveAction(${idx})">Approve</button>` : ''}
        </div>
      `;
    }).join('');
  }

  function approveAction(idx) {
    approvedIds.add(idx);
    renderActions();
    App.toast(`Action #${actions[idx].priority} approved and queued`, 'success');
  }

  // ── Import/Export Chart ────────────────────────────────────
  function renderImportExport() {
    const dist = EnergyData.loadDistribution();
    const labels  = dist.map(r => r.region);
    const imports = dist.map(r => +r.imports.toFixed(1));
    const exports = dist.map(r => -r.exports.toFixed(1));

    Charts.bar('importExportChart', labels, [
      { label: 'Imports (MW)',  data: imports, backgroundColor: 'rgba(59,130,246,0.65)' },
      { label: 'Exports (MW)', data: exports, backgroundColor: 'rgba(239,68,68,0.55)' },
    ], { legend: true });
  }

  // ── Dispatch Table ─────────────────────────────────────────
  function renderDispatchTable() {
    const assets = EnergyData.ASSETS.slice(0, 8);
    const rows = assets.map(a => {
      const current = +(a.capacity * EnergyData.rand(0.5, 0.9)).toFixed(0);
      const target  = +(a.capacity * EnergyData.rand(0.75, 0.98)).toFixed(0);
      const action  = target > current ? 'Ramp Up' : target < current ? 'Reduce' : 'Hold';
      const color   = action === 'Ramp Up' ? 'badge-green' : action === 'Reduce' ? 'badge-amber' : 'badge-blue';
      return `
        <tr>
          <td><strong>${a.id}</strong> <span style="color:var(--text-muted);font-size:12px;">${a.name}</span></td>
          <td><span class="badge badge-cyan">${a.type}</span></td>
          <td>${current}</td>
          <td>${target}</td>
          <td><span class="badge ${color}">${action}</span></td>
          <td><span class="badge badge-blue">Scheduled</span></td>
        </tr>
      `;
    });
    document.getElementById('dispatchTableBody').innerHTML = rows.join('');
  }

  // ── Load Trend ─────────────────────────────────────────────
  function renderLoadTrend() {
    const labels = EnergyData.timeLabels(24);
    const load   = EnergyData.demandHistory(24).map(v => +(v * 0.92).toFixed(1));

    Charts.line('lbLoadTrendChart', labels, [
      {
        label: 'Total Active Load (MW)',
        data: load,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        pointRadius: 2,
      },
    ], { yMin: 0, legend: false, maxXTicks: 8 });
  }

  // ── Curtailment History ────────────────────────────────────
  function renderCurtailHistory() {
    const days    = EnergyData.dayLabels(7);
    const north   = days.map(() => +(EnergyData.rand(5, 25)).toFixed(1));
    const south   = days.map(() => +(EnergyData.rand(3, 18)).toFixed(1));
    const east    = days.map(() => +(EnergyData.rand(2, 12)).toFixed(1));
    const west    = days.map(() => +(EnergyData.rand(4, 20)).toFixed(1));
    const central = days.map(() => +(EnergyData.rand(1, 10)).toFixed(1));

    Charts.stackedBar('lbCurtailHistChart', days, [
      { label: 'North',   data: north,   backgroundColor: 'rgba(59,130,246,0.7)' },
      { label: 'South',   data: south,   backgroundColor: 'rgba(245,158,11,0.7)' },
      { label: 'East',    data: east,    backgroundColor: 'rgba(74,222,128,0.7)' },
      { label: 'West',    data: west,    backgroundColor: 'rgba(167,139,250,0.7)' },
      { label: 'Central', data: central, backgroundColor: 'rgba(239,68,68,0.7)' },
    ], { yMin: 0, legend: true });
  }

  // ── Dispatch by Asset Type ─────────────────────────────────
  function renderDispatchTypeChart() {
    const types   = ['Wind', 'Solar', 'Hydro', 'Battery'];
    const current = [295, 340, 100, 32];
    const sched   = [310, 350, 100, 48];

    Charts.bar('lbDispatchTypeChart', types, [
      { label: 'Current (MW)',   data: current, backgroundColor: 'rgba(136,153,176,0.5)' },
      { label: 'Scheduled (MW)', data: sched,   backgroundColor: 'rgba(59,130,246,0.7)' },
    ], { yMin: 0, legend: true });
  }

  // ── Regional Renewable Share ───────────────────────────────
  function renderRenewableShare() {
    const dist   = EnergyData.loadDistribution();
    const labels = dist.map(r => r.region);
    const shares = dist.map(() => +(EnergyData.rand(60, 98)).toFixed(1));
    const colors = shares.map(v => v >= 85 ? 'rgba(74,222,128,0.7)' : v >= 70 ? 'rgba(245,158,11,0.65)' : 'rgba(239,68,68,0.65)');

    Charts.bar('lbRenewableShareChart', labels, [
      { label: 'Renewable Share (%)', data: shares, backgroundColor: colors },
    ], { yMin: 0, legend: false });
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents() {
    document.getElementById('recalcBtn')?.addEventListener('click', () => {
      approvedIds.clear();
      actions = EnergyData.loadActions();
      init();
      App.toast('Load balancing recalculated', 'info');
    });

    document.getElementById('approveAllBtn')?.addEventListener('click', () => {
      actions.forEach((_, idx) => approvedIds.add(idx));
      renderActions();
      App.toast('All actions approved and queued', 'success');
    });
  }

  return { init, approveAction };
})();
