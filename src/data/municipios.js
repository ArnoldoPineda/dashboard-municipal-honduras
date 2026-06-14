// SIMHO — Mock data for all 18 Honduras departments (298 municipios total).

// ── Utilities ─────────────────────────────────────────────────────────────────

function evo(base, pcts) {
  let cur = base;
  return pcts.map((p) => {
    const v = Math.round(cur);
    cur = cur * (1 + p / 100);
    return v;
  });
}

function makeEvo(budget2024, rates = [3.8, 4.2, 5.1, 5.4, 6.3, null]) {
  let base = budget2024;
  for (let i = rates.length - 2; i >= 0; i--) {
    base = base / (1 + (rates[i] || 6) / 100);
  }
  const years = [2019, 2020, 2021, 2022, 2023, 2024, 2025];
  const vals = evo(base, rates.slice(0, 5));
  vals.push(budget2024);
  // 2025: deterministic growth 3–8% per municipality based on budget magnitude
  const rate2025 = 0.03 + ((budget2024 % 50000000) / 50000000) * 0.05;
  vals.push(Math.round(budget2024 * (1 + rate2025)));
  return years.map((y, i) => ({ year: y, presupuesto: vals[i] }));
}

// ── Comayagua – 21 municipios ─────────────────────────────────────────────────

const COMAYAGUA_MUNIS = [
  {
    id: 'comayagua-comayagua',
    nombre: 'Comayagua',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 95890,
    presupuesto: 185000000,
    ingresosPropios: 85100000,
    transferencia: 55500000,
    otros: 44400000,
    idh: 0.654,
    area: 1073.4,
    isCapital: true,
    evolucion: [
      { year: 2019, presupuesto: 140500000 },
      { year: 2020, presupuesto: 147200000 },
      { year: 2021, presupuesto: 155000000 },
      { year: 2022, presupuesto: 163400000 },
      { year: 2023, presupuesto: 174800000 },
      { year: 2024, presupuesto: 185000000 },
      { year: 2025, presupuesto: 197450000 },
    ],
  },
  { id:'comayagua-siguatepeque',       nombre:'Siguatepeque',         departamento:'Comayagua', departamentoId:'comayagua', poblacion:80245,  presupuesto:132000000, ingresosPropios:58000000, transferencia:42000000, otros:32000000, idh:0.641, area:657.2,  isCapital:false, evolucion:makeEvo(132000000,[3.5,4.0,5.2,5.8,6.5,null]) },
  { id:'comayagua-la-libertad',        nombre:'La Libertad',          departamento:'Comayagua', departamentoId:'comayagua', poblacion:38432,  presupuesto:58000000,  ingresosPropios:14000000, transferencia:28000000, otros:16000000, idh:0.612, area:812.5,  isCapital:false, evolucion:makeEvo(58000000,[3.2,3.9,4.8,5.1,5.9,null]) },
  { id:'comayagua-taulabe',            nombre:'Taulabé',              departamento:'Comayagua', departamentoId:'comayagua', poblacion:24178,  presupuesto:38000000,  ingresosPropios:8500000,  transferencia:19000000, otros:10500000, idh:0.598, area:436.8,  isCapital:false, evolucion:makeEvo(38000000,[2.8,3.5,4.2,5.0,5.5,null]) },
  { id:'comayagua-villa-de-san-antonio',nombre:'Villa de San Antonio',departamento:'Comayagua', departamentoId:'comayagua', poblacion:21543,  presupuesto:32000000,  ingresosPropios:7000000,  transferencia:16500000, otros:8500000,  idh:0.594, area:218.3,  isCapital:false, evolucion:makeEvo(32000000,[2.6,3.2,4.0,4.8,5.2,null]) },
  { id:'comayagua-san-luis',           nombre:'San Luis',             departamento:'Comayagua', departamentoId:'comayagua', poblacion:18765,  presupuesto:28000000,  ingresosPropios:6000000,  transferencia:14500000, otros:7500000,  idh:0.590, area:287.1,  isCapital:false, evolucion:makeEvo(28000000,[2.5,3.1,3.9,4.6,5.0,null]) },
  { id:'comayagua-ajuterique',         nombre:'Ajuterique',           departamento:'Comayagua', departamentoId:'comayagua', poblacion:16234,  presupuesto:24000000,  ingresosPropios:4800000,  transferencia:12500000, otros:6700000,  idh:0.587, area:155.6,  isCapital:false, evolucion:makeEvo(24000000) },
  { id:'comayagua-el-rosario',         nombre:'El Rosario',           departamento:'Comayagua', departamentoId:'comayagua', poblacion:14876,  presupuesto:22000000,  ingresosPropios:4200000,  transferencia:11500000, otros:6300000,  idh:0.583, area:198.4,  isCapital:false, evolucion:makeEvo(22000000) },
  { id:'comayagua-minas-de-oro',       nombre:'Minas de Oro',         departamento:'Comayagua', departamentoId:'comayagua', poblacion:13456,  presupuesto:20000000,  ingresosPropios:3800000,  transferencia:10500000, otros:5700000,  idh:0.580, area:423.2,  isCapital:false, evolucion:makeEvo(20000000) },
  { id:'comayagua-san-jose-de-comayagua',nombre:'San José de Comayagua',departamento:'Comayagua',departamentoId:'comayagua',poblacion:12321, presupuesto:18000000,  ingresosPropios:3400000,  transferencia:9500000,  otros:5100000,  idh:0.576, area:144.8,  isCapital:false, evolucion:makeEvo(18000000) },
  { id:'comayagua-trinidad',           nombre:'Trinidad',             departamento:'Comayagua', departamentoId:'comayagua', poblacion:11654,  presupuesto:17000000,  ingresosPropios:3200000,  transferencia:9000000,  otros:4800000,  idh:0.574, area:309.6,  isCapital:false, evolucion:makeEvo(17000000) },
  { id:'comayagua-la-trinidad',        nombre:'La Trinidad',          departamento:'Comayagua', departamentoId:'comayagua', poblacion:10987,  presupuesto:16000000,  ingresosPropios:3000000,  transferencia:8500000,  otros:4500000,  idh:0.572, area:276.3,  isCapital:false, evolucion:makeEvo(16000000) },
  { id:'comayagua-meambar',            nombre:'Meámbar',              departamento:'Comayagua', departamentoId:'comayagua', poblacion:10234,  presupuesto:15000000,  ingresosPropios:2800000,  transferencia:8000000,  otros:4200000,  idh:0.570, area:532.1,  isCapital:false, evolucion:makeEvo(15000000) },
  { id:'comayagua-esquias',            nombre:'Esquías',              departamento:'Comayagua', departamentoId:'comayagua', poblacion:9543,   presupuesto:14000000,  ingresosPropios:2600000,  transferencia:7500000,  otros:3900000,  idh:0.568, area:187.4,  isCapital:false, evolucion:makeEvo(14000000) },
  { id:'comayagua-san-jeronimo',       nombre:'San Jerónimo',         departamento:'Comayagua', departamentoId:'comayagua', poblacion:9234,   presupuesto:13500000,  ingresosPropios:2500000,  transferencia:7200000,  otros:3800000,  idh:0.567, area:213.5,  isCapital:false, evolucion:makeEvo(13500000) },
  { id:'comayagua-lejamani',           nombre:'Lejamaní',             departamento:'Comayagua', departamentoId:'comayagua', poblacion:8876,   presupuesto:13000000,  ingresosPropios:2400000,  transferencia:7000000,  otros:3600000,  idh:0.565, area:101.2,  isCapital:false, evolucion:makeEvo(13000000) },
  { id:'comayagua-lamani',             nombre:'Lamaní',               departamento:'Comayagua', departamentoId:'comayagua', poblacion:8432,   presupuesto:12000000,  ingresosPropios:2200000,  transferencia:6500000,  otros:3300000,  idh:0.562, area:253.8,  isCapital:false, evolucion:makeEvo(12000000) },
  { id:'comayagua-humuya',             nombre:'Humuya',               departamento:'Comayagua', departamentoId:'comayagua', poblacion:7876,   presupuesto:11500000,  ingresosPropios:2100000,  transferencia:6200000,  otros:3200000,  idh:0.560, area:386.7,  isCapital:false, evolucion:makeEvo(11500000) },
  { id:'comayagua-san-sebastian',      nombre:'San Sebastián',        departamento:'Comayagua', departamentoId:'comayagua', poblacion:7432,   presupuesto:11000000,  ingresosPropios:2000000,  transferencia:5900000,  otros:3100000,  idh:0.558, area:198.9,  isCapital:false, evolucion:makeEvo(11000000) },
  { id:'comayagua-san-jose-del-potrero',nombre:'San José del Potrero',departamento:'Comayagua', departamentoId:'comayagua', poblacion:6987,   presupuesto:10500000,  ingresosPropios:1900000,  transferencia:5700000,  otros:2900000,  idh:0.556, area:165.3,  isCapital:false, evolucion:makeEvo(10500000) },
  { id:'comayagua-ojos-de-agua',       nombre:'Ojos de Agua',         departamento:'Comayagua', departamentoId:'comayagua', poblacion:6543,   presupuesto:9500000,   ingresosPropios:1700000,  transferencia:5200000,  otros:2600000,  idh:0.553, area:142.6,  isCapital:false, evolucion:makeEvo(9500000) },
];

