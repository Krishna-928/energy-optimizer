/* ============================================================
   EnergyOS — Root Cause Analysis Module
   ============================================================ */

const RootCauseModule = (() => {
  let allAssets = [];
  let currentFilter = 'all';

  function init() {
    allAssets = EnergyData.rootCauses();
    renderKpis();
    renderStatusDonut();
    renderCauseProbRadar();
    renderEfficiencyChart();
    renderCards();
    renderCauseCategoryChart();
    renderTypeEfficiencyChart();
    renderOutputCapacity();
    renderEfficiencyTrend();
    bindEvents();
  }

  // ── KPIs ───────────────────────────────────────────────────
  function renderKpis() {
    const critical = allAssets.filter(a => a.status === 'critical').length;
    const degraded = allAssets.filter(a => a.status === 'degraded').length;
    const optimal  = allAssets.filter(a => a.status === 'optimal').length;
    const avgEff   = (allAssets.reduce((s,a) => s + a.efficiency, 0) / allAssets.length).toFixed(1);

    const kpis = [
      { label: 'Avg Fleet Efficiency', value: avgEff, unit: '%', color: avgEff >= 85 ? 'green' : 'amber',
        delta: avgEff >= 85 ? '↑ Above threshold' : '↓ Below target',
        dir: avgEff >= 85 ? 'up' : 'down',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>` },
      { label: 'Critical Assets', value: critical, unit: 'assets', color: 'red',
        delta: 'Root cause identified', dir: critical > 0 ? 'down' : 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>` },
      { label: 'Degraded Assets', value: degraded, unit: 'assets', color: 'amber',
        delta: 'Maintenance required', dir: 'neutral',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>` },
      { label: 'Optimal Assets', value: optimal, unit: 'assets', color: 'green',
        delta: 'No action needed', dir: 'up',
        icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>` },
    ];

    document.getElementById('rcaKpis').innerHTML = kpis.map(k => `
      <div class="kpi-card ${k.color}">
        <div class="kpi-label">${k.label}</div>
        <div class="kpi-value">${k.value}<span class="unit">${k.unit}</span></div>
        <div class="kpi-delta ${k.dir}">${k.delta}</div>
        <div class="kpi-icon ${k.color}">${k.icon}</div>
      </div>
    `).join('');
  }

  // ── Status Doughnut ────────────────────────────────────────
  function renderStatusDonut() {
    const critical = allAssets.filter(a => a.status === 'critical').length;
    const degraded = allAssets.filter(a => a.status === 'degraded').length;
    const optimal  = allAssets.filter(a => a.status === 'optimal').length;

    Charts.doughnut(
      'rcaStatusDonutChart',
      ['Optimal', 'Degraded', 'Critical'],
      [optimal, degraded, critical],
      ['#4ade80', '#f59e0b', '#ef4444'],
      { legend: true }
    );
  }

  // ── Cause Probability Radar ────────────────────────────────
  function renderCauseProbRadar() {
    const dims = ['Wind', 'Solar', 'Hydro', 'Battery', 'Electrical', 'Mechanical'];
    const probabilities = [72, 65, 68, 74, 60, 70];
    const baseline      = [50, 50, 50, 50, 50, 50];

    Charts.radar('rcaCauseProbRadar', dims, [
      {
        label: 'Avg Fault Probability (%)',
        data: probabilities,
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239,68,68,0.12)',
        pointBackgroundColor: '#ef4444',
        borderWidth: 2,
      },
      {
        label: 'Baseline (50%)',
        data: baseline,
        borderColor: '#4a5f7a',
        backgroundColor: 'transparent',
        pointBackgroundColor: '#4a5f7a',
        borderWidth: 1,
        borderDash: [4, 4],
      },
    ], { legend: true });
  }

  // ── Efficiency Chart ───────────────────────────────────────
  function renderEfficiencyChart() {
    const filtered = getFiltered();
    const labels = filtered.map(a => a.id);
    const actual  = filtered.map(a => a.efficiency);
    const target  = filtered.map(() => 92);
    const colors  = actual.map(v => v >= 90 ? 'rgba(74,222,128,0.7)' : v >= 75 ? 'rgba(245,158,11,0.7)' : 'rgba(239,68,68,0.7)');

    Charts.bar('efficiencyChart', labels, [
      { label: 'Actual Efficiency (%)', data: actual, backgroundColor: colors },
      {
        label: 'Target (92%)',
        data: target,
        type: 'line',
        borderColor: '#4ade80',
        borderDash: [5, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
        backgroundColor: 'transparent',
      },
    ], { yMin: 0, legend: true });
  }

  // ── RCA Cards ──────────────────────────────────────────────
  function renderCards() {
    const filtered = getFiltered().filter(a => a.status !== 'optimal' || currentFilter === 'optimal');
    const targetContainer = document.getElementById('rcaCardGrid');
    if (!targetContainer) return;

    const impactColor = { High: 'red', Medium: 'amber', Low: 'blue', Critical: 'red' };

    targetContainer.innerHTML = filtered.map(asset => {
      const statusColor = asset.status === 'critical' ? 'red' : asset.status === 'degraded' ? 'amber' : 'green';
      const causeHtml = asset.causes.length
        ? `<div class="rca-children mt-16">
            ${asset.causes.map(c => `
              <div class="rca-node">
                <div class="kpi-icon ${impactColor[c.impact] || 'blue'}" style="width:26px;height:26px;border-radius:6px;flex-shrink:0;">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>
                </div>
                <div>
                  <div style="font-weight:500;font-size:13px;">${c.label}</div>
                  <div style="font-size:11.5px;color:var(--text-muted);">
                    Category: ${c.category} &nbsp;·&nbsp;
                    Impact: <span style="color:var(--${impactColor[c.impact] || 'blue'})">${c.impact}</span> &nbsp;·&nbsp;
                    Probability: <strong>${(c.prob * 100).toFixed(0)}%</strong>
                  </div>
                </div>
              </div>
            `).join('')}
          </div>`
        : `<div style="color:var(--text-muted);font-size:12px;margin-top:10px;">No degradation causes detected.</div>`;

      return `
        <div class="card">
          <div class="card-header">
            <div>
              <div class="card-title">${asset.name}</div>
              <div class="card-subtitle">${asset.id} · ${asset.type} · ${asset.region}</div>
            </div>
            <span class="badge badge-${statusColor}">${asset.status}</span>
          </div>

          <div class="grid-2" style="gap:10px;margin-bottom:12px;">
            <div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Efficiency</div>
              <div style="font-size:20px;font-weight:700;color:var(--${statusColor === 'red' ? 'red' : statusColor === 'amber' ? 'amber' : 'green'})">${asset.efficiency}%</div>
              <div class="progress-bar"><div class="progress-fill ${statusColor}" style="width:${asset.efficiency}%;"></div></div>
            </div>
            <div>
              <div style="font-size:11px;color:var(--text-muted);margin-bottom:2px;">Output</div>
              <div style="font-size:20px;font-weight:700;">${asset.output} <span style="font-size:12px;color:var(--text-muted);">MW</span></div>
              <div style="font-size:11px;color:var(--text-muted);">Capacity: ${asset.capacity} MW</div>
            </div>
          </div>

          <div class="rca-tree">
            <div class="rca-node root-node">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" style="flex-shrink:0;color:var(--text-muted)"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              <div>
                <strong>Root Cause Analysis</strong>
                <div style="font-size:12px;color:var(--text-muted);">${asset.causes.length} contributing factor${asset.causes.length !== 1 ? 's' : ''} identified</div>
              </div>
            </div>
            ${causeHtml}
          </div>

          <div class="alert-box info" style="margin-top:12px;">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <div class="alert-box-body">
              <div class="alert-box-title">Recommendation</div>
              <div class="alert-box-msg">${asset.recommendation}</div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Show message if no cards (e.g. all optimal and filter is not 'optimal')
    if (!filtered.length) {
      targetContainer.innerHTML = `
        <div class="card" style="grid-column:1/-1;">
          <div style="text-align:center;padding:40px 20px;color:var(--text-muted);">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="40" height="40" style="margin-bottom:12px;color:var(--green)"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <div style="font-size:15px;font-weight:600;color:var(--green);margin-bottom:6px;">All assets performing optimally</div>
            <div style="font-size:13px;">No root cause findings for the selected filter.</div>
          </div>
        </div>
      `;
    }
  }

  // ── Cause Category Chart ───────────────────────────────────
  function renderCauseCategoryChart() {
    const cats = {};
    allAssets.forEach(a => a.causes.forEach(c => {
      cats[c.category] = (cats[c.category] || 0) + 1;
    }));
    const labels = Object.keys(cats);
    const values = labels.map(l => cats[l]);
    const colors = ['rgba(59,130,246,0.7)','rgba(239,68,68,0.7)','rgba(245,158,11,0.7)','rgba(74,222,128,0.7)','rgba(167,139,250,0.7)','rgba(34,211,238,0.7)'];

    Charts.bar('causeCategoryChart', labels, [
      { label: 'Count', data: values, backgroundColor: colors.slice(0, labels.length) },
    ], { yMin: 0, legend: false });
  }

  // ── Type Efficiency Chart ──────────────────────────────────
  function renderTypeEfficiencyChart() {
    const typeMap = {};
    allAssets.forEach(a => {
      if (!typeMap[a.type]) typeMap[a.type] = [];
      typeMap[a.type].push(a.efficiency);
    });
    const types = Object.keys(typeMap);
    const avgs  = types.map(t => +(typeMap[t].reduce((s,v) => s+v,0) / typeMap[t].length).toFixed(1));
    const colors = ['rgba(59,130,246,0.7)','rgba(245,158,11,0.7)','rgba(74,222,128,0.7)','rgba(167,139,250,0.7)'];

    Charts.bar('typeEfficiencyChart', types, [
      { label: 'Avg Efficiency (%)', data: avgs, backgroundColor: colors.slice(0, types.length) },
    ], { yMin: 60, legend: false });
  }

  // ── Output vs Capacity Chart ───────────────────────────────
  function renderOutputCapacity() {
    const labels   = allAssets.map(a => a.id);
    const outputs  = allAssets.map(a => a.output);
    const capacity = allAssets.map(a => a.capacity);

    Charts.bar('rcaOutputCapacityChart', labels, [
      { label: 'Capacity (MW)', data: capacity, backgroundColor: 'rgba(136,153,176,0.35)' },
      { label: 'Output (MW)',   data: outputs,  backgroundColor: outputs.map((o, i) =>
          o / allAssets[i].capacity >= 0.85 ? 'rgba(74,222,128,0.7)' :
          o / allAssets[i].capacity >= 0.65 ? 'rgba(245,158,11,0.7)' :
          'rgba(239,68,68,0.7)'
        ) },
    ], { yMin: 0, legend: true });
  }

  // ── Efficiency Trend ───────────────────────────────────────
  function renderEfficiencyTrend() {
    const days = EnergyData.dayLabels(7);
    const trend = days.map(() => +(EnergyData.rand(74, 91)).toFixed(1));
    const target = days.map(() => 92);

    Charts.line('rcaEfficiencyTrendChart', days, [
      {
        label: 'Fleet Avg Efficiency (%)',
        data: trend,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.1)',
        fill: true,
        pointRadius: 4,
      },
      {
        label: 'Target (92%)',
        data: target,
        borderColor: '#4ade80',
        borderDash: [5, 3],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      },
    ], { yMin: 60, legend: true });
  }

  function getFiltered() {
    if (currentFilter === 'all') return allAssets;
    return allAssets.filter(a => a.status === currentFilter);
  }

  // ── Events ─────────────────────────────────────────────────
  function bindEvents() {
    document.querySelectorAll('#rcaFilterTabs .tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#rcaFilterTabs .tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        renderEfficiencyChart();
        renderCards();
      });
    });

    document.getElementById('generateRcaBtn')?.addEventListener('click', () => {
      allAssets = EnergyData.rootCauses();
      init();
      App.toast('Root cause analysis refreshed', 'info');
    });
  }

  return { init };
})();
