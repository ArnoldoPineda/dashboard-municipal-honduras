// SIMHO — Mock data for all 18 Honduras departments.
// Comayagua is fully populated (21 municipios with evolution 2019-2024).
// Other departments include 4-7 representative municipalities.

// ── Utilities ────────────────────────────────────────────────────────────────

function evo(base, pcts) {
  let cur = base;
  return pcts.map((p) => {
    const v = Math.round(cur);
    cur = cur * (1 + p / 100);
    return v;
  });
}

function makeEvo(budget2024, rates = [3.8, 4.2, 5.1, 5.4, 6.3, null]) {
  // Work backwards from 2024 to get 2019 base, then forward
  let base = budget2024;
  for (let i = rates.length - 2; i >= 0; i--) {
    base = base / (1 + (rates[i] || 6) / 100);
  }
  const years = [2019, 2020, 2021, 2022, 2023, 2024];
  const vals = evo(base, rates.slice(0, 5));
  vals.push(budget2024);
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
    ingresosPropios: 85100000,   // 46 %
    transferencia: 55500000,     // 30 %
    otros: 44400000,             // 24 %
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
    ],
  },
  {
    id: 'comayagua-siguatepeque',
    nombre: 'Siguatepeque',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 80245,
    presupuesto: 132000000,
    ingresosPropios: 58000000,
    transferencia: 42000000,
    otros: 32000000,
    idh: 0.641,
    area: 657.2,
    isCapital: false,
    evolucion: makeEvo(132000000, [3.5, 4.0, 5.2, 5.8, 6.5, null]),
  },
  {
    id: 'comayagua-la-libertad',
    nombre: 'La Libertad',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 38432,
    presupuesto: 58000000,
    ingresosPropios: 14000000,
    transferencia: 28000000,
    otros: 16000000,
    idh: 0.612,
    area: 812.5,
    isCapital: false,
    evolucion: makeEvo(58000000, [3.2, 3.9, 4.8, 5.1, 5.9, null]),
  },
  {
    id: 'comayagua-taulabe',
    nombre: 'Taulabé',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 24178,
    presupuesto: 38000000,
    ingresosPropios: 8500000,
    transferencia: 19000000,
    otros: 10500000,
    idh: 0.598,
    area: 436.8,
    isCapital: false,
    evolucion: makeEvo(38000000, [2.8, 3.5, 4.2, 5.0, 5.5, null]),
  },
  {
    id: 'comayagua-villa-de-san-antonio',
    nombre: 'Villa de San Antonio',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 21543,
    presupuesto: 32000000,
    ingresosPropios: 7000000,
    transferencia: 16500000,
    otros: 8500000,
    idh: 0.594,
    area: 218.3,
    isCapital: false,
    evolucion: makeEvo(32000000, [2.6, 3.2, 4.0, 4.8, 5.2, null]),
  },
  {
    id: 'comayagua-san-luis',
    nombre: 'San Luis',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 18765,
    presupuesto: 28000000,
    ingresosPropios: 6000000,
    transferencia: 14500000,
    otros: 7500000,
    idh: 0.590,
    area: 287.1,
    isCapital: false,
    evolucion: makeEvo(28000000, [2.5, 3.1, 3.9, 4.6, 5.0, null]),
  },
  {
    id: 'comayagua-ajuterique',
    nombre: 'Ajuterique',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 16234,
    presupuesto: 24000000,
    ingresosPropios: 4800000,
    transferencia: 12500000,
    otros: 6700000,
    idh: 0.587,
    area: 155.6,
    isCapital: false,
    evolucion: makeEvo(24000000),
  },
  {
    id: 'comayagua-el-rosario',
    nombre: 'El Rosario',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 14876,
    presupuesto: 22000000,
    ingresosPropios: 4200000,
    transferencia: 11500000,
    otros: 6300000,
    idh: 0.583,
    area: 198.4,
    isCapital: false,
    evolucion: makeEvo(22000000),
  },
  {
    id: 'comayagua-minas-de-oro',
    nombre: 'Minas de Oro',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 13456,
    presupuesto: 20000000,
    ingresosPropios: 3800000,
    transferencia: 10500000,
    otros: 5700000,
    idh: 0.580,
    area: 423.2,
    isCapital: false,
    evolucion: makeEvo(20000000),
  },
  {
    id: 'comayagua-san-jose-de-comayagua',
    nombre: 'San José de Comayagua',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 12321,
    presupuesto: 18000000,
    ingresosPropios: 3400000,
    transferencia: 9500000,
    otros: 5100000,
    idh: 0.576,
    area: 144.8,
    isCapital: false,
    evolucion: makeEvo(18000000),
  },
  {
    id: 'comayagua-trinidad',
    nombre: 'Trinidad',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 11654,
    presupuesto: 17000000,
    ingresosPropios: 3200000,
    transferencia: 9000000,
    otros: 4800000,
    idh: 0.574,
    area: 309.6,
    isCapital: false,
    evolucion: makeEvo(17000000),
  },
  {
    id: 'comayagua-la-trinidad',
    nombre: 'La Trinidad',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 10987,
    presupuesto: 16000000,
    ingresosPropios: 3000000,
    transferencia: 8500000,
    otros: 4500000,
    idh: 0.572,
    area: 276.3,
    isCapital: false,
    evolucion: makeEvo(16000000),
  },
  {
    id: 'comayagua-meambar',
    nombre: 'Meámbar',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 10234,
    presupuesto: 15000000,
    ingresosPropios: 2800000,
    transferencia: 8000000,
    otros: 4200000,
    idh: 0.570,
    area: 532.1,
    isCapital: false,
    evolucion: makeEvo(15000000),
  },
  {
    id: 'comayagua-esquias',
    nombre: 'Esquías',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 9543,
    presupuesto: 14000000,
    ingresosPropios: 2600000,
    transferencia: 7500000,
    otros: 3900000,
    idh: 0.568,
    area: 187.4,
    isCapital: false,
    evolucion: makeEvo(14000000),
  },
  {
    id: 'comayagua-san-jeronimo',
    nombre: 'San Jerónimo',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 9234,
    presupuesto: 13500000,
    ingresosPropios: 2500000,
    transferencia: 7200000,
    otros: 3800000,
    idh: 0.567,
    area: 213.5,
    isCapital: false,
    evolucion: makeEvo(13500000),
  },
  {
    id: 'comayagua-lejamani',
    nombre: 'Lejamaní',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 8876,
    presupuesto: 13000000,
    ingresosPropios: 2400000,
    transferencia: 7000000,
    otros: 3600000,
    idh: 0.565,
    area: 101.2,
    isCapital: false,
    evolucion: makeEvo(13000000),
  },
  {
    id: 'comayagua-lamani',
    nombre: 'Lamaní',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 8432,
    presupuesto: 12000000,
    ingresosPropios: 2200000,
    transferencia: 6500000,
    otros: 3300000,
    idh: 0.562,
    area: 253.8,
    isCapital: false,
    evolucion: makeEvo(12000000),
  },
  {
    id: 'comayagua-humuya',
    nombre: 'Humuya',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 7876,
    presupuesto: 11500000,
    ingresosPropios: 2100000,
    transferencia: 6200000,
    otros: 3200000,
    idh: 0.560,
    area: 386.7,
    isCapital: false,
    evolucion: makeEvo(11500000),
  },
  {
    id: 'comayagua-san-sebastian',
    nombre: 'San Sebastián',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 7432,
    presupuesto: 11000000,
    ingresosPropios: 2000000,
    transferencia: 5900000,
    otros: 3100000,
    idh: 0.558,
    area: 198.9,
    isCapital: false,
    evolucion: makeEvo(11000000),
  },
  {
    id: 'comayagua-san-jose-del-potrero',
    nombre: 'San José del Potrero',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 6987,
    presupuesto: 10500000,
    ingresosPropios: 1900000,
    transferencia: 5700000,
    otros: 2900000,
    idh: 0.556,
    area: 165.3,
    isCapital: false,
    evolucion: makeEvo(10500000),
  },
  {
    id: 'comayagua-ojos-de-agua',
    nombre: 'Ojos de Agua',
    departamento: 'Comayagua',
    departamentoId: 'comayagua',
    poblacion: 6543,
    presupuesto: 9500000,
    ingresosPropios: 1700000,
    transferencia: 5200000,
    otros: 2600000,
    idh: 0.553,
    area: 142.6,
    isCapital: false,
    evolucion: makeEvo(9500000),
  },
];