// ── Helper – builds a municipality record ─────────────────────────────────────

function muni(id, nombre, departamento, departamentoId, poblacion, presupuesto, ingresosPropios, transferencia, idh, area, isCapital) {
  const otros = Math.max(0, presupuesto - ingresosPropios - transferencia);
  return { id, nombre, departamento, departamentoId, poblacion, presupuesto, ingresosPropios, transferencia, otros, idh, area, isCapital: !!isCapital, evolucion: makeEvo(presupuesto) };
}

// ── All other departments (277 municipios) ────────────────────────────────────

const OTRAS_MUNIS = [

  // ── Francisco Morazán – 28 ───────────────────────────────────────────────
  muni('francisco-morazan-tegucigalpa',         'Tegucigalpa',          'Francisco Morazán','francisco-morazan',1412000,1450000000,640000000,480000000,0.702,1541.8,true),
  muni('francisco-morazan-santa-lucia',         'Santa Lucía',          'Francisco Morazán','francisco-morazan',  18400,   22000000,  5800000, 11000000,0.648, 121.5,false),
  muni('francisco-morazan-valle-de-angeles',    'Valle de Ángeles',     'Francisco Morazán','francisco-morazan',  21300,   26000000,  7200000, 13000000,0.641, 134.2,false),
  muni('francisco-morazan-san-juan-de-flores',  'San Juan de Flores',   'Francisco Morazán','francisco-morazan',  11200,   14000000,  3000000,  7500000,0.627,  89.3,false),
  muni('francisco-morazan-talanga',             'Talanga',              'Francisco Morazán','francisco-morazan',  42600,   48000000, 12000000, 24000000,0.619, 312.4,false),
  muni('francisco-morazan-alubaren',            'Alubarén',             'Francisco Morazán','francisco-morazan',   8200,    9000000,  2000000,  4600000,0.591,  98.3,false),
  muni('francisco-morazan-cedros',              'Cedros',               'Francisco Morazán','francisco-morazan',  21400,   22000000,  5500000, 11200000,0.609, 214.6,false),
  muni('francisco-morazan-curaren',             'Curarén',              'Francisco Morazán','francisco-morazan',  14800,   15000000,  3600000,  7800000,0.598, 186.4,false),
  muni('francisco-morazan-el-porvenir',         'El Porvenir',          'Francisco Morazán','francisco-morazan',  12400,   13000000,  3000000,  6600000,0.601, 142.8,false),
  muni('francisco-morazan-el-rosario-fm',       'El Rosario',           'Francisco Morazán','francisco-morazan',   9600,   10000000,  2400000,  5200000,0.589,  96.4,false),
  muni('francisco-morazan-guaimaca',            'Guaimaca',             'Francisco Morazán','francisco-morazan',  28400,   32000000,  8000000, 16200000,0.618, 312.4,false),
  muni('francisco-morazan-la-libertad-fm',      'La Libertad',          'Francisco Morazán','francisco-morazan',   8200,    9000000,  2100000,  4600000,0.588, 124.8,false),
  muni('francisco-morazan-la-venta',            'La Venta',             'Francisco Morazán','francisco-morazan',   4800,    6000000,  1400000,  3200000,0.574,  74.6,false),
  muni('francisco-morazan-lepaterique',         'Lepaterique',          'Francisco Morazán','francisco-morazan',  14600,   15000000,  3500000,  7800000,0.597, 148.2,false),
  muni('francisco-morazan-maraita',             'Maraita',              'Francisco Morazán','francisco-morazan',   5400,    6000000,  1300000,  3200000,0.577,  82.4,false),
  muni('francisco-morazan-marale',              'Marale',               'Francisco Morazán','francisco-morazan',   8400,    9000000,  2000000,  4700000,0.581, 198.4,false),
  muni('francisco-morazan-nueva-armenia',       'Nueva Armenia',        'Francisco Morazán','francisco-morazan',   6200,    7000000,  1600000,  3700000,0.579,  86.3,false),
  muni('francisco-morazan-ojojona',             'Ojojona',              'Francisco Morazán','francisco-morazan',  16400,   18000000,  4400000,  9200000,0.608, 186.4,false),
  muni('francisco-morazan-orica',               'Orica',                'Francisco Morazán','francisco-morazan',  12800,   14000000,  3200000,  7200000,0.596, 214.8,false),
  muni('francisco-morazan-reitoca',             'Reitoca',              'Francisco Morazán','francisco-morazan',  11200,   12000000,  2800000,  6200000,0.584, 142.6,false),
  muni('francisco-morazan-sabanagrande',        'Sabanagrande',         'Francisco Morazán','francisco-morazan',  21800,   24000000,  6000000, 12200000,0.614, 248.4,false),
  muni('francisco-morazan-san-ana',             'San Ana',              'Francisco Morazán','francisco-morazan',   6800,    8000000,  1800000,  4200000,0.580,  76.4,false),
  muni('francisco-morazan-san-buenaventura',    'San Buenaventura',     'Francisco Morazán','francisco-morazan',   4200,    5000000,  1100000,  2700000,0.571,  68.2,false),
  muni('francisco-morazan-san-ignacio',         'San Ignacio',          'Francisco Morazán','francisco-morazan',   6400,    7000000,  1600000,  3700000,0.579,  84.6,false),
  muni('francisco-morazan-san-miguelito',       'San Miguelito',        'Francisco Morazán','francisco-morazan',   8800,   10000000,  2300000,  5200000,0.585, 112.4,false),
  muni('francisco-morazan-santa-ana',           'Santa Ana',            'Francisco Morazán','francisco-morazan',   5200,    6000000,  1300000,  3200000,0.575,  72.8,false),
  muni('francisco-morazan-tamara',              'Tamara',               'Francisco Morazán','francisco-morazan',  18400,   21000000,  5200000, 10800000,0.611, 198.4,false),
  muni('francisco-morazan-tegucigalpita',       'Tegucigalpita',        'Francisco Morazán','francisco-morazan',   3800,    5000000,  1100000,  2700000,0.568,  62.4,false),

  // ── Cortés – 12 ──────────────────────────────────────────────────────────
  muni('cortes-san-pedro-sula',              'San Pedro Sula',       'Cortés','cortes', 912000,1200000000,528000000,398000000,0.714, 874.5,true),
  muni('cortes-choloma',                     'Choloma',              'Cortés','cortes', 218400,  185000000, 68000000, 82000000,0.638, 387.2,false),
  muni('cortes-la-lima',                     'La Lima',              'Cortés','cortes',  94800,   82000000, 28000000, 38000000,0.631,  58.4,false),
  muni('cortes-villanueva',                  'Villanueva',           'Cortés','cortes',  78300,   68000000, 22000000, 32000000,0.624, 246.8,false),
  muni('cortes-puerto-cortes',               'Puerto Cortés',        'Cortés','cortes',  68400,   72000000, 24000000, 32000000,0.641, 196.4,false),
  muni('cortes-omoa',                        'Omoa',                 'Cortés','cortes',  28400,   28000000,  8000000, 14200000,0.614, 312.8,false),
  muni('cortes-pimienta',                    'Pimienta',             'Cortés','cortes',  22400,   22000000,  6000000, 11200000,0.608, 148.6,false),
  muni('cortes-potrerillos',                 'Potrerillos',          'Cortés','cortes',  18400,   18000000,  4800000,  9200000,0.601, 124.8,false),
  muni('cortes-san-antonio-de-cortes',       'San Antonio de Cortés','Cortés','cortes',  12400,   13000000,  3200000,  6800000,0.591,  98.4,false),
  muni('cortes-san-francisco-de-yojoa',      'San Francisco de Yojoa','Cortés','cortes', 14800,   15000000,  3800000,  7800000,0.598, 142.6,false),
  muni('cortes-santa-cruz-de-yojoa',         'Santa Cruz de Yojoa',  'Cortés','cortes',  24400,   24000000,  6400000, 12200000,0.604, 186.4,false),
  muni('cortes-san-manuel',                  'San Manuel',           'Cortés','cortes',  16800,   17000000,  4200000,  8700000,0.597, 148.4,false),

  // ── Atlántida – 8 ────────────────────────────────────────────────────────
  muni('atlantida-la-ceiba',       'La Ceiba',    'Atlántida','atlantida', 180450, 285000000, 98000000,118000000,0.667, 618.3,true),
  muni('atlantida-el-porvenir',    'El Porvenir', 'Atlántida','atlantida',  62400,  52000000, 14000000, 26000000,0.623, 231.4,false),
  muni('atlantida-esparta',        'Esparta',     'Atlántida','atlantida',  28200,  30000000,  6800000, 15200000,0.611, 312.5,false),
  muni('atlantida-jutiapa',        'Jutiapa',     'Atlántida','atlantida',  38600,  34000000,  8000000, 17000000,0.608, 178.9,false),
  muni('atlantida-la-masica',      'La Masica',   'Atlántida','atlantida',  38400,  36000000,  7800000, 18200000,0.604, 524.8,false),
  muni('atlantida-san-francisco',  'San Francisco','Atlántida','atlantida', 14200,  16000000,  3200000,  8500000,0.598,  94.8,false),
  muni('atlantida-tela',           'Tela',        'Atlántida','atlantida',  88700,  78000000, 24000000, 36000000,0.634, 542.6,false),
  muni('atlantida-arizona',        'Arizona',     'Atlántida','atlantida',  16800,  18000000,  3600000,  9400000,0.596, 142.3,false),

  // ── Santa Bárbara – 28 ───────────────────────────────────────────────────
  muni('santa-barbara-santa-barbara',          'Santa Bárbara',         'Santa Bárbara','santa-barbara', 38200, 42000000,  9800000, 21000000,0.608, 312.6,true),
  muni('santa-barbara-naranjito',              'Naranjito',             'Santa Bárbara','santa-barbara', 22400, 24000000,  5400000, 12000000,0.601, 143.5,false),
  muni('santa-barbara-san-marcos',             'San Marcos',            'Santa Bárbara','santa-barbara', 19600, 21000000,  4600000, 10500000,0.597, 124.8,false),
  muni('santa-barbara-petoa',                  'Petoa',                 'Santa Bárbara','santa-barbara', 11800, 13000000,  2800000,  6800000,0.589,  87.3,false),
  muni('santa-barbara-trinidad',               'Trinidad',              'Santa Bárbara','santa-barbara',  8900, 10000000,  2100000,  5300000,0.582,  68.2,false),
  muni('santa-barbara-arada',                  'Arada',                 'Santa Bárbara','santa-barbara',  9400, 10000000,  2200000,  5200000,0.581,  72.4,false),
  muni('santa-barbara-atima',                  'Atima',                 'Santa Bárbara','santa-barbara', 10800, 12000000,  2700000,  6200000,0.586,  98.6,false),
  muni('santa-barbara-azacualpa',              'Azacualpa',             'Santa Bárbara','santa-barbara',  7600,  8000000,  1700000,  4200000,0.576,  68.4,false),
  muni('santa-barbara-ceguaca',                'Ceguaca',               'Santa Bárbara','santa-barbara',  6200,  7000000,  1500000,  3700000,0.572,  54.8,false),
  muni('santa-barbara-chinda',                 'Chinda',                'Santa Bárbara','santa-barbara',  8400,  9000000,  1900000,  4700000,0.578,  76.4,false),
  muni('santa-barbara-concepcion-del-norte',   'Concepción del Norte',  'Santa Bárbara','santa-barbara',  7200,  8000000,  1700000,  4200000,0.575,  82.6,false),
  muni('santa-barbara-concepcion-del-sur',     'Concepción del Sur',    'Santa Bárbara','santa-barbara',  6400,  7000000,  1500000,  3700000,0.571,  68.4,false),
  muni('santa-barbara-el-nispero',             'El Níspero',            'Santa Bárbara','santa-barbara', 14600, 16000000,  3600000,  8200000,0.593, 124.8,false),
  muni('santa-barbara-gualala',                'Gualala',               'Santa Bárbara','santa-barbara',  5800,  7000000,  1500000,  3700000,0.570,  58.4,false),
  muni('santa-barbara-ilama',                  'Ilama',                 'Santa Bárbara','santa-barbara',  9200, 10000000,  2200000,  5200000,0.579,  86.4,false),
  muni('santa-barbara-las-vegas',              'Las Vegas',             'Santa Bárbara','santa-barbara', 24400, 26000000,  6200000, 13200000,0.606, 198.4,false),
  muni('santa-barbara-macuelizo',              'Macuelizo',             'Santa Bárbara','santa-barbara',  8800,  9000000,  2000000,  4700000,0.576,  72.8,false),
  muni('santa-barbara-nueva-frontera',         'Nueva Frontera',        'Santa Bárbara','santa-barbara',  6200,  7000000,  1500000,  3700000,0.572,  68.2,false),
  muni('santa-barbara-proteccion',             'Protección',            'Santa Bárbara','santa-barbara',  7400,  8000000,  1700000,  4200000,0.574,  74.6,false),
  muni('santa-barbara-quimistan',              'Quimistán',             'Santa Bárbara','santa-barbara', 22400, 24000000,  5600000, 12200000,0.604, 248.4,false),
  muni('santa-barbara-san-francisco-de-ojuera','San Francisco de Ojuera','Santa Bárbara','santa-barbara', 7800,  8000000,  1700000,  4300000,0.573,  76.4,false),
  muni('santa-barbara-san-jose-de-colinas',    'San José de Colinas',   'Santa Bárbara','santa-barbara', 14200, 15000000,  3400000,  7800000,0.589, 142.6,false),
  muni('santa-barbara-san-luis',               'San Luis',              'Santa Bárbara','santa-barbara', 11400, 12000000,  2700000,  6300000,0.583, 104.8,false),
  muni('santa-barbara-san-nicolas',            'San Nicolás',           'Santa Bárbara','santa-barbara',  8400,  9000000,  1900000,  4800000,0.576,  72.4,false),
  muni('santa-barbara-san-pedro-zacapa',       'San Pedro Zacapa',      'Santa Bárbara','santa-barbara', 10200, 11000000,  2400000,  5800000,0.580,  94.6,false),
  muni('santa-barbara-santa-rita',             'Santa Rita',            'Santa Bárbara','santa-barbara', 12400, 13000000,  2900000,  6800000,0.584, 112.4,false),
  muni('santa-barbara-san-vicente-centenario', 'San Vicente Centenario','Santa Bárbara','santa-barbara',  5400,  6000000,  1300000,  3200000,0.568,  52.4,false),
  muni('santa-barbara-colinas',                'Colinas',               'Santa Bárbara','santa-barbara', 16800, 18000000,  4200000,  9200000,0.596, 148.6,false),

  // ── Yoro – 11 ────────────────────────────────────────────────────────────
  muni('yoro-yoro',        'Yoro',        'Yoro','yoro',  62400,  68000000, 16000000, 32000000,0.618, 498.7,true),
  muni('yoro-el-progreso', 'El Progreso', 'Yoro','yoro', 136800, 135000000, 46000000, 58000000,0.632, 378.4,false),
  muni('yoro-morazan',     'Morazán',     'Yoro','yoro',  28400,  28000000,  6200000, 14000000,0.604, 213.6,false),
  muni('yoro-olanchito',   'Olanchito',   'Yoro','yoro',  64200,  58000000, 13000000, 28000000,0.611, 612.3,false),
  muni('yoro-victoria',    'Victoria',    'Yoro','yoro',  14600,  15000000,  3100000,  7800000,0.594, 102.8,false),
  muni('yoro-arenal',      'Arenal',      'Yoro','yoro',  12400,  13000000,  2900000,  6700000,0.590, 124.6,false),
  muni('yoro-el-negrito',  'El Negrito',  'Yoro','yoro',  38400,  36000000,  8400000, 18200000,0.609, 312.4,false),
  muni('yoro-jocon',       'Jocón',       'Yoro','yoro',  14200,  14000000,  3100000,  7200000,0.591, 148.6,false),
  muni('yoro-santa-rita',  'Santa Rita',  'Yoro','yoro',  18600,  19000000,  4300000,  9700000,0.600, 186.4,false),
  muni('yoro-sulaco',      'Sulaco',      'Yoro','yoro',  12800,  13000000,  2900000,  6700000,0.588, 162.8,false),
  muni('yoro-yorito',      'Yorito',      'Yoro','yoro',  14400,  14000000,  3100000,  7300000,0.589, 198.4,false),

  // ── Olancho – 23 ─────────────────────────────────────────────────────────
  muni('olancho-juticalpa',                'Juticalpa',              'Olancho','olancho',  82300,  95000000, 28000000, 42000000,0.628,  824.5,true),
  muni('olancho-catacamas',                'Catacamas',              'Olancho','olancho',  68400,  72000000, 18000000, 32000000,0.615, 1843.2,false),
  muni('olancho-campamento',               'Campamento',             'Olancho','olancho',  22100,  22000000,  4800000, 11000000,0.596,  412.6,false),
  muni('olancho-san-francisco-de-la-paz',  'San Francisco de la Paz','Olancho','olancho',  18600,  18000000,  3900000,  9200000,0.590,  318.4,false),
  muni('olancho-concordia',                'Concordia',              'Olancho','olancho',   9200,   9000000,  1900000,  4700000,0.574,  248.6,false),
  muni('olancho-dulce-nombre-de-culmi',    'Dulce Nombre de Culmí',  'Olancho','olancho',  14800,  14000000,  2900000,  7300000,0.568, 1242.8,false),
  muni('olancho-el-rosario-ol',            'El Rosario',             'Olancho','olancho',   8400,   9000000,  1900000,  4700000,0.573,  198.4,false),
  muni('olancho-esquipulas-del-norte',     'Esquipulas del Norte',   'Olancho','olancho',   7200,   8000000,  1700000,  4200000,0.571,  214.6,false),
  muni('olancho-gualaco',                  'Gualaco',                'Olancho','olancho',  11400,  11000000,  2300000,  5800000,0.576,  312.8,false),
  muni('olancho-guarizama',                'Guarizama',              'Olancho','olancho',   9800,  10000000,  2100000,  5200000,0.572,  248.4,false),
  muni('olancho-guata',                    'Guata',                  'Olancho','olancho',   7600,   8000000,  1700000,  4200000,0.569,  198.6,false),
  muni('olancho-jano-ol',                  'Jano',                   'Olancho','olancho',   6400,   7000000,  1500000,  3700000,0.566,  186.4,false),
  muni('olancho-jutiquile',                'Jutiquile',              'Olancho','olancho',   8200,   8000000,  1700000,  4200000,0.568,  214.8,false),
  muni('olancho-la-union',                 'La Unión',               'Olancho','olancho',   9400,  10000000,  2100000,  5200000,0.571,  312.4,false),
  muni('olancho-mangulile',                'Mangulile',              'Olancho','olancho',   6800,   7000000,  1500000,  3700000,0.566,  198.8,false),
  muni('olancho-manto',                    'Manto',                  'Olancho','olancho',  10400,  11000000,  2300000,  5800000,0.575,  248.4,false),
  muni('olancho-salama',                   'Salamá',                 'Olancho','olancho',   8600,   9000000,  1900000,  4700000,0.570,  214.6,false),
  muni('olancho-san-esteban',              'San Esteban',            'Olancho','olancho',  12400,  12000000,  2600000,  6200000,0.577,  312.8,false),
  muni('olancho-san-francisco-de-becerra', 'San Francisco de Becerra','Olancho','olancho',  7800,   8000000,  1700000,  4200000,0.569,  198.4,false),
  muni('olancho-santa-maria-del-real',     'Santa María del Real',   'Olancho','olancho',   9200,  10000000,  2100000,  5200000,0.572,  312.6,false),
  muni('olancho-silca',                    'Silca',                  'Olancho','olancho',   5800,   6000000,  1300000,  3200000,0.562,  148.4,false),
  muni('olancho-yocon',                    'Yocón',                  'Olancho','olancho',   7400,   8000000,  1700000,  4200000,0.567,  198.6,false),
  muni('olancho-patuca',                   'Patuca',                 'Olancho','olancho',  12800,  12000000,  2400000,  6200000,0.559, 2184.6,false),

  // ── El Paraíso – 19 ──────────────────────────────────────────────────────
  muni('el-paraiso-yuscarán',              'Yuscarán',             'El Paraíso','el-paraiso',  11200,  13000000,  2800000,  6800000,0.604,  198.7,true),
  muni('el-paraiso-danli',                 'Danlí',                'El Paraíso','el-paraiso',  98400,  96000000, 28000000, 44000000,0.631,  786.4,false),
  muni('el-paraiso-el-paraiso',            'El Paraíso',           'El Paraíso','el-paraiso',  48200,  48000000, 12000000, 22000000,0.614,  432.8,false),
  muni('el-paraiso-teupasenti',            'Teupasenti',           'El Paraíso','el-paraiso',  28600,  28000000,  6200000, 13800000,0.601,  287.3,false),
  muni('el-paraiso-jalapa',                'Jalapa',               'El Paraíso','el-paraiso',  18400,  18000000,  3800000,  9000000,0.593,  186.9,false),
  muni('el-paraiso-alauca',                'Alauca',               'El Paraíso','el-paraiso',   9200,  10000000,  2100000,  5200000,0.578,  124.6,false),
  muni('el-paraiso-guinope',               'Güinope',              'El Paraíso','el-paraiso',   8400,   9000000,  1900000,  4700000,0.574,  114.8,false),
  muni('el-paraiso-jacaleapa',             'Jacaleapa',            'El Paraíso','el-paraiso',   7600,   8000000,  1700000,  4200000,0.570,   98.4,false),
  muni('el-paraiso-jano-ep',               'Jano',                 'El Paraíso','el-paraiso',   5800,   6000000,  1300000,  3200000,0.562,   86.4,false),
  muni('el-paraiso-liure',                 'Liure',                'El Paraíso','el-paraiso',   8200,   9000000,  1900000,  4700000,0.572,  112.6,false),
  muni('el-paraiso-moroceli',              'Morocelí',             'El Paraíso','el-paraiso',  12400,  13000000,  2900000,  6700000,0.583,  148.4,false),
  muni('el-paraiso-oropoli',               'Oropolí',              'El Paraíso','el-paraiso',   6800,   7000000,  1500000,  3700000,0.566,   98.6,false),
  muni('el-paraiso-potrerillos-ep',        'Potrerillos',          'El Paraíso','el-paraiso',   9800,  10000000,  2100000,  5200000,0.574,  124.8,false),
  muni('el-paraiso-san-antonio-de-flores', 'San Antonio de Flores','El Paraíso','el-paraiso',   7200,   8000000,  1700000,  4200000,0.567,   98.4,false),
  muni('el-paraiso-san-lucas',             'San Lucas',            'El Paraíso','el-paraiso',   6400,   7000000,  1500000,  3700000,0.563,   86.4,false),
  muni('el-paraiso-san-matias',            'San Matías',           'El Paraíso','el-paraiso',   5400,   6000000,  1300000,  3200000,0.558,   74.8,false),
  muni('el-paraiso-soledad',               'Soledad',              'El Paraíso','el-paraiso',   8600,   9000000,  1900000,  4700000,0.570,  112.4,false),
  muni('el-paraiso-texiguat',              'Texíguat',             'El Paraíso','el-paraiso',   9400,  10000000,  2100000,  5200000,0.573,  124.6,false),
  muni('el-paraiso-trojes',                'Trojes',               'El Paraíso','el-paraiso',  12800,  13000000,  2800000,  6800000,0.579,  148.4,false),

  // ── Choluteca – 16 ───────────────────────────────────────────────────────
  muni('choluteca-choluteca',             'Choluteca',            'Choluteca','choluteca', 142300, 120000000, 42000000, 52000000,0.619, 1618.4,true),
  muni('choluteca-marcovia',              'Marcovia',             'Choluteca','choluteca',  48200,  42000000, 10000000, 20000000,0.601,  312.6,false),
  muni('choluteca-el-triunfo',            'El Triunfo',           'Choluteca','choluteca',  28600,  28000000,  6000000, 13800000,0.594,  214.8,false),
  muni('choluteca-san-marcos-de-colon',   'San Marcos de Colón',  'Choluteca','choluteca',  22400,  21000000,  4600000, 10400000,0.588,  368.2,false),
  muni('choluteca-apacilagua',            'Apacilagua',           'Choluteca','choluteca',   7400,   8000000,  1700000,  4200000,0.571,  124.8,false),
  muni('choluteca-concepcion-de-maria',   'Concepción de María',  'Choluteca','choluteca',  12400,  12000000,  2600000,  6200000,0.578,  148.6,false),
  muni('choluteca-duyure',                'Duyure',               'Choluteca','choluteca',   6200,   7000000,  1500000,  3700000,0.567,   98.4,false),
  muni('choluteca-el-corpus',             'El Corpus',            'Choluteca','choluteca',  14800,  14000000,  3000000,  7200000,0.579,  312.8,false),
  muni('choluteca-morolica',              'Morolica',             'Choluteca','choluteca',   8200,   9000000,  1900000,  4700000,0.572,  148.4,false),
  muni('choluteca-namasigue',             'Namasigüe',            'Choluteca','choluteca',  18400,  18000000,  3900000,  9200000,0.581,  312.6,false),
  muni('choluteca-orocuina',              'Orocuina',             'Choluteca','choluteca',  14200,  14000000,  3000000,  7200000,0.577,  248.4,false),
  muni('choluteca-pespire',               'Pespire',              'Choluteca','choluteca',  16400,  16000000,  3400000,  8200000,0.579,  312.8,false),
  muni('choluteca-san-antonio-de-flores-ch','San Antonio de Flores','Choluteca','choluteca', 7600,   8000000,  1700000,  4200000,0.569,   98.4,false),
  muni('choluteca-san-isidro',            'San Isidro',           'Choluteca','choluteca',   9200,  10000000,  2100000,  5200000,0.574,  124.6,false),
  muni('choluteca-san-jose',              'San José',             'Choluteca','choluteca',  11400,  12000000,  2600000,  6200000,0.577,  148.4,false),
  muni('choluteca-santa-ana-de-yusguare', 'Santa Ana de Yusguare','Choluteca','choluteca',   8800,   9000000,  1900000,  4800000,0.572,  114.6,false),

  // ── Copán – 23 ───────────────────────────────────────────────────────────
  muni('copan-santa-rosa-de-copan','Santa Rosa de Copán','Copán','copan',  76800,  88000000, 26000000, 38000000,0.632, 412.4,true),
  muni('copan-copan-ruinas',       'Copán Ruinas',       'Copán','copan',  38200,  42000000, 12000000, 19000000,0.628, 378.6,false),
  muni('copan-la-entrada',         'La Entrada',         'Copán','copan',  48600,  48000000, 14000000, 22000000,0.618, 214.8,false),
  muni('copan-san-pedro',          'San Pedro',          'Copán','copan',  18400,  18000000,  4000000,  9000000,0.601, 142.6,false),
  muni('copan-cabanas',            'Cabañas',            'Copán','copan',   8200,   9000000,  1900000,  4700000,0.577, 124.8,false),
  muni('copan-concepcion',         'Concepción',         'Copán','copan',   6400,   7000000,  1500000,  3700000,0.571,  98.4,false),
  muni('copan-corquin',            'Corquín',            'Copán','copan',  12400,  13000000,  2900000,  6700000,0.581, 148.6,false),
  muni('copan-cucuyagua',          'Cucuyagua',          'Copán','copan',  14800,  15000000,  3400000,  7800000,0.584, 186.4,false),
  muni('copan-dolores',            'Dolores',            'Copán','copan',   7600,   8000000,  1700000,  4200000,0.569, 112.6,false),
  muni('copan-dulce-nombre-de-copan','Dulce Nombre de Copán','Copán','copan', 9200, 10000000, 2200000, 5200000,0.576, 124.8,false),
  muni('copan-el-paraiso-cp',      'El Paraíso',         'Copán','copan',   8400,   9000000,  1900000,  4700000,0.573,  98.4,false),
  muni('copan-florida',            'Florida',            'Copán','copan',  22400,  24000000,  5600000, 12200000,0.602, 214.8,false),
  muni('copan-la-jigua',           'La Jigua',           'Copán','copan',   6800,   7000000,  1500000,  3700000,0.566,  86.4,false),
  muni('copan-la-union-cp',        'La Unión',           'Copán','copan',   9400,  10000000,  2200000,  5200000,0.574, 124.6,false),
  muni('copan-nueva-arcadia',      'Nueva Arcadia',      'Copán','copan',  18400,  19000000,  4300000,  9700000,0.596, 198.4,false),
  muni('copan-san-agustin',        'San Agustín',        'Copán','copan',   7200,   8000000,  1700000,  4200000,0.568,  98.6,false),
  muni('copan-san-antonio',        'San Antonio',        'Copán','copan',  11400,  12000000,  2700000,  6200000,0.579, 148.4,false),
  muni('copan-san-jeronimo',       'San Jerónimo',       'Copán','copan',   8800,   9000000,  1900000,  4800000,0.573, 112.4,false),
  muni('copan-san-jose-cp',        'San José',           'Copán','copan',   7400,   8000000,  1700000,  4200000,0.568,  98.4,false),
  muni('copan-san-juan-de-opoa',   'San Juan de Opoa',   'Copán','copan',   9800,  10000000,  2200000,  5200000,0.576, 124.8,false),
  muni('copan-san-nicolas',        'San Nicolás',        'Copán','copan',   8200,   9000000,  1900000,  4700000,0.571, 112.6,false),
  muni('copan-santa-rita',         'Santa Rita',         'Copán','copan',  14200,  15000000,  3400000,  7800000,0.586, 162.4,false),
  muni('copan-veracruz',           'Veracruz',           'Copán','copan',   7600,   8000000,  1700000,  4200000,0.567,  98.4,false),

  // ── La Paz – 19 ──────────────────────────────────────────────────────────
  muni('la-paz-la-paz',               'La Paz',              'La Paz','la-paz',  42800,  48000000, 12000000, 22000000,0.614, 312.6,true),
  muni('la-paz-marcala',              'Marcala',             'La Paz','la-paz',  28400,  30000000,  7200000, 14800000,0.608, 248.4,false),
  muni('la-paz-aguanqueterique',      'Aguanqueterique',     'La Paz','la-paz',   8600,   9000000,  1900000,  4800000,0.581,  98.3,false),
  muni('la-paz-cane',                 'Cane',                'La Paz','la-paz',   6200,   7000000,  1400000,  3800000,0.574,  78.6,false),
  muni('la-paz-cabanas-lp',           'Cabañas',             'La Paz','la-paz',   7400,   8000000,  1700000,  4200000,0.571,  98.4,false),
  muni('la-paz-chinacla',             'Chinacla',            'La Paz','la-paz',   9200,  10000000,  2100000,  5200000,0.576, 124.8,false),
  muni('la-paz-guajiquiro',           'Guajiquiro',          'La Paz','la-paz',  12400,  13000000,  2900000,  6700000,0.581, 186.4,false),
  muni('la-paz-lauterique',           'Lauterique',          'La Paz','la-paz',   5600,   6000000,  1300000,  3200000,0.566,  68.4,false),
  muni('la-paz-mercedes-de-oriente',  'Mercedes de Oriente', 'La Paz','la-paz',   6800,   7000000,  1500000,  3700000,0.568,  82.6,false),
  muni('la-paz-opatoro',              'Opatoro',             'La Paz','la-paz',  10400,  11000000,  2300000,  5800000,0.576, 142.8,false),
  muni('la-paz-san-antonio-del-norte','San Antonio del Norte','La Paz','la-paz',  7600,   8000000,  1700000,  4200000,0.570,  94.6,false),
  muni('la-paz-san-jose-lp',          'San José',            'La Paz','la-paz',   9800,  10000000,  2200000,  5200000,0.574, 124.8,false),
  muni('la-paz-san-juan-lp',          'San Juan',            'La Paz','la-paz',   8400,   9000000,  1900000,  4700000,0.572, 112.6,false),
  muni('la-paz-san-pedro-de-tutule',  'San Pedro de Tutule', 'La Paz','la-paz',  11200,  12000000,  2700000,  6200000,0.578, 148.4,false),
  muni('la-paz-santa-ana-lp',         'Santa Ana',           'La Paz','la-paz',   6400,   7000000,  1500000,  3700000,0.567,  82.4,false),
  muni('la-paz-santa-elena',          'Santa Elena',         'La Paz','la-paz',   7800,   8000000,  1700000,  4200000,0.570,  98.4,false),
  muni('la-paz-santa-maria',          'Santa María',         'La Paz','la-paz',   8600,   9000000,  1900000,  4800000,0.572, 112.8,false),
  muni('la-paz-santiago-de-puringla', 'Santiago de Puringla','La Paz','la-paz',  11400,  12000000,  2700000,  6200000,0.579, 148.6,false),
  muni('la-paz-yarula',               'Yarula',              'La Paz','la-paz',   6200,   7000000,  1500000,  3700000,0.565,  78.4,false),

  // ── Intibucá – 17 ────────────────────────────────────────────────────────
  muni('intibuca-la-esperanza',              'La Esperanza',          'Intibucá','intibuca',  28400,  32000000,  8200000, 15400000,0.612, 142.8,true),
  muni('intibuca-intibuca',                  'Intibucá',              'Intibucá','intibuca',  14800,  16000000,  3600000,  8200000,0.598, 428.6,false),
  muni('intibuca-jesus-de-otoro',            'Jesús de Otoro',        'Intibucá','intibuca',  32600,  34000000,  8600000, 16200000,0.606, 286.4,false),
  muni('intibuca-masaguara',                 'Masaguara',             'Intibucá','intibuca',  18200,  18000000,  4200000,  9000000,0.593, 198.7,false),
  muni('intibuca-camasca',                   'Camasca',               'Intibucá','intibuca',   8400,   9000000,  1900000,  4700000,0.571, 148.4,false),
  muni('intibuca-colomoncagua',              'Colomoncagua',          'Intibucá','intibuca',  12800,  13000000,  2900000,  6700000,0.578, 198.6,false),
  muni('intibuca-concepcion-ib',             'Concepción',            'Intibucá','intibuca',   7200,   8000000,  1700000,  4200000,0.568,  98.4,false),
  muni('intibuca-dolores-ib',                'Dolores',               'Intibucá','intibuca',   6800,   7000000,  1500000,  3700000,0.564,  86.4,false),
  muni('intibuca-la-iguala',                 'La Iguala',             'Intibucá','intibuca',  11200,  12000000,  2700000,  6200000,0.577, 148.6,false),
  muni('intibuca-magdalena',                 'Magdalena',             'Intibucá','intibuca',   6200,   7000000,  1500000,  3700000,0.563,  78.4,false),
  muni('intibuca-san-antonio-ib',            'San Antonio',           'Intibucá','intibuca',   9400,  10000000,  2200000,  5200000,0.574, 124.8,false),
  muni('intibuca-san-francisco-de-opalaca',  'San Francisco de Opalaca','Intibucá','intibuca', 7600,   8000000,  1700000,  4200000,0.567, 112.4,false),
  muni('intibuca-san-isidro-ib',             'San Isidro',            'Intibucá','intibuca',   8200,   9000000,  1900000,  4700000,0.569, 112.6,false),
  muni('intibuca-san-juan-ib',               'San Juan',              'Intibucá','intibuca',   7400,   8000000,  1700000,  4200000,0.566,  96.4,false),
  muni('intibuca-san-marco',                 'San Marco',             'Intibucá','intibuca',   9800,  10000000,  2200000,  5200000,0.573, 128.4,false),
  muni('intibuca-san-miguelito-ib',          'San Miguelito',         'Intibucá','intibuca',   8600,   9000000,  1900000,  4800000,0.570, 112.8,false),
  muni('intibuca-yamaranguila',              'Yamaranguila',          'Intibucá','intibuca',  14400,  15000000,  3400000,  7800000,0.583, 186.4,false),

  // ── Lempira – 28 ─────────────────────────────────────────────────────────
  muni('lempira-gracias',             'Gracias',              'Lempira','lempira',  28400,  32000000,  7800000, 15200000,0.601, 386.4,true),
  muni('lempira-la-campa',            'La Campa',             'Lempira','lempira',   6800,   7000000,  1400000,  3700000,0.571,  98.4,false),
  muni('lempira-san-marcos-de-caiquin','San Marcos de Caiquín','Lempira','lempira',  8200,   8000000,  1600000,  4200000,0.574, 112.6,false),
  muni('lempira-erandique',           'Erandique',            'Lempira','lempira',  14600,  14000000,  2800000,  7200000,0.581, 248.9,false),
  muni('lempira-belen',               'Belén',                'Lempira','lempira',   6400,   7000000,  1400000,  3700000,0.566,  84.8,false),
  muni('lempira-candelaria',          'Candelaria',           'Lempira','lempira',   7200,   8000000,  1600000,  4200000,0.569,  98.4,false),
  muni('lempira-cololaca',            'Cololaca',             'Lempira','lempira',   5800,   6000000,  1200000,  3200000,0.561,  74.8,false),
  muni('lempira-gualcince',           'Gualcince',            'Lempira','lempira',   8400,   9000000,  1800000,  4700000,0.571, 112.6,false),
  muni('lempira-guarita',             'Guarita',              'Lempira','lempira',   7600,   8000000,  1600000,  4200000,0.567,  98.4,false),
  muni('lempira-la-iguala-lp',        'La Iguala',            'Lempira','lempira',   9400,  10000000,  2000000,  5200000,0.573, 128.4,false),
  muni('lempira-las-flores',          'Las Flores',           'Lempira','lempira',   6200,   7000000,  1400000,  3700000,0.564,  78.4,false),
  muni('lempira-la-union-lp',         'La Unión',             'Lempira','lempira',   8800,   9000000,  1800000,  4800000,0.570, 112.4,false),
  muni('lempira-la-virtud',           'La Virtud',            'Lempira','lempira',   7400,   8000000,  1600000,  4200000,0.566,  96.8,false),
  muni('lempira-lepaera',             'Lepaera',              'Lempira','lempira',  18400,  18000000,  3800000,  9400000,0.582, 248.6,false),
  muni('lempira-mapulaca',            'Mapulaca',             'Lempira','lempira',   7200,   8000000,  1600000,  4200000,0.566,  98.4,false),
  muni('lempira-piraera',             'Piraera',              'Lempira','lempira',   9200,  10000000,  2000000,  5200000,0.572, 142.8,false),
  muni('lempira-san-andres',          'San Andrés',           'Lempira','lempira',   8600,   9000000,  1800000,  4700000,0.569, 112.4,false),
  muni('lempira-san-francisco-lp',    'San Francisco',        'Lempira','lempira',   7800,   8000000,  1600000,  4200000,0.567,  96.4,false),
  muni('lempira-san-juan-guarita',    'San Juan Guarita',     'Lempira','lempira',   6400,   7000000,  1400000,  3700000,0.562,  82.4,false),
  muni('lempira-san-manuel-colohete', 'San Manuel Colohete',  'Lempira','lempira',   9800,  10000000,  2000000,  5200000,0.573, 124.6,false),
  muni('lempira-san-rafael',          'San Rafael',           'Lempira','lempira',   7200,   8000000,  1600000,  4200000,0.566,  94.8,false),
  muni('lempira-san-sebastian-lp',    'San Sebastián',        'Lempira','lempira',   8400,   9000000,  1800000,  4700000,0.569, 112.6,false),
  muni('lempira-santa-cruz-lp',       'Santa Cruz',           'Lempira','lempira',   9600,  10000000,  2000000,  5300000,0.572, 128.4,false),
  muni('lempira-talgua',              'Talgua',               'Lempira','lempira',  10400,  11000000,  2200000,  5800000,0.575, 148.6,false),
  muni('lempira-tambla',              'Tambla',               'Lempira','lempira',   5600,   6000000,  1200000,  3200000,0.560,  74.4,false),
  muni('lempira-tomala',              'Tomala',               'Lempira','lempira',   7800,   8000000,  1600000,  4200000,0.566,  98.4,false),
  muni('lempira-valladolid',          'Valladolid',           'Lempira','lempira',   6400,   7000000,  1400000,  3700000,0.562,  82.6,false),
  muni('lempira-virginia',            'Virginia',             'Lempira','lempira',   5800,   6000000,  1200000,  3200000,0.558,  72.4,false),

  // ── Colón – 10 ───────────────────────────────────────────────────────────
  muni('colon-trujillo',           'Trujillo',           'Colón','colon',  42800,  48000000, 12000000, 22000000,0.609, 1642.8,true),
  muni('colon-tocoa',              'Tocoa',              'Colón','colon',  62400,  58000000, 15000000, 27000000,0.604,  912.4,false),
  muni('colon-bonito-oriental',    'Bonito Oriental',    'Colón','colon',  22400,  21000000,  4800000, 10400000,0.592,  312.8,false),
  muni('colon-saba',               'Sabá',               'Colón','colon',  28600,  26000000,  5800000, 12800000,0.597,  486.3,false),
  muni('colon-balfate',            'Balfate',            'Colón','colon',  12400,  12000000,  2600000,  6200000,0.574,  248.6,false),
  muni('colon-el-aguan',           'El Aguán',           'Colón','colon',   8600,   9000000,  1900000,  4700000,0.568,  198.4,false),
  muni('colon-iriona',             'Iriona',             'Colón','colon',  14800,  14000000,  2900000,  7300000,0.559, 2984.6,false),
  muni('colon-limon',              'Limón',              'Colón','colon',  18400,  17000000,  3700000,  8700000,0.573,  312.8,false),
  muni('colon-santa-fe-col',       'Santa Fe',           'Colón','colon',  11200,  11000000,  2400000,  5800000,0.571,  248.4,false),
  muni('colon-santa-rosa-de-aguan','Santa Rosa de Aguán','Colón','colon',   9400,  10000000,  2200000,  5200000,0.568,  198.6,false),

  // ── Ocotepeque – 16 ──────────────────────────────────────────────────────
  muni('ocotepeque-nueva-ocotepeque',      'Nueva Ocotepeque',     'Ocotepeque','ocotepeque',  18400,  22000000,  5600000, 11000000,0.614, 124.8,true),
  muni('ocotepeque-sinuapa',               'Sinuapa',              'Ocotepeque','ocotepeque',   8200,   9000000,  2000000,  4600000,0.590,  86.4,false),
  muni('ocotepeque-la-labor',              'La Labor',             'Ocotepeque','ocotepeque',   6400,   7000000,  1500000,  3600000,0.583,  62.8,false),
  muni('ocotepeque-mercedes',              'Mercedes',             'Ocotepeque','ocotepeque',   5200,   6000000,  1200000,  3100000,0.577,  54.3,false),
  muni('ocotepeque-belen-gualcho',         'Belén Gualcho',        'Ocotepeque','ocotepeque',  11400,  12000000,  2700000,  6200000,0.576, 124.8,false),
  muni('ocotepeque-concepcion-oc',         'Concepción',           'Ocotepeque','ocotepeque',   7600,   8000000,  1700000,  4200000,0.569,  78.4,false),
  muni('ocotepeque-dolores-merendon',      'Dolores Merendón',     'Ocotepeque','ocotepeque',   6200,   7000000,  1500000,  3700000,0.565,  68.4,false),
  muni('ocotepeque-fraternidad',           'Fraternidad',          'Ocotepeque','ocotepeque',   5400,   6000000,  1300000,  3200000,0.561,  54.8,false),
  muni('ocotepeque-la-encarnacion',        'La Encarnación',       'Ocotepeque','ocotepeque',   6800,   7000000,  1500000,  3700000,0.566,  72.4,false),
  muni('ocotepeque-lucerna',               'Lucerna',              'Ocotepeque','ocotepeque',   4800,   5000000,  1100000,  2700000,0.558,  48.6,false),
  muni('ocotepeque-san-fernando',          'San Fernando',         'Ocotepeque','ocotepeque',   5600,   6000000,  1300000,  3200000,0.561,  56.4,false),
  muni('ocotepeque-san-francisco-del-valle','San Francisco del Valle','Ocotepeque','ocotepeque', 7200,  8000000,  1700000,  4200000,0.567,  78.4,false),
  muni('ocotepeque-san-jorge',             'San Jorge',            'Ocotepeque','ocotepeque',   6400,   7000000,  1500000,  3700000,0.563,  68.4,false),
  muni('ocotepeque-san-marcos-oc',         'San Marcos',           'Ocotepeque','ocotepeque',   8400,   9000000,  1900000,  4700000,0.571,  86.4,false),
  muni('ocotepeque-santa-fe-oc',           'Santa Fe',             'Ocotepeque','ocotepeque',   7800,   8000000,  1700000,  4200000,0.567,  78.6,false),
  muni('ocotepeque-sensenti',              'Sensenti',             'Ocotepeque','ocotepeque',   9600,  10000000,  2200000,  5200000,0.574,  98.4,false),

  // ── Valle – 9 ────────────────────────────────────────────────────────────
  muni('valle-nacaome',              'Nacaome',             'Valle','valle',  64800,  72000000, 20000000, 32000000,0.621, 642.8,true),
  muni('valle-san-lorenzo',          'San Lorenzo',         'Valle','valle',  42400,  48000000, 14000000, 21000000,0.618, 312.6,false),
  muni('valle-langue',               'Langue',              'Valle','valle',  22400,  21000000,  4800000, 10400000,0.597, 214.8,false),
  muni('valle-amapala',              'Amapala',             'Valle','valle',   8600,   9000000,  2200000,  4600000,0.601,  42.8,false),
  muni('valle-alianza',              'Alianza',             'Valle','valle',  12400,  13000000,  3200000,  6700000,0.591, 124.6,false),
  muni('valle-aramecina',            'Aramecina',           'Valle','valle',   8800,   9000000,  2100000,  4700000,0.579,  98.4,false),
  muni('valle-caridad',              'Caridad',             'Valle','valle',   7200,   8000000,  1800000,  4200000,0.572,  82.6,false),
  muni('valle-goascoran',            'Goascorán',           'Valle','valle',  14800,  15000000,  3600000,  7800000,0.594, 148.4,false),
  muni('valle-san-francisco-de-coray','San Francisco de Coray','Valle','valle', 9400, 10000000, 2400000, 5200000,0.580, 112.8,false),

  // ── Islas de la Bahía – 4 ────────────────────────────────────────────────
  muni('islas-de-la-bahia-roatan',               'Roatán',                'Islas de la Bahía','islas-de-la-bahia',  28400,  48000000, 22000000, 16000000,0.686, 127.8,true),
  muni('islas-de-la-bahia-guanaja',              'Guanaja',               'Islas de la Bahía','islas-de-la-bahia',   6800,  14000000,  5800000,  5200000,0.672,  56.2,false),
  muni('islas-de-la-bahia-utila',                'Utila',                 'Islas de la Bahía','islas-de-la-bahia',   4200,  10000000,  4600000,  3400000,0.669,  41.5,false),
  muni('islas-de-la-bahia-jose-santos-guardiola','José Santos Guardiola', 'Islas de la Bahía','islas-de-la-bahia',  12400,  18000000,  7200000,  6800000,0.661,  98.4,false),

  // ── Gracias a Dios – 6 ───────────────────────────────────────────────────
  muni('gracias-a-dios-puerto-lempira',        'Puerto Lempira',        'Gracias a Dios','gracias-a-dios',  22400,  28000000,  5200000, 14800000,0.524, 2289.4,true),
  muni('gracias-a-dios-brus-laguna',           'Brus Laguna',           'Gracias a Dios','gracias-a-dios',  14800,  16000000,  2800000,  8800000,0.512, 3642.8,false),
  muni('gracias-a-dios-wampusirpi',            'Wampusirpi',            'Gracias a Dios','gracias-a-dios',   8600,   9000000,  1400000,  5200000,0.498, 2184.6,false),
  muni('gracias-a-dios-ahuas',                 'Ahuas',                 'Gracias a Dios','gracias-a-dios',  12400,  13000000,  2100000,  7400000,0.506, 1842.4,false),
  muni('gracias-a-dios-juan-francisco-bulnes', 'Juan Francisco Bulnes', 'Gracias a Dios','gracias-a-dios',   9200,  10000000,  1600000,  5800000,0.497, 2148.6,false),
  muni('gracias-a-dios-ramon-villeda-morales', 'Ramón Villeda Morales', 'Gracias a Dios','gracias-a-dios',   8400,   9000000,  1400000,  5200000,0.493, 1984.8,false),
];

