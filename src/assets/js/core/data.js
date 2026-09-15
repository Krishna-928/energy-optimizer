/* ============================================================
   EnergyOS — Data Simulation Layer
   All synthetic grid/energy data lives here.
   ============================================================ */

const EnergyData = (() => {
  // ── Seeded random ──────────────────────────────────────────
  let seed = Date.now();
  function rand(min = 0, max = 1) {
    seed = (seed * 9301 + 49297) % 233280;
    return min + (seed / 233280) * (max - min);
  }
  function randInt(min, max) { return Math.round(rand(min, max)); }
  function choice(arr) { return arr[Math.floor(rand() * arr.length)]; }

  // ── Asset Definitions ──────────────────────────────────────
  const ASSETS = [
    { id: 'WF-01', name: 'Wind Farm Alpha',    type: 'wind',   capacity: 120, region: 'North',  lat: 53.5, lon: -1.5 },
    { id: 'WF-02', name: 'Wind Farm Beta',     type: 'wind',   capacity: 95,  region: 'North',  lat: 54.2, lon: -2.1 },
    { id: 'WF-03', name: 'Wind Farm Gamma',    type: 'wind',   capacity: 80,  region: 'East',   lat: 52.8, lon: 0.8  },
    { id: 'PV-01', name: 'Solar Park Delta',   type: 'solar',  capacity: 200, region: 'South',  lat: 51.2, lon: -0.9 },
    { id: 'PV-02', name: 'Solar Park Epsilon', type: 'solar',  capacity: 160, region: 'South',  lat: 50.9, lon: -1.4 },
    { id: 'PV-03', name: 'Solar Park Zeta',    type: 'solar',  capacity: 180, region: 'West',   lat: 51.5, lon: -3.2 },
    { id: 'HY-01', name: 'Hydro Station One',  type: 'hydro',  capacity: 55,  region: 'West',   lat: 52.0, lon: -4.1 },
    { id: 'HY-02', name: 'Hydro Station Two',  type: 'hydro',  capacity: 45,  region: 'North',  lat: 55.1, lon: -3.7 },
    { id: 'BA-01', name: 'Battery Store A',    type: 'battery',capacity: 50,  region: 'Central',lat: 52.4, lon: -1.9 },
    { id: 'BA-02', name: 'Battery Store B',    type: 'battery',capacity: 40,  region: 'Central',lat: 52.6, lon: -1.6 },
  ];

  const REGIONS = ['North','South','East','West','Central'];

  // ── Time helpers ───────────────────────────────────────────
  function timeLabels(n, stepMin = 60) {
    const out = [];
    const now = new Date();
    now.setMinutes(0, 0, 0);
    for (let i = -(n - 1); i <= 0; i++) {
      const t = new Date(now.getTime() + i * stepMin * 60000);
      out.push(t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
    return out;
  }

  function futureLabels(n, stepMin = 60) {
    const out = [];
    const now = new Date();
    now.setMinutes(0, 0, 0);
    for (let i = 0; i < n; i++) {
      const t = new Date(now.getTime() + i * stepMin * 60000);
      out.push(t.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    }
    return out;
  }

  function dayLabels(n = 7) {
    const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    const today = new Date().getDay();
    return Array.from({length: n}, (_, i) => days[(today - (n - 1) + i + 7) % 7]);
  }

  // ── Demand Forecasting Data ────────────────────────────────
  function demandHistory(n = 24) {
    const base = [380,360,340,330,325,330,370,430,520,560,580,575,
                  560,540,530,545,580,620,650,635,600,560,510,440];
    return base.slice(0, n).map((v, i) => v + rand(-20, 20) + (i === 9 ? 80 : 0));
  }

  function demandForecast(n = 12) {
    const base = [440,460,490,520,555,590,625,660,640,600,565,530];
    return base.slice(0, n).map(v => ({
      predicted: +(v + rand(-15, 15)).toFixed(1),
      lower:     +(v - rand(20, 40)).toFixed(1),
      upper:     +(v + rand(20, 40)).toFixed(1),
      confidence: +(rand(82, 97)).toFixed(1),
    }));
  }

  function spikeEvents() {
    return [
      { time: '09:00', asset: 'All Regions',  severity: 'high',   predicted: 660, current: 620, delta: '+6.5%', cause: 'Industrial load ramp-up' },
      { time: '13:00', asset: 'South Region', severity: 'medium', predicted: 590, current: 560, delta: '+5.4%', cause: 'Commercial HVAC peak' },
      { time: '17:00', asset: 'North Region', severity: 'high',   predicted: 680, current: 635, delta: '+7.1%', cause: 'EV charging evening surge' },
      { time: '20:00', asset: 'West Region',  severity: 'low',    predicted: 510, current: 500, delta: '+2.0%', cause: 'Residential heating onset' },
    ];
  }

  // ── Load Balancing Data ────────────────────────────────────
  function loadDistribution() {
    return REGIONS.map(region => ({
      region,
      load:     +(rand(55, 95)).toFixed(1),
      capacity: 100,
      imports:  +(rand(0, 30)).toFixed(1),
      exports:  +(rand(0, 20)).toFixed(1),
      status:   choice(['balanced','overloaded','underutilised']),
    }));
  }

  function loadActions() {
    return [
      { priority: 1, action: 'Redirect 45 MW surplus from North to Central', from: 'North', to: 'Central', mw: 45, impact: 'Reduces North curtailment by 38 MWh', status: 'pending' },
      { priority: 2, action: 'Activate Battery Store A for South peak cover', from: 'BA-01', to: 'South',   mw: 35, impact: 'Covers 82% of forecast spike', status: 'pending' },
      { priority: 3, action: 'Dispatch Hydro HY-02 flexible ramp to East',    from: 'HY-02', to: 'East',   mw: 22, impact: 'Balances 15-min imbalance window', status: 'pending' },
      { priority: 4, action: 'Curtail Solar PV-01 by 18 MW during off-peak',  from: 'PV-01', to: 'Grid',   mw: -18,impact: 'Prevents voltage exceedance', status: 'advisory' },
      { priority: 5, action: 'Pre-charge Battery Store B from overnight wind', from: 'WF-01', to: 'BA-02',  mw: 28, impact: 'Stores 112 MWh for morning ramp', status: 'pending' },
    ];
  }

  // ── Anomaly Detection Data ─────────────────────────────────
  function anomalyDetections() {
    return [
      {
        id: 'ANO-001', asset: 'WF-02', assetName: 'Wind Farm Beta',
        type: 'Performance Degradation', severity: 'high',
        detectedAt: '08:32', metric: 'Capacity Factor',
        expected: 42.0, actual: 28.5, deviation: -32.1,
        confidence: 96.4, status: 'active',
        description: 'Output 32% below expected given measured wind speed. Likely turbine fault or yaw misalignment.',
      },
      {
        id: 'ANO-002', asset: 'PV-01', assetName: 'Solar Park Delta',
        type: 'Inverter Efficiency Loss', severity: 'medium',
        detectedAt: '09:15', metric: 'Inverter Efficiency',
        expected: 98.2, actual: 91.7, deviation: -6.6,
        confidence: 88.9, status: 'active',
        description: 'String-level inverter efficiency drop. Possible soiling or PID effect on strings 3-7.',
      },
      {
        id: 'ANO-003', asset: 'HY-01', assetName: 'Hydro Station One',
        type: 'Output Volatility', severity: 'medium',
        detectedAt: '07:50', metric: 'Power Variance',
        expected: 2.1, actual: 8.7, deviation: +314,
        confidence: 91.2, status: 'active',
        description: 'Abnormal output oscillations. Potential governor control issue or inlet valve instability.',
      },
      {
        id: 'ANO-004', asset: 'WF-01', assetName: 'Wind Farm Alpha',
        type: 'Grid Connection Fault', severity: 'low',
        detectedAt: '10:05', metric: 'Reactive Power',
        expected: -5.0, actual: -18.3, deviation: -266,
        confidence: 78.3, status: 'monitoring',
        description: 'Reactive power absorption elevated. Possible transformer tap issue or capacitor bank fault.',
      },
      {
        id: 'ANO-005', asset: 'BA-01', assetName: 'Battery Store A',
        type: 'Thermal Anomaly', severity: 'high',
        detectedAt: '11:20', metric: 'Cell Temperature',
        expected: 28.0, actual: 41.5, deviation: +48.2,
        confidence: 99.1, status: 'critical',
        description: 'Cell temperature 48% above nominal. Requires immediate inspection. BMS has flagged packs 3 and 4.',
      },
    ];
  }

  function anomalyTimeSeries(assetId) {
    const n = 48;
    const series = [];
    const anomalyIdx = [18, 19, 20, 21, 22, 23, 24, 25];
    for (let i = 0; i < n; i++) {
      const base = assetId.startsWith('PV') ? 85 : assetId.startsWith('WF') ? 42 : 75;
      const isAno = anomalyIdx.includes(i);
      series.push(+(base + rand(-3, 3) + (isAno ? rand(-20, -8) : 0)).toFixed(2));
    }
    return series;
  }

  // ── Root Cause Analysis Data ───────────────────────────────
  function rootCauses() {
    return ASSETS.map(asset => {
      const ef = +(rand(60, 100)).toFixed(1);
      const degraded = ef < 80;
      const causes = degraded ? generateCauses(asset.type) : [];
      return {
        ...asset,
        efficiency: ef,
        output: +(asset.capacity * (ef / 100) * rand(0.6, 0.95)).toFixed(1),
        status: ef >= 90 ? 'optimal' : ef >= 75 ? 'degraded' : 'critical',
        causes,
        recommendation: degraded ? getRec(asset.type, causes) : 'No action required.',
      };
    });
  }

  function generateCauses(type) {
    const causeLib = {
      wind: [
        { label: 'Yaw Misalignment', prob: 0.76, category: 'mechanical', impact: 'High' },
        { label: 'Blade Erosion',    prob: 0.62, category: 'wear',       impact: 'Medium' },
        { label: 'Gearbox Vibration',prob: 0.48, category: 'mechanical', impact: 'High' },
        { label: 'SCADA Data Gap',   prob: 0.31, category: 'data',       impact: 'Low' },
      ],
      solar: [
        { label: 'Module Soiling',      prob: 0.84, category: 'environmental', impact: 'Medium' },
        { label: 'Inverter Fault',      prob: 0.67, category: 'electrical',    impact: 'High' },
        { label: 'Shading Event',       prob: 0.55, category: 'environmental', impact: 'Medium' },
        { label: 'PID Degradation',     prob: 0.43, category: 'electrical',    impact: 'Low' },
      ],
      hydro: [
        { label: 'Inlet Valve Wear',    prob: 0.71, category: 'mechanical', impact: 'High' },
        { label: 'Cavitation',          prob: 0.58, category: 'hydraulic',  impact: 'High' },
        { label: 'Sediment Buildup',    prob: 0.49, category: 'hydraulic',  impact: 'Medium' },
      ],
      battery: [
        { label: 'Cell Imbalance',      prob: 0.80, category: 'electrical', impact: 'High' },
        { label: 'Thermal Runaway Risk',prob: 0.65, category: 'thermal',    impact: 'Critical' },
        { label: 'BMS Calibration Drift',prob:0.52, category: 'software',   impact: 'Medium' },
      ],
    };
    return (causeLib[type] || []).filter(c => rand() < c.prob).slice(0, 3);
  }

  function getRec(type, causes) {
    const recs = {
      wind:    'Schedule yaw calibration and blade inspection within 48 hrs.',
      solar:   'Deploy cleaning crew; run inverter diagnostics on affected strings.',
      hydro:   'Inspect inlet valve and run cavitation diagnostics.',
      battery: 'Isolate affected packs; schedule cell balancing and thermal inspection.',
    };
    return recs[type] || 'Review O&M schedule.';
  }

  // ── Operator Brief Data ────────────────────────────────────
  function operatorBrief() {
    const anomalies = anomalyDetections();
    const actions   = loadActions();
    const forecast  = demandForecast(12);

    const peakDemand = Math.max(...forecast.map(f => f.predicted));
    const totalCap   = ASSETS.reduce((s, a) => s + a.capacity, 0);
    const curtailed  = 47.3;  // MW
    const curtailMWh = (curtailed * 6).toFixed(0);  // revenue loss proxy

    return {
      generatedAt: new Date().toLocaleString('en-GB'),
      period: 'Next 12 hours',
      summary: {
        peakDemand:      `${peakDemand.toFixed(0)} MW`,
        totalCapacity:   `${totalCap} MW`,
        activeAnomalies: anomalies.filter(a => a.status === 'active' || a.status === 'critical').length,
        forecastedSpikes: 3,
        curtailmentRisk:  `${curtailed} MW`,
        estimatedRevLoss: `£${(curtailMWh * 85).toFixed(0)}`,
      },
      curtailmentPlan: [
        { asset: 'WF-02', issue: 'Fault-induced output loss', currentMW: 27, targetMW: 95, action: 'Repair + Reconnect', saving: '204 MWh' },
        { asset: 'PV-01', issue: 'Inverter inefficiency',    currentMW: 148, targetMW: 165, action: 'Inverter service',  saving: '102 MWh' },
        { asset: 'BA-01', issue: 'Thermal constraint',       currentMW: 32,  targetMW: 48,  action: 'Thermal mitigation',saving: '96 MWh' },
        { asset: 'HY-01', issue: 'Governor instability',     currentMW: 38,  targetMW: 50,  action: 'Governor recalibrate',saving:'72 MWh' },
      ],
      topActions: actions.slice(0, 4),
      criticalAnomalies: anomalies.filter(a => ['high','critical'].includes(a.severity)).slice(0, 3),
    };
  }

  // ── Sparkline Data ─────────────────────────────────────────
  function sparkline(n = 12, min = 60, max = 100) {
    return Array.from({length: n}, () => +(rand(min, max)).toFixed(1));
  }

  // ── Export ─────────────────────────────────────────────────
  return {
    ASSETS,
    REGIONS,
    timeLabels,
    futureLabels,
    dayLabels,
    demandHistory,
    demandForecast,
    spikeEvents,
    loadDistribution,
    loadActions,
    anomalyDetections,
    anomalyTimeSeries,
    rootCauses,
    operatorBrief,
    sparkline,
    rand,
    randInt,
    choice,
  };
})();