// ── Other departments – representative municipalities ─────────────────────────

function muni(id, nombre, departamento, departamentoId, poblacion, presupuesto, ingresosPropios, transferencia, idh, area, isCapital) {
  const otros = Math.max(0, presupuesto - ingresosPropios - transferencia);
  return {
    id, nombre, departamento, departamentoId,
    poblacion, presupuesto, ingresosPropios, transferencia, otros, idh, area,
    isCapital: !!isCapital,
    evolucion: makeEvo(presupuesto),
  };
}

const OTRAS_MUNIS = [
  // ── Francisco Morazán ────────────────────────────────────────────────────
  muni('francisco-morazan-tegucigalpa', 'Tegucigalpa', 'Francisco Morazán', 'francisco-morazan', 1412000, 1450000000, 640000000, 480000000, 0.702, 1541.8, true),
  muni('francisco-morazan-santa-lucia', 'Santa Lucía', 'Francisco Morazán', 'francisco-morazan', 18400, 22000000, 5800000, 11000000, 0.648, 121.5, false),
  muni('francisco-morazan-valle-de-angeles', 'Valle de Ángeles', 'Francisco Morazán', 'francisco-morazan', 21300, 26000000, 7200000, 13000000, 0.641, 134.2, false),
  muni('francisco-morazan-san-juan-de-flores', 'San Juan de Flores', 'Francisco Morazán', 'francisco-morazan', 11200, 14000000, 3000000, 7500000, 0.627, 89.3, false),
  muni('francisco-morazan-talanga', 'Talanga', 'Francisco Morazán', 'francisco-morazan', 42600, 48000000, 12000000, 24000000, 0.619, 312.4, false),

  // ── Cortés ───────────────────────────────────────────────────────────────
  muni('cortes-san-pedro-sula', 'San Pedro Sula', 'Cortés', 'cortes', 912000, 1200000000, 528000000, 398000000, 0.714, 874.5, true),
  muni('cortes-choloma', 'Choloma', 'Cortés', 'cortes', 218400, 185000000, 68000000, 82000000, 0.638, 387.2, false),
  muni('cortes-la-lima', 'La Lima', 'Cortés', 'cortes', 94800, 82000000, 28000000, 38000000, 0.631, 58.4, false),
  muni('cortes-el-progreso', 'El Progreso', 'Cortés', 'cortes', 186500, 165000000, 58000000, 72000000, 0.635, 412.3, false),
  muni('cortes-villanueva', 'Villanueva', 'Cortés', 'cortes', 78300, 68000000, 22000000, 32000000, 0.624, 246.8, false),

  // ── Atlántida ────────────────────────────────────────────────────────────
  muni('atlantida-la-ceiba', 'La Ceiba', 'Atlántida', 'atlantida', 180450, 285000000, 98000000, 118000000, 0.667, 618.3, true),
  muni('atlantida-el-porvenir', 'El Porvenir', 'Atlántida', 'atlantida', 62400, 52000000, 14000000, 26000000, 0.623, 231.4, false),
  muni('atlantida-esparta', 'Esparta', 'Atlántida', 'atlantida', 28200, 30000000, 6800000, 15200000, 0.611, 312.5, false),
  muni('atlantida-jutiapa', 'Jutiapa', 'Atlántida', 'atlantida', 38600, 34000000, 8000000, 17000000, 0.608, 178.9, false),
  muni('atlantida-la-masica', 'La Masica', 'Atlántida', 'atlantida', 38400, 36000000, 7800000, 18200000, 0.604, 524.8, false),
  muni('atlantida-san-francisco', 'San Francisco', 'Atlántida', 'atlantida', 14200, 16000000, 3200000, 8500000, 0.598, 94.8, false),
  muni('atlantida-tela', 'Tela', 'Atlántida', 'atlantida', 88700, 78000000, 24000000, 36000000, 0.634, 542.6, false),
  muni('atlantida-arizona', 'Arizona', 'Atlántida', 'atlantida', 16800, 18000000, 3600000, 9400000, 0.596, 142.3, false),

  // ── Santa Bárbara ────────────────────────────────────────────────────────
  muni('santa-barbara-santa-barbara', 'Santa Bárbara', 'Santa Bárbara', 'santa-barbara', 38200, 42000000, 9800000, 21000000, 0.608, 312.6, true),
  muni('santa-barbara-santa-rosa-de-copan', 'Naranjito', 'Santa Bárbara', 'santa-barbara', 22400, 24000000, 5400000, 12000000, 0.601, 143.5, false),
  muni('santa-barbara-san-marcos', 'San Marcos', 'Santa Bárbara', 'santa-barbara', 19600, 21000000, 4600000, 10500000, 0.597, 124.8, false),
  muni('santa-barbara-petoa', 'Petoa', 'Santa Bárbara', 'santa-barbara', 11800, 13000000, 2800000, 6800000, 0.589, 87.3, false),
  muni('santa-barbara-trinidad-de-copan', 'Trinidad', 'Santa Bárbara', 'santa-barbara', 8900, 10000000, 2100000, 5300000, 0.582, 68.2, false),

  // ── Yoro ─────────────────────────────────────────────────────────────────
  muni('yoro-yoro', 'Yoro', 'Yoro', 'yoro', 62400, 68000000, 16000000, 32000000, 0.618, 498.7, true),
  muni('yoro-el-progreso', 'El Progreso', 'Yoro', 'yoro', 136800, 135000000, 46000000, 58000000, 0.632, 378.4, false),
  muni('yoro-morazan', 'Morazán', 'Yoro', 'yoro', 28400, 28000000, 6200000, 14000000, 0.604, 213.6, false),
  muni('yoro-olanchito', 'Olanchito', 'Yoro', 'yoro', 64200, 58000000, 13000000, 28000000, 0.611, 612.3, false),
  muni('yoro-victoria', 'Victoria', 'Yoro', 'yoro', 14600, 15000000, 3100000, 7800000, 0.594, 102.8, false),

  // ── Olancho ──────────────────────────────────────────────────────────────
  muni('olancho-juticalpa', 'Juticalpa', 'Olancho', 'olancho', 82300, 95000000, 28000000, 42000000, 0.628, 824.5, true),
  muni('olancho-catacamas', 'Catacamas', 'Olancho', 'olancho', 68400, 72000000, 18000000, 32000000, 0.615, 1843.2, false),
  muni('olancho-campamento', 'Campamento', 'Olancho', 'olancho', 22100, 22000000, 4800000, 11000000, 0.596, 412.6, false),
  muni('olancho-san-francisco-de-la-paz', 'San Francisco de la Paz', 'Olancho', 'olancho', 18600, 18000000, 3900000, 9200000, 0.590, 318.4, false),

  // ── El Paraíso ───────────────────────────────────────────────────────────
  muni('el-paraiso-yuscarán', 'Yuscarán', 'El Paraíso', 'el-paraiso', 11200, 13000000, 2800000, 6800000, 0.604, 198.7, true),
  muni('el-paraiso-danlí', 'Danlí', 'El Paraíso', 'el-paraiso', 98400, 96000000, 28000000, 44000000, 0.631, 786.4, false),
  muni('el-paraiso-el-paraiso', 'El Paraíso', 'El Paraíso', 'el-paraiso', 48200, 48000000, 12000000, 22000000, 0.614, 432.8, false),
  muni('el-paraiso-teupasenti', 'Teupasenti', 'El Paraíso', 'el-paraiso', 28600, 28000000, 6200000, 13800000, 0.601, 287.3, false),
  muni('el-paraiso-jalapa', 'Jalapa', 'El Paraíso', 'el-paraiso', 18400, 18000000, 3800000, 9000000, 0.593, 186.9, false),

  // ── Choluteca ────────────────────────────────────────────────────────────
  muni('choluteca-choluteca', 'Choluteca', 'Choluteca', 'choluteca', 142300, 120000000, 42000000, 52000000, 0.619, 1618.4, true),
  muni('choluteca-nacaome', 'Marcovia', 'Choluteca', 'choluteca', 48200, 42000000, 10000000, 20000000, 0.601, 312.6, false),
  muni('choluteca-el-triunfo', 'El Triunfo', 'Choluteca', 'choluteca', 28600, 28000000, 6000000, 13800000, 0.594, 214.8, false),
  muni('choluteca-san-marcos', 'San Marcos de Colón', 'Choluteca', 'choluteca', 22400, 21000000, 4600000, 10400000, 0.588, 368.2, false),

  // ── Copán ────────────────────────────────────────────────────────────────
  muni('copan-santa-rosa-de-copan', 'Santa Rosa de Copán', 'Copán', 'copan', 76800, 88000000, 26000000, 38000000, 0.632, 412.4, true),
  muni('copan-copan-ruinas', 'Copán Ruinas', 'Copán', 'copan', 38200, 42000000, 12000000, 19000000, 0.628, 378.6, false),
  muni('copan-la-entrada', 'La Entrada', 'Copán', 'copan', 48600, 48000000, 14000000, 22000000, 0.618, 214.8, false),
  muni('copan-san-pedro', 'San Pedro', 'Copán', 'copan', 18400, 18000000, 4000000, 9000000, 0.601, 142.6, false),

  // ── La Paz ───────────────────────────────────────────────────────────────
  muni('la-paz-la-paz', 'La Paz', 'La Paz', 'la-paz', 42800, 48000000, 12000000, 22000000, 0.614, 312.6, true),
  muni('la-paz-marcala', 'Marcala', 'La Paz', 'la-paz', 28400, 30000000, 7200000, 14800000, 0.608, 248.4, false),
  muni('la-paz-aguanqueterique', 'Aguanqueterique', 'La Paz', 'la-paz', 8600, 9000000, 1900000, 4800000, 0.581, 98.3, false),
  muni('la-paz-cane', 'Cane', 'La Paz', 'la-paz', 6200, 7000000, 1400000, 3800000, 0.574, 78.6, false),

  // ── Intibucá ─────────────────────────────────────────────────────────────
  muni('intibuca-la-esperanza', 'La Esperanza', 'Intibucá', 'intibuca', 28400, 32000000, 8200000, 15400000, 0.612, 142.8, true),
  muni('intibuca-intibuca', 'Intibucá', 'Intibucá', 'intibuca', 14800, 16000000, 3600000, 8200000, 0.598, 428.6, false),
  muni('intibuca-jesus-de-otoro', 'Jesús de Otoro', 'Intibucá', 'intibuca', 32600, 34000000, 8600000, 16200000, 0.606, 286.4, false),
  muni('intibuca-masaguara', 'Masaguara', 'Intibucá', 'intibuca', 18200, 18000000, 4200000, 9000000, 0.593, 198.7, false),

  // ── Lempira ──────────────────────────────────────────────────────────────
  muni('lempira-gracias', 'Gracias', 'Lempira', 'lempira', 28400, 32000000, 7800000, 15200000, 0.601, 386.4, true),
  muni('lempira-la-campa', 'La Campa', 'Lempira', 'lempira', 6800, 7000000, 1400000, 3700000, 0.571, 98.4, false),
  muni('lempira-san-marcos-de-caiquin', 'San Marcos de Caiquín', 'Lempira', 'lempira', 8200, 8000000, 1600000, 4200000, 0.574, 112.6, false),
  muni('lempira-erandique', 'Erandique', 'Lempira', 'lempira', 14600, 14000000, 2800000, 7200000, 0.581, 248.9, false),

  // ── Colón ────────────────────────────────────────────────────────────────
  muni('colon-trujillo', 'Trujillo', 'Colón', 'colon', 42800, 48000000, 12000000, 22000000, 0.609, 1642.8, true),
  muni('colon-tocoa', 'Tocoa', 'Colón', 'colon', 62400, 58000000, 15000000, 27000000, 0.604, 912.4, false),
  muni('colon-bonito-oriental', 'Bonito Oriental', 'Colón', 'colon', 22400, 21000000, 4800000, 10400000, 0.592, 312.8, false),
  muni('colon-saba', 'Sabá', 'Colón', 'colon', 28600, 26000000, 5800000, 12800000, 0.597, 486.3, false),

  // ── Ocotepeque ───────────────────────────────────────────────────────────
  muni('ocotepeque-nueva-ocotepeque', 'Nueva Ocotepeque', 'Ocotepeque', 'ocotepeque', 18400, 22000000, 5600000, 11000000, 0.614, 124.8, true),
  muni('ocotepeque-sinuapa', 'Sinuapa', 'Ocotepeque', 'ocotepeque', 8200, 9000000, 2000000, 4600000, 0.590, 86.4, false),
  muni('ocotepeque-la-labor', 'La Labor', 'Ocotepeque', 'ocotepeque', 6400, 7000000, 1500000, 3600000, 0.583, 62.8, false),
  muni('ocotepeque-mercedes', 'Mercedes', 'Ocotepeque', 'ocotepeque', 5200, 6000000, 1200000, 3100000, 0.577, 54.3, false),

  // ── Valle ────────────────────────────────────────────────────────────────
  muni('valle-nacaome', 'Nacaome', 'Valle', 'valle', 64800, 72000000, 20000000, 32000000, 0.621, 642.8, true),
  muni('valle-san-lorenzo', 'San Lorenzo', 'Valle', 'valle', 42400, 48000000, 14000000, 21000000, 0.618, 312.6, false),
  muni('valle-langue', 'Langue', 'Valle', 'valle', 22400, 21000000, 4800000, 10400000, 0.597, 214.8, false),
  muni('valle-amapala', 'Amapala', 'Valle', 'valle', 8600, 9000000, 2200000, 4600000, 0.601, 42.8, false),

  // ── Islas de la Bahía ────────────────────────────────────────────────────
  muni('islas-de-la-bahia-roatan', 'Roatán', 'Islas de la Bahía', 'islas-de-la-bahia', 28400, 48000000, 22000000, 16000000, 0.686, 127.8, true),
  muni('islas-de-la-bahia-guanaja', 'Guanaja', 'Islas de la Bahía', 'islas-de-la-bahia', 6800, 14000000, 5800000, 5200000, 0.672, 56.2, false),
  muni('islas-de-la-bahia-utila', 'Utila', 'Islas de la Bahía', 'islas-de-la-bahia', 4200, 10000000, 4600000, 3400000, 0.669, 41.5, false),
  muni('islas-de-la-bahia-jose-santos-guardiola', 'José Santos Guardiola', 'Islas de la Bahía', 'islas-de-la-bahia', 12400, 18000000, 7200000, 6800000, 0.661, 98.4, false),

  // ── Gracias a Dios ───────────────────────────────────────────────────────
  muni('gracias-a-dios-puerto-lempira', 'Puerto Lempira', 'Gracias a Dios', 'gracias-a-dios', 22400, 28000000, 5200000, 14800000, 0.524, 2289.4, true),
  muni('gracias-a-dios-brus-laguna', 'Brus Laguna', 'Gracias a Dios', 'gracias-a-dios', 14800, 16000000, 2800000, 8800000, 0.512, 3642.8, false),
  muni('gracias-a-dios-wampusirpi', 'Wampusirpi', 'Gracias a Dios', 'gracias-a-dios', 8600, 9000000, 1400000, 5200000, 0.498, 2184.6, false),
];