// ── Flat array of all municipalities ────────────────────────────────────────

export const MUNICIPIOS = [...COMAYAGUA_MUNIS, ...OTRAS_MUNIS];

// ── Department aggregates ─────────────────────────────────────────────────────

function aggregateDept(id, nombre, capital, topoNombre) {
  const munis         = MUNICIPIOS.filter((m) => m.departamentoId === id);
  const presupuesto   = munis.reduce((s, m) => s + m.presupuesto, 0);
  const ingresosPropios = munis.reduce((s, m) => s + m.ingresosPropios, 0);
  const transferencia = munis.reduce((s, m) => s + m.transferencia, 0);
  const poblacion     = munis.reduce((s, m) => s + m.poblacion, 0);
  const autonomia     = presupuesto > 0 ? (ingresosPropios / presupuesto) * 100 : 0;
  return { id, nombre, capital, topoNombre: topoNombre || nombre, presupuesto, ingresosPropios, transferencia, poblacion, autonomia, muniCount: munis.length, municipios: munis };
}

export const DEPARTAMENTOS = [
  aggregateDept('francisco-morazan', 'Francisco Morazán', 'Tegucigalpa',        'Francisco Morazán'),
  aggregateDept('cortes',            'Cortés',            'San Pedro Sula',     'Cortés'),
  aggregateDept('atlantida',         'Atlántida',         'La Ceiba',           'Atlántida'),
  aggregateDept('comayagua',         'Comayagua',         'Comayagua',          'Comayagua'),
  aggregateDept('santa-barbara',     'Santa Bárbara',     'Santa Bárbara',      'Santa Bárbara'),
  aggregateDept('yoro',              'Yoro',              'Yoro',               'Yoro'),
  aggregateDept('olancho',           'Olancho',           'Juticalpa',          'Olancho'),
  aggregateDept('el-paraiso',        'El Paraíso',        'Yuscarán',           'El Paraíso'),
  aggregateDept('choluteca',         'Choluteca',         'Choluteca',          'Choluteca'),
  aggregateDept('copan',             'Copán',             'Santa Rosa de Copán','Copán'),
  aggregateDept('la-paz',            'La Paz',            'La Paz',             'La Paz'),
  aggregateDept('intibuca',          'Intibucá',          'La Esperanza',       'Intibucá'),
  aggregateDept('lempira',           'Lempira',           'Gracias',            'Lempira'),
  aggregateDept('colon',             'Colón',             'Trujillo',           'Colón'),
  aggregateDept('ocotepeque',        'Ocotepeque',        'Nueva Ocotepeque',   'Ocotepeque'),
  aggregateDept('valle',             'Valle',             'Nacaome',            'Valle'),
  aggregateDept('islas-de-la-bahia', 'Islas de la Bahía', 'Roatán',            'Islas de la Bahía'),
  aggregateDept('gracias-a-dios',    'Gracias a Dios',    'Puerto Lempira',     'Gracias a Dios'),
];

