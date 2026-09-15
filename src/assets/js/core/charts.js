/* ============================================================
   EnergyOS — Chart Rendering Helpers (Chart.js wrappers)
   ============================================================ */

const Charts = (() => {
  // Global Chart.js defaults
  Chart.defaults.color = '#8899b0';
  Chart.defaults.borderColor = '#1e2d44';
  Chart.defaults.font.family = '-apple-system, "Segoe UI", system-ui, sans-serif';
  Chart.defaults.font.size = 12;

  const instances = {};

  function destroy(id) {
    if (instances[id]) { instances[id].destroy(); delete instances[id]; }
  }

  function getOrCreate(id, config) {
    destroy(id);
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    const chart = new Chart(canvas, config);
    instances[id] = chart;
    return chart;
  }

  // ── Line Chart ─────────────────────────────────────────────
  function line(id, labels, datasets, opts = {}) {
    return getOrCreate(id, {
      type: 'line',
      data: { labels, datasets: datasets.map(d => ({
        borderWidth: 2,
        pointRadius: 2,
        pointHoverRadius: 5,
        tension: 0.4,
        fill: d.fill !== undefined ? d.fill : false,
        ...d,
      }))},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: opts.legend !== false },
          tooltip: {
            mode: 'index',
            intersect: false,
            backgroundColor: '#161f2e',
            borderColor: '#1e2d44',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: { color: '#1a2840' },
            ticks: { maxTicksLimit: opts.maxXTicks || 8 },
          },
          y: {
            grid: { color: '#1a2840' },
            ticks: { maxTicksLimit: 6 },
            min: opts.yMin,
            max: opts.yMax,
            title: opts.yLabel ? { display: true, text: opts.yLabel } : undefined,
          },
        },
      },
    });
  }

  // ── Bar Chart ──────────────────────────────────────────────
  // Supports opts.stacked:true for stacked bars
  // Supports mixed datasets with { type:'line', ... } — those skip bar-specific props
  function bar(id, labels, datasets, opts = {}) {
    const processedDatasets = datasets.map(d => {
      if (d.type === 'line') {
        return {
          borderWidth: 2,
          pointRadius: 3,
          tension: 0.4,
          fill: false,
          ...d,
        };
      }
      return {
        borderRadius: 4,
        borderSkipped: false,
        ...d,
      };
    });

    return getOrCreate(id, {
      type: 'bar',
      data: { labels, datasets: processedDatasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: opts.legend !== false },
          tooltip: {
            backgroundColor: '#161f2e',
            borderColor: '#1e2d44',
            borderWidth: 1,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            stacked: opts.stacked || false,
          },
          y: {
            grid: { color: '#1a2840' },
            min: opts.yMin,
            stacked: opts.stacked || false,
          },
        },
      },
    });
  }

  // ── Doughnut / Gauge ───────────────────────────────────────
  function doughnut(id, labels, data, colors, opts = {}) {
    return getOrCreate(id, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors,
          borderColor: colors.map(c => c + '88'),
          borderWidth: 1,
          hoverOffset: 6,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: opts.cutout || '65%',
        plugins: {
          legend: {
            display: opts.legend !== false,
            position: 'right',
            labels: { boxWidth: 10, padding: 12 },
          },
          tooltip: {
            backgroundColor: '#161f2e',
            borderColor: '#1e2d44',
            borderWidth: 1,
          },
        },
      },
    });
  }

  // ── Radar ──────────────────────────────────────────────────
  function radar(id, labels, datasets, opts = {}) {
    return getOrCreate(id, {
      type: 'radar',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            grid: { color: '#1e2d44' },
            ticks: { backdropColor: 'transparent', color: '#4a5f7a', stepSize: 20 },
            pointLabels: { color: '#8899b0', font: { size: 11 } },
            min: 0, max: 100,
          },
        },
        plugins: { legend: { display: opts.legend !== false } },
      },
    });
  }

  // ── Sparkline (tiny inline line chart) ────────────────────
  function sparkline(id, data, color = '#4ade80') {
    const canvas = document.getElementById(id);
    if (!canvas) return null;
    destroy(id);
    const chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: data.map((_, i) => i),
        datasets: [{
          data,
          borderColor: color,
          borderWidth: 1.5,
          pointRadius: 0,
          tension: 0.4,
          fill: true,
          backgroundColor: color + '22',
        }],
      },
      options: {
        responsive: false,
        plugins: { legend: { display: false }, tooltip: { enabled: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: false,
      },
    });
    instances[id] = chart;
    return chart;
  }

  // ── Stacked Bar (delegates to bar with stacked:true) ───────
  function stackedBar(id, labels, datasets, opts = {}) {
    return bar(id, labels, datasets, { ...opts, stacked: true });
  }

  // ── Scatter ────────────────────────────────────────────────
  function scatter(id, datasets, opts = {}) {
    return getOrCreate(id, {
      type: 'scatter',
      data: { datasets: datasets.map(d => ({
        pointRadius: 5,
        pointHoverRadius: 7,
        ...d,
      })) },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: opts.legend !== false },
          tooltip: {
            backgroundColor: '#161f2e',
            borderColor: '#1e2d44',
            borderWidth: 1,
            callbacks: {
              label: ctx => `(${ctx.parsed.x.toFixed(1)}, ${ctx.parsed.y.toFixed(1)})`,
            },
          },
        },
        scales: {
          x: {
            grid: { color: '#1a2840' },
            title: opts.xLabel ? { display: true, text: opts.xLabel, color: '#8899b0' } : undefined,
          },
          y: {
            grid: { color: '#1a2840' },
            min: opts.yMin,
            max: opts.yMax,
            title: opts.yLabel ? { display: true, text: opts.yLabel, color: '#8899b0' } : undefined,
          },
        },
      },
    });
  }

  function destroyAll() {
    Object.keys(instances).forEach(destroy);
  }

  return { line, bar, doughnut, radar, sparkline, stackedBar, scatter, destroy, destroyAll };
})();