// ── Flat array of all municipalities ────────────────────────────────────────

export const MUNICIPIOS = [...COMAYAGUA_MUNIS, ...OTRAS_MUNIS];

// ── Department aggregates ────────────────────────────────────────────────────

function aggregateDept(id, nombre, capital, topoNombre) {
  const munis = MUNICIPIOS.filter((m) => m.departamentoId === id);
  const presupuesto     = munis.reduce((s, m) => s + m.presupuesto, 0);
  const ingresosPropios = munis.reduce((s, m) => s + m.ingresosPropios, 0);
  const transferencia   = munis.reduce((s, m) => s + m.transferencia, 0);
  const poblacion       = munis.reduce((s, m) => s + m.poblacion, 0);
  const autonomia       = presupuesto > 0 ? (ingresosPropios / presupuesto) * 100 : 0;
  return {
    id,
    nombre,
    capital,
    topoNombre: topoNombre || nombre,
    presupuesto,
    ingresosPropios,
    transferencia,
    poblacion,
    autonomia,
    muniCount: munis.length,
    municipios: munis,
  };
}

export const DEPARTAMENTOS = [
  aggregateDept('francisco-morazan',  'Francisco Morazán',  'Tegucigalpa',       'Francisco Morazán'),
  aggregateDept('cortes',             'Cortés',             'San Pedro Sula',    'Cortés'),
  aggregateDept('atlantida',          'Atlántida',          'La Ceiba',          'Atlántida'),
  aggregateDept('comayagua',          'Comayagua',          'Comayagua',         'Comayagua'),
  aggregateDept('santa-barbara',      'Santa Bárbara',      'Santa Bárbara',     'Santa Bárbara'),
  aggregateDept('yoro',               'Yoro',               'Yoro',              'Yoro'),
  aggregateDept('olancho',            'Olancho',            'Juticalpa',         'Olancho'),
  aggregateDept('el-paraiso',         'El Paraíso',         'Yuscarán',          'El Paraíso'),
  aggregateDept('choluteca',          'Choluteca',          'Choluteca',         'Choluteca'),
  aggregateDept('copan',              'Copán',              'Santa Rosa de Copán','Copán'),
  aggregateDept('la-paz',             'La Paz',             'La Paz',            'La Paz'),
  aggregateDept('intibuca',           'Intibucá',           'La Esperanza',      'Intibucá'),
  aggregateDept('lempira',            'Lempira',            'Gracias',           'Lempira'),
  aggregateDept('colon',              'Colón',              'Trujillo',          'Colón'),
  aggregateDept('ocotepeque',         'Ocotepeque',         'Nueva Ocotepeque',  'Ocotepeque'),
  aggregateDept('valle',              'Valle',              'Nacaome',           'Valle'),
  aggregateDept('islas-de-la-bahia',  'Islas de la Bahía',  'Roatán',            'Islas de la Bahía'),
  aggregateDept('gracias-a-dios',     'Gracias a Dios',     'Puerto Lempira',    'Gracias a Dios'),
];

// ── Helper functions ────────────────────────────────────────────────────────

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
    presupuesto:    munis.reduce((s, m) => s + m.presupuesto, 0) / n,
    ingresosPropios: munis.reduce((s, m) => s + m.ingresosPropios, 0) / n,
    transferencia:  munis.reduce((s, m) => s + m.transferencia, 0) / n,
    poblacion:      munis.reduce((s, m) => s + m.poblacion, 0) / n,
  };
}

// Returns municipalities in the format compatible with the D3 choropleth map
export function getMunicipalitiesForMap() {
  return MUNICIPIOS.map((m) => ({
    name:                   m.nombre,
    department:             m.departamento,
    presupuesto_municipal:  m.presupuesto,
    ingresos_propios:       m.ingresosPropios,
    autonomia_financiera:   m.presupuesto > 0
      ? (m.ingresosPropios / m.presupuesto) * 100
      : 0,
    population:             m.poblacion,
    transferencias_art91:   m.transferencia,
  }));
}

// Returns dept stats compatible with the D3 national map (deptStats Map)
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

// Slug a department name to an ID
export function deptNameToId(nombre) {
  const dept = DEPARTAMENTOS.find(
    (d) => d.nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '') ===
           nombre.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  );
  return dept ? dept.id : null;
}