// ── Helper functions ──────────────────────────────────────────────────────────

export function getDepartamento(id) {
  return DEPARTAMENTOS.find((d) => d.id === id) || null;
}

export function getMunicipio(id) {
  return MUNICIPIOS.find((m) => m.id === id) || null;
}

export function getMunicipiosByDept(deptId) {
  return MUNICIPIOS.filter((m) => m.departamentoId === deptId);
}

export function getDeptAvg(deptId) {
  const munis = getMunicipiosByDept(deptId);
  if (!munis.length) return null;
  const n = munis.length;
  return {
    presupuesto:     munis.reduce((s, m) => s + m.presupuesto, 0) / n,
    ingresosPropios: munis.reduce((s, m) => s + m.ingresosPropios, 0) / n,
    transferencia:   munis.reduce((s, m) => s + m.transferencia, 0) / n,
    poblacion:       munis.reduce((s, m) => s + m.poblacion, 0) / n,
  };
}

export function getMunicipalitiesForMap() {
  return MUNICIPIOS.map((m) => ({
    name:                  m.nombre,
    department:            m.departamento,
    presupuesto_municipal: m.presupuesto,
    ingresos_propios:      m.ingresosPropios,
    autonomia_financiera:  m.presupuesto > 0 ? (m.ingresosPropios / m.presupuesto) * 100 : 0,
    population:            m.poblacion,
    transferencias_art91:  m.transferencia,
  }));
}

export function getDeptStatsMap() {
  const map = new Map();
  DEPARTAMENTOS.forEach((d) => {
    map.set(d.nombre, {
      name:           d.nombre,
      budget:         d.presupuesto,
      propios:        d.ingresosPropios,
      autonomia:      d.autonomia,
      muniCount:      d.muniCount,
      population:     d.poblacion,
      transferencias: d.transferencia,
      municipalities: d.municipios.map((m) => ({
        name:       m.nombre,
        budget:     m.presupuesto,
        propios:    m.ingresosPropios,
        autonomia:  m.presupuesto > 0 ? (m.ingresosPropios / m.presupuesto) * 100 : 0,
        population: m.poblacion,
      })),
    });
  });
  return map;
}

export function deptNameToId(nombre) {
  const dept = DEPARTAMENTOS.find(
    (d) => d.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ===
           nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  );
  return dept ? dept.id : null;
}
