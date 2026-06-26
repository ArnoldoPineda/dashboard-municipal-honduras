import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { DEPARTAMENTOS, getMunicipiosByDept, getMunicipio, MUNICIPIOS } from '../data/municipios';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

// ── SEFIN table helpers ────────────────────────────────────────────────────────
const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

const COD_DEP_MAP: Record<string, string> = {
  'atlantida': '01', 'colon': '02', 'comayagua': '03', 'copan': '04',
  'cortes': '05', 'choluteca': '06', 'el paraiso': '07', 'francisco morazan': '08',
  'gracias a dios': '09', 'intibuca': '10', 'islas de la bahia': '11', 'la paz': '12',
  'lempira': '13', 'ocotepeque': '14', 'olancho': '15', 'santa barbara': '16',
  'valle': '17', 'yoro': '18',
};

const SEFIN_COLUMNS: { key: string; header: string; isText?: boolean }[] = [
  { key: 'no_mun',                     header: 'No. MUN.',                          isText: true },
  { key: 'cod_dep',                    header: 'COD. DEP',                          isText: true },
  { key: 'cod_mun',                    header: 'COD. MUN.',                         isText: true },
  { key: 'department',                 header: 'DEPARTAMENTO',                      isText: true },
  { key: 'name',                       header: 'MUNICIPIO',                         isText: true },
  { key: 'categoria',                  header: 'CATEGORIA',                         isText: true },
  { key: 'population',                 header: 'POBLACION AJUSTADA 2002' },
  { key: 'presupuesto_municipal',      header: 'PRESUPUESTO MUNICIPAL' },
  { key: 'gastos_presupuestados',      header: 'GASTOS PRESUPUESTADOS' },
  { key: 'ingresos_propios',           header: 'INGRESOS PROPIOS' },
  { key: 'ingresos_recaudados',        header: 'INGRESOS RECAUDADOS' },
  { key: 'autonomia_financiera',       header: 'AUTONOMIA FINANCIERA' },
  { key: 'ingresos_corrientes',        header: 'INGRESOS CORRIENTES' },
  { key: 'ingresos_tributarios',       header: 'INGRESOS TRIBUTARIOS' },
  { key: 'impuesto_bi',                header: 'IMPUESTO SOBRE BI' },
  { key: 'impuesto_personal',          header: 'IMPUESTO PERSONAL O VECINAL' },
  { key: 'impuesto_industria',         header: 'IMPUESTO S/INDUSTRIA' },
  { key: 'impuesto_comercio',          header: 'IMPUESTO S/COMERCIO' },
  { key: 'impuesto_servicios',         header: 'IMPUESTO S/SERVICIOS' },
  { key: 'impuesto_pecuario',          header: 'IMPUESTO PECUARIO' },
  { key: 'impuesto_extraccion',        header: 'IMPUESTO S/EXTRACCION' },
  { key: 'impuesto_telecomunicaciones', header: 'IMPUESTO DE TELECOMUNICACIONES' },
  { key: 'tasas_servicios',            header: 'TASAS POR SERVICIOS' },
  { key: 'derechos',                   header: 'DERECHOS' },
  { key: 'ingresos_no_tributarios',    header: 'INGRESOS NO TRIBUTARIOS' },
  { key: 'ingresos_capital',           header: 'INGRESOS DE CAPITAL' },
  { key: 'prestamos',                  header: 'PRESTAMOS' },
  { key: 'venta_activos',              header: 'VENTA DE ACTIVOS' },
  { key: 'contribuciones',             header: 'CONTRIBUCIONES' },
  { key: 'colocacion_bonos',           header: 'COLOCACION EN BONOS' },
  { key: 'transferencias_art91',       header: 'TRANSFERENCIAS Art. 91' },
  { key: 'otras_transferencias',       header: 'OTRAS TRANSFERENCIAS' },
  { key: 'subsidios',                  header: 'SUBSIDIOS' },
  { key: 'herencias_legados',          header: 'HERENCIAS LEGADOS Y DONACIONES' },
  { key: 'otros_ingresos_capital',     header: 'OTROS INGRESOS DE CAPITAL' },
  { key: 'recursos_balance',           header: 'RECURSOS DE BALANCE' },
  { key: 'gastos_funcionamiento',      header: 'GASTOS DE FUNCIONAMIENTO' },
  { key: 'servicios_personales',       header: 'SERVICIOS PERSONALES' },
  { key: 'servicios_no_personales',    header: 'SERVICIOS NO PERSONALES' },
  { key: 'materiales_suministro',      header: 'MATERIALES Y SUMINISTRO Y MAQUINARIA' },
  { key: 'transferencias_corrientes',  header: 'TRANSFERENCIAS CORRIENTES' },
  { key: 'otros_gastos',               header: 'OTROS' },
  { key: 'gastos_capital_deuda',       header: 'GASTOS DE CAPITAL Y DEUDA PUBLICA' },
  { key: 'bienes_capitalizables',      header: 'BIENES CAPITALIZABLES' },
  { key: 'transferencias_capital',     header: 'TRANSFERENCIAS' },
  { key: 'activos_financieros',        header: 'ACTIVOS FINANCIEROS' },
  { key: 'servicios_deuda',            header: 'SERVICIOS DE DEUDA' },
  { key: 'otros_gastos_capital',       header: 'OTROS GASTOS' },
  { key: 'asignaciones_globales',      header: 'ASIGNACIONES GLOBALES' },
  { key: 'total_egresos',              header: 'TOTAL EGRESOS' },
  { key: 'superavit_deficit',          header: 'SUPERAVIT O DEFICIT' },
  { key: 'gasto_corriente',            header: 'Gasto Corriente' },
  { key: 'ingreso_corriente_ajustado', header: 'Ingreso Corriente Ajustado' },
];

// 👇 AJUSTE: aceptar number | string | null para evitar error con ValueType
const formatNumber = (
  num: number | string | null | undefined,
  decimals: number = 0
): string => {
  const n = Number(num);
  if (!isFinite(n)) return '0';

  return n.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

// 👇 AJUSTE: igual, aceptar number | string | null
const formatCurrency = (num: number | string | null | undefined): string => {
  const n = Number(num);
  if (!isFinite(n)) return 'L 0M';
  const millions = n / 1_000_000;
  return `L ${formatNumber(millions, 1)}M`;
};

const PresupuestarioPage = () => {
  const { isMobile, isTablet } = useMediaQuery();
  const [selectedDeptId, setSelectedDeptId] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([2024]);
  const [activeTab, setActiveTab] = useState('general');
  const [muniSearch, setMuniSearch] = useState<string>('');
  const [selectedCategoria, setSelectedCategoria] = useState<string>('');
  const [presupuestoMin, setPresupuestoMin] = useState<number>(0);
  const [selectedMuniId, setSelectedMuniId] = useState<string>('');

  // 👇 Estado para evitar parpadeo de Recharts
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChartsReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { municipalities, loading, error } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024, 2025]);

  const selectedMunicipalityData = useMemo(() => {
    if (!selectedMunicipality) return [];
    return municipalities
      .filter((m) => m.name === selectedMunicipality && selectedYears.includes(m.year))
      .sort((a, b) => b.year - a.year);
  }, [selectedMunicipality, selectedYears, municipalities]);

  const selectedMockMuni: any = useMemo(() => {
    if (!selectedMuniId) return null;
    return getMunicipio(selectedMuniId) || null;
  }, [selectedMuniId]);

  const muniCat = (m: any): string => {
    if (m.categoria) return m.categoria;
    const pop = m.poblacion ?? 0;
    if (pop > 100000) return 'A';
    if (pop >= 20000) return 'B';
    if (pop >= 5000)  return 'C';
    return 'D';
  };

  const filteredMunis: any[] = useMemo(() => {
    return (MUNICIPIOS as any[]).filter((m: any) => {
      if (selectedDeptId && m.departamentoId !== selectedDeptId) return false;
      if (muniSearch.trim() && !m.nombre.toLowerCase().includes(muniSearch.toLowerCase())) return false;
      if (selectedCategoria && muniCat(m) !== selectedCategoria) return false;
      if (presupuestoMin > 0 && m.presupuesto < presupuestoMin) return false;
      return true;
    }).sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es'));
  }, [selectedDeptId, muniSearch, selectedCategoria, presupuestoMin]);

  const categoriaByName = useMemo(() => {
    const map = new Map<string, string>();
    (MUNICIPIOS as any[]).forEach((m: any) => {
      map.set(normalize(m.nombre), m.categoria || '');
    });
    return map;
  }, []);

  const sefinTableData = useMemo(() => {
    const year = selectedYears[0] ?? 2024;
    const deptNorm = selectedDeptId ? normalize(selectedDeptId.replace(/-/g, ' ')) : null;
    return municipalities
      .filter(m => {
        if (m.year !== year) return false;
        if (deptNorm && normalize(m.department || '') !== deptNorm) return false;
        if (muniSearch.trim() && !normalize(m.name || '').includes(normalize(muniSearch))) return false;
        const cat = categoriaByName.get(normalize(m.name || '')) || '';
        if (selectedCategoria && cat !== selectedCategoria) return false;
        if (presupuestoMin > 0 && (m.presupuesto_municipal || 0) < presupuestoMin) return false;
        return true;
      })
      .sort((a, b) => (a.name || '').localeCompare(b.name || '', 'es'));
  }, [municipalities, selectedYears, selectedDeptId, muniSearch, selectedCategoria, presupuestoMin, categoriaByName]);

  if (loading) {
    return (
      <DashboardLayout title="Datos Financieros">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Datos Financieros">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      </DashboardLayout>
    );
  }

  const allMunicipalities = Array.from(new Map(municipalities.map((m) => [m.name, m])).values()).sort((a, b) =>
    (a.name || '').localeCompare(b.name || ''),
  );

  // Municipios del departamento seleccionado, filtrados por búsqueda
  const muniOptions: any[] = selectedDeptId
    ? (getMunicipiosByDept(selectedDeptId) as any[])
        .filter((m: any) => !muniSearch.trim() || m.nombre.toLowerCase().includes(muniSearch.toLowerCase()))
        .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es'))
    : [];

  const toggleYear = (year: number) => {
    setSelectedYears((prev) => {
      if (prev.includes(year)) {
        return prev.filter((y) => y !== year);
      } else {
        return [...prev, year].sort((a, b) => b - a);
      }
    });
  };

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82ca9d', '#ffc658'];

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'presupuesto', label: 'Presupuestarios' },
    { id: 'tributarios', label: 'Tributarios' },
    { id: 'capital', label: 'Capital' },
    { id: 'funcionamiento', label: 'Funcionamiento' },
    { id: 'capital_deuda', label: 'Capital/Deuda' },
    { id: 'egresos', label: 'Egresos' },
  ];

  const chartHeight = isMobile ? 250 : 300;

  const renderGeneralChart = () => {
    const data = selectedMunicipalityData.map((m) => ({
      year: `${m.year}`,
      Presupuesto: Math.round(m.presupuesto_municipal / 1_000_000),
      Egresos: Math.round(m.total_egresos / 1_000_000),
    }));

    if (data.length === 0) return <p className="text-gray-600 text-center py-8">Selecciona municipio y años</p>;
    if (!chartsReady) return <div style={{ width: '100%', height: chartHeight }} />;

    return (
      <div style={{ width: '100%', height: chartHeight, minHeight: chartHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
            <YAxis />
            <Tooltip formatter={(value: string | number) => `L ${formatNumber(value, 0)}M`} />
            {!isMobile && <Legend />}
            <Bar dataKey="Presupuesto" fill="#0088FE" />
            <Bar dataKey="Egresos" fill="#00C49F" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderPresupuestoChart = () => {
    const data = selectedMunicipalityData.map((m) => ({
      year: `${m.year}`,
      Propios: Math.round(m.ingresos_propios / 1_000_000),
      Corrientes: Math.round(m.ingresos_corrientes / 1_000_000),
      Recaudados: Math.round(m.ingresos_recaudados / 1_000_000),
    }));

    if (data.length === 0) return <p className="text-gray-600 text-center py-8">Selecciona municipio y años</p>;
    if (!chartsReady) return <div style={{ width: '100%', height: chartHeight }} />;

    return (
      <div style={{ width: '100%', height: chartHeight, minHeight: chartHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
            <YAxis />
            <Tooltip formatter={(value: string | number) => `L ${formatNumber(value, 0)}M`} />
            {!isMobile && <Legend />}
            <Line type="monotone" dataKey="Propios" stroke="#8884d8" strokeWidth={2} />
            <Line type="monotone" dataKey="Corrientes" stroke="#82ca9d" strokeWidth={2} />
            <Line type="monotone" dataKey="Recaudados" stroke="#ffc658" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderTributariosChart = () => {
    const data = [
      { name: 'Impuesto BI', value: selectedMunicipalityData.reduce((sum, m) => sum + (m.impuesto_bi || 0), 0) },
      { name: 'Personal', value: selectedMunicipalityData.reduce((sum, m) => sum + (m.impuesto_personal || 0), 0) },
      { name: 'Industria', value: selectedMunicipalityData.reduce((sum, m) => sum + (m.impuesto_industria || 0), 0) },
      { name: 'Comercio', value: selectedMunicipalityData.reduce((sum, m) => sum + (m.impuesto_comercio || 0), 0) },
      { name: 'Servicios', value: selectedMunicipalityData.reduce((sum, m) => sum + (m.impuesto_servicios || 0), 0) },
    ].filter((d) => d.value > 0);

    if (data.length === 0) return <p className="text-gray-600 text-center py-8">Sin datos</p>;
    if (!chartsReady) return <div style={{ width: '100%', height: chartHeight }} />;

    return (
      <div style={{ width: '100%', height: chartHeight, minHeight: chartHeight }}>
        <ResponsiveContainer width="100%" height={chartHeight}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={
                isMobile
                  ? false
                  : ({ name, percent }) => `${name as string} ${(Number(percent) * 100).toFixed(0)}%`
              }
              outerRadius={isMobile ? 60 : 80}
              fill="#8884d8"
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: string | number) => formatCurrency(value)} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  };

  const renderGeneralTab = () => {
    if (selectedMunicipalityData.length === 0) {
      return <p className="text-center text-gray-600 py-8">Selecciona municipio y años</p>;
    }

    return (
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
        <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-bold mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>Comparativa Presupuestal</h3>
          {renderGeneralChart()}
        </div>

        <div className={`bg-white rounded-lg shadow-md overflow-x-auto ${isMobile ? 'p-3' : ''}`}>
          <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className={`text-left font-semibold ${isMobile ? 'px-2 py-2' : 'px-4 py-3'}`}>Año</th>
                <th className={`text-right font-semibold ${isMobile ? 'px-2 py-2' : 'px-4 py-3'}`}>Presupuesto</th>
                <th className={`text-right font-semibold ${isMobile ? 'px-2 py-2' : 'px-4 py-3'}`}>Egresos</th>
                <th className={`text-right font-semibold ${isMobile ? 'px-2 py-2' : 'px-4 py-3'}`}>
                  Superávit/Déficit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedMunicipalityData.map((mun, idx) => (
                <tr key={idx} className="hover:bg-gray-50">
                  <td className={`font-bold text-blue-700 ${isMobile ? 'px-2 py-2' : 'px-4 py-3'}`}>{mun.year}</td>
                  <td className={`text-right ${isMobile ? 'px-2 py-2' : 'px-4 py-3'}`}>
                    {formatCurrency(mun.presupuesto_municipal)}
                  </td>
                  <td className={`text-right ${isMobile ? 'px-2 py-2' : 'px-4 py-3'}`}>
                    {formatCurrency(mun.total_egresos)}
                  </td>
                  <td
                    className={`text-right font-bold ${
                      mun.superavit_deficit > 0 ? 'text-green-600' : 'text-red-600'
                    } ${isMobile ? 'px-2 py-2' : 'px-4 py-3'}`}
                  >
                    {formatCurrency(mun.superavit_deficit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPresupuestoTab = () => {
    if (selectedMunicipalityData.length === 0) {
      return <p className="text-center text-gray-600 py-8">Selecciona municipio y años</p>;
    }

    return (
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
        <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-bold mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>Evolución de Ingresos</h3>
          {renderPresupuestoChart()}
        </div>

        <div className={`bg-white rounded-lg shadow-md overflow-y-auto max-h-96 ${isMobile ? 'p-3' : ''}`}>
          <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className={`text-left font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>Año</th>
                <th className={`text-right font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedMunicipalityData.map((mun, idx) => (
                <React.Fragment key={idx}>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={2} className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>
                      Año {mun.year}
                    </td>
                  </tr>
                  <tr>
                    <td className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>Presupuesto</td>
                    <td className={`text-right ${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>
                      {formatCurrency(mun.presupuesto_municipal)}
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>Ingresos Propios</td>
                    <td className={`text-right ${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>
                      {formatCurrency(mun.ingresos_propios)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTributariosTab = () => {
    if (selectedMunicipalityData.length === 0) {
      return <p className="text-center text-gray-600 py-8">Selecciona municipio y años</p>;
    }

    return (
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
        <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-bold mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>Ingresos Tributarios</h3>
          {renderTributariosChart()}
        </div>

        <div className={`bg-white rounded-lg shadow-md overflow-y-auto max-h-96 ${isMobile ? 'p-3' : ''}`}>
          <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className={`text-left font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>Concepto</th>
                <th className={`text-right font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedMunicipalityData.map((mun, idx) => (
                <React.Fragment key={idx}>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={2} className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>
                      Año {mun.year}
                    </td>
                  </tr>
                  <tr>
                    <td className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>Impuesto BI</td>
                    <td className={`text-right ${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>
                      {formatCurrency(mun.impuesto_bi)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderFuncionamientoTab = () => {
    if (selectedMunicipalityData.length === 0) {
      return <p className="text-center text-gray-600 py-8">Selecciona municipio y años</p>;
    }

    const data = selectedMunicipalityData.map((m) => ({
      year: `${m.year}`,
      Personales: Math.round(m.servicios_personales / 1_000_000),
      'No Personales': Math.round(m.servicios_no_personales / 1_000_000),
    }));

    return (
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
        <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-bold mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>Gastos de Funcionamiento</h3>
          {chartsReady && (
            <div style={{ width: '100%', height: chartHeight, minHeight: chartHeight }}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: string | number) => `L ${formatNumber(value, 0)}M`} />
                  {!isMobile && <Legend />}
                  <Bar dataKey="Personales" fill="#0088FE" />
                  <Bar dataKey="No Personales" fill="#00C49F" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {!chartsReady && <div style={{ width: '100%', height: chartHeight }} />}
        </div>

        <div className={`bg-white rounded-lg shadow-md overflow-y-auto max-h-96 ${isMobile ? 'p-3' : ''}`}>
          <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className={`text-left font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>Concepto</th>
                <th className={`text-right font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>Monto</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedMunicipalityData.map((mun, idx) => (
                <React.Fragment key={idx}>
                  <tr className="bg-blue-50 font-bold">
                    <td colSpan={2} className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>
                      Año {mun.year}
                    </td>
                  </tr>
                  <tr>
                    <td className={`${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>Total Funcionamiento</td>
                    <td className={`text-right ${isMobile ? 'px-2 py-1' : 'px-3 py-1'}`}>
                      {formatCurrency(mun.gastos_funcionamiento)}
                    </td>
                  </tr>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderCapitalTab = () => {
    if (selectedMunicipalityData.length === 0) {
      return <p className="text-center text-gray-600 py-8">Selecciona municipio y años</p>;
    }

    return (
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {selectedMunicipalityData.map((mun, idx) => (
          <div
            key={idx}
            className={`border-l-4 border-blue-600 p-4 bg-blue-50 rounded ${isMobile ? 'text-sm' : ''}`}
          >
            <p className={`font-bold text-blue-900 ${isMobile ? 'text-base' : 'text-lg'}`}>Año {mun.year}</p>
            <p className={`text-gray-600 mt-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>Total Capital</p>
            <p className={`font-bold text-blue-700 mt-1 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              {formatCurrency(mun.ingresos_capital)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderCapitalDeudaTab = () => {
    if (selectedMunicipalityData.length === 0) {
      return <p className="text-center text-gray-600 py-8">Selecciona municipio y años</p>;
    }

    return (
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2'}`}>
        {selectedMunicipalityData.map((mun, idx) => (
          <div
            key={idx}
            className={`border-l-4 border-purple-600 p-4 bg-purple-50 rounded ${isMobile ? 'text-sm' : ''}`}
          >
            <p className={`font-bold text-purple-900 ${isMobile ? 'text-base' : 'text-lg'}`}>Año {mun.year}</p>
            <p className={`text-gray-600 mt-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>Total Capital y Deuda</p>
            <p className={`font-bold text-purple-700 mt-1 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              {formatCurrency(mun.gastos_capital_deuda)}
            </p>
          </div>
        ))}
      </div>
    );
  };

  const renderEgresosTab = () => {
    if (selectedMunicipalityData.length === 0) {
      return <p className="text-center text-gray-600 py-8">Selecciona municipio y años</p>;
    }

    const data = selectedMunicipalityData.map((m) => ({
      year: `${m.year}`,
      'Total Egresos': Math.round(m.total_egresos / 1_000_000),
      'Superávit/Déficit': Math.round(m.superavit_deficit / 1_000_000),
    }));

    return (
      <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'lg:grid-cols-2'}`}>
        <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-3' : 'p-4'}`}>
          <h3 className={`font-bold mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>Total Egresos vs Superávit</h3>
          {chartsReady && (
            <div style={{ width: '100%', height: chartHeight, minHeight: chartHeight }}>
              <ResponsiveContainer width="100%" height={chartHeight}>
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: string | number) => `L ${formatNumber(value, 0)}M`} />
                  {!isMobile && <Legend />}
                  <Bar dataKey="Total Egresos" fill="#0088FE" />
                  <Bar dataKey="Superávit/Déficit" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {!chartsReady && <div style={{ width: '100%', height: chartHeight }} />}
        </div>

        <div className={`bg-white rounded-lg shadow-md overflow-y-auto max-h-96 ${isMobile ? 'p-3' : ''}`}>
          <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className={`text-left font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>Año</th>
                <th className={`text-right font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>
                  Total Egresos
                </th>
                <th className={`text-right font-semibold ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>
                  Superávit/Déficit
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {selectedMunicipalityData.map((mun, idx) => (
                <tr key={idx} className={mun.superavit_deficit > 0 ? 'bg-green-50' : 'bg-red-50'}>
                  <td className={`font-bold text-blue-700 ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>{mun.year}</td>
                  <td className={`text-right ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}>
                    {formatCurrency(mun.total_egresos)}
                  </td>
                  <td
                    className={`text-right font-bold ${
                      mun.superavit_deficit > 0 ? 'text-green-600' : 'text-red-600'
                    } ${isMobile ? 'px-2 py-2' : 'px-3 py-2'}`}
                  >
                    {formatCurrency(mun.superavit_deficit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderKPICards = () => {
    if (selectedMunicipalityData.length === 0) return null;

    const latestYear = selectedMunicipalityData[0];

    const kpis = [
      {
        title: 'Presupuesto Total',
        value: formatCurrency(latestYear.presupuesto_municipal),
        icon: '💰',
        color: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-700',
      },
      {
        title: 'Autonomía',
        value: `${latestYear.autonomia_financiera?.toFixed(2) || '0.00'}%`,
        icon: '📈',
        color: 'bg-purple-50 border-purple-200',
        textColor: 'text-purple-700',
      },
      {
        title: 'Superávit/Déficit',
        value: formatCurrency(latestYear.superavit_deficit),
        icon: latestYear.superavit_deficit > 0 ? '✅' : '⚠️',
        color: latestYear.superavit_deficit > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200',
        textColor: latestYear.superavit_deficit > 0 ? 'text-emerald-700' : 'text-red-700',
      },
      {
        title: 'Población',
        value: formatNumber(latestYear.population, 0),
        icon: '👥',
        color: 'bg-orange-50 border-orange-200',
        textColor: 'text-orange-700',
      },
    ];

    return (
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {kpis.map((kpi, index) => (
          <div
            key={index}
            className={`border-l-4 rounded-lg p-4 ${kpi.color} shadow-sm hover:shadow-md transition`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <p className={`text-gray-600 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>{kpi.title}</p>
                <p className={`font-bold mt-1 ${kpi.textColor} ${isMobile ? 'text-lg' : 'text-2xl'}`}>{kpi.value}</p>
              </div>
              <span className={isMobile ? 'text-2xl ml-2' : 'text-3xl ml-2'}>{kpi.icon}</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTab = () => {
    switch (activeTab) {
      case 'general':
        return renderGeneralTab();
      case 'presupuesto':
        return renderPresupuestoTab();
      case 'tributarios':
        return renderTributariosTab();
      case 'capital':
        return renderCapitalTab();
      case 'funcionamiento':
        return renderFuncionamientoTab();
      case 'capital_deuda':
        return renderCapitalDeudaTab();
      case 'egresos':
        return renderEgresosTab();
      default:
        return renderGeneralTab();
    }
  };

  // ── Filter UI helpers ─────────────────────────────────────────────────────

  const MOCK_DEPTS: any[] = (DEPARTAMENTOS as any[])
    .sort((a: any, b: any) => a.nombre.localeCompare(b.nombre, 'es'));

  const FLABEL: React.CSSProperties = {
    fontSize: 9, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace",
    letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8,
    display: 'block',
  };
  const PILL: React.CSSProperties = {
    border: '1px solid #1f2937', background: 'transparent', color: '#9ca3af',
    borderRadius: 6, padding: '8px 16px', cursor: 'pointer', fontSize: 12,
    fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1,
  };
  const PILL_ON: React.CSSProperties = {
    ...PILL, background: '#2dd4bf', color: '#0a0f1a', fontWeight: 600,
    border: '1px solid #2dd4bf',
  };

  const presupuestoLabel = presupuestoMin === 0
    ? 'Sin mínimo'
    : `L ${(presupuestoMin / 1_000_000).toFixed(0)} M`;

  return (
    <DashboardLayout title="Datos Financieros">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* ── HEADER ROW ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{
              fontSize: 10, color: '#2dd4bf', fontFamily: "'IBM Plex Mono', monospace",
              letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: 4,
            }}>
              BASE DE DATOS MUNICIPAL
            </div>
            <div style={{
              fontSize: 36, fontWeight: 700, color: '#e8eef6', lineHeight: 1.1,
              fontFamily: "'Barlow Condensed', sans-serif",
            }}>
              Datos Financieros
            </div>
            <div style={{ fontSize: 13, color: '#7c8aa3', marginTop: 6, fontFamily: "'IBM Plex Mono', monospace" }}>
              298 registros · ejercicio 2024
            </div>
          </div>
        </div>

        {/* ── FILTER CARD ── */}
        <div style={{
          background: '#111827', border: '1px solid #1f2937',
          borderRadius: 8, padding: 20,
        }}>
          {/* Row 1 — 3 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 20, marginBottom: 20 }}>

            {/* AÑO pills */}
            <div>
              <span style={FLABEL}>AÑO</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[2021, 2022, 2023, 2024, 2025].map(y => (
                  <button key={y}
                    onClick={() => setSelectedYears([y])}
                    style={selectedYears.includes(y) ? PILL_ON : PILL}>
                    {y}
                  </button>
                ))}
              </div>
            </div>

            {/* DEPARTAMENTO dropdown */}
            <div>
              <span style={FLABEL}>DEPARTAMENTO</span>
              <select
                className="simho-select"
                value={selectedDeptId}
                onChange={e => { setSelectedDeptId(e.target.value); setSelectedMuniId(''); setSelectedMunicipality(''); }}
              >
                <option value="">Todos los Departamentos</option>
                {MOCK_DEPTS.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.nombre}</option>
                ))}
              </select>
            </div>

            {/* BUSCAR MUNICIPIO text input */}
            <div>
              <span style={FLABEL}>BUSCAR MUNICIPIO</span>
              <input
                type="text"
                value={muniSearch}
                onChange={e => setMuniSearch(e.target.value)}
                placeholder="Nombre..."
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#0d1628', border: '1px solid rgba(0,212,184,0.25)',
                  borderRadius: 8, color: '#e8eef6',
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: 12,
                  padding: '9px 12px', outline: 'none',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(0,212,184,0.65)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,212,184,0.12)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(0,212,184,0.25)'; e.currentTarget.style.boxShadow = 'none'; }}
              />
            </div>
          </div>

          {/* MUNICIPIO dropdown — visible cuando hay depto seleccionado */}
          {selectedDeptId !== '' && (
            <div style={{ marginBottom: 20 }}>
              <span style={FLABEL}>
                MUNICIPIO
                {muniOptions.length > 0 && (
                  <span style={{ color: '#4a5a73', marginLeft: 8 }}>({muniOptions.length})</span>
                )}
              </span>
              <select
                className="simho-select"
                value={selectedMuniId}
                onChange={e => {
                  const id = e.target.value;
                  setSelectedMuniId(id);
                  const m = getMunicipio(id);
                  setSelectedMunicipality(m?.nombre || '');
                }}
              >
                <option value="">— Seleccionar municipio —</option>
                {muniOptions.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Row 2 — 2 columns */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* CATEGORÍA pills */}
            <div>
              <span style={FLABEL}>CATEGORÍA</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {['Todas', 'A', 'B', 'C', 'D'].map(cat => {
                  const isActive = cat === 'Todas' ? selectedCategoria === '' : selectedCategoria === cat;
                  return (
                    <button key={cat}
                      onClick={() => setSelectedCategoria(cat === 'Todas' ? '' : cat)}
                      style={isActive ? PILL_ON : PILL}>
                      {cat}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* PRESUPUESTO MÍN slider */}
            <div>
              <span style={FLABEL}>
                PRESUPUESTO MÍN ·{' '}
                <span style={{ color: '#2dd4bf' }}>{presupuestoLabel}</span>
              </span>
              <input
                type="range"
                className="simho-slider"
                min={0} max={500000000} step={10000000}
                value={presupuestoMin}
                onChange={e => setPresupuestoMin(Number(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* KPI CARDS — mock data (always available) */}
        {selectedMockMuni && (() => {
          const m = selectedMockMuni;
          const autonomia = m.presupuesto > 0 ? (m.ingresosPropios / m.presupuesto * 100) : 0;
          const fmtM = (n: number) => n >= 1_000_000_000
            ? `L ${(n / 1_000_000_000).toFixed(1)} mil M`
            : n >= 1_000_000
              ? `L ${(n / 1_000_000).toFixed(1)} M`
              : n > 0 ? `L ${n.toLocaleString('es-HN')}` : '—';
          const fmtPop = new Intl.NumberFormat('es-HN');
          const kpis = [
            { title: 'Presupuesto',      value: fmtM(m.presupuesto),                   color: '#2dd4bf' },
            { title: 'Ingresos Propios', value: fmtM(m.ingresosPropios),               color: '#2dd4bf' },
            { title: 'Transferencias',   value: fmtM(m.transferencia),                  color: '#f59e0b' },
            { title: 'Autonomía',        value: `${autonomia.toFixed(1)}%`,              color: '#8b5cf6' },
            { title: 'Población',        value: fmtPop.format(m.poblacion) + ' hab.',   color: '#e8eef6' },
            { title: 'IDH',              value: m.idh > 0 ? m.idh.toFixed(3) : '—',    color: '#f59e0b' },
          ];
          return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Muni header */}
              <div style={{
                background: '#111827', border: '1px solid #1f2937', borderRadius: 8,
                padding: '16px 20px', display: 'flex', alignItems: 'baseline', gap: 12,
              }}>
                <span style={{
                  fontSize: 28, fontWeight: 700, color: '#e8eef6',
                  fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1,
                }}>
                  {m.nombre}
                </span>
                <span style={{
                  fontSize: 10, color: '#5eead4', background: 'rgba(94,234,212,0.1)',
                  border: '1px solid rgba(94,234,212,0.3)', borderRadius: 4,
                  padding: '2px 8px', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em',
                }}>
                  {m.departamento.toUpperCase()}
                </span>
                {m.isCapital && (
                  <span style={{
                    fontSize: 10, color: '#f59e0b', background: 'rgba(245,158,11,0.12)',
                    border: '1px solid rgba(245,158,11,0.4)', borderRadius: 4,
                    padding: '2px 8px', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em',
                  }}>
                    CAPITAL DEPARTAMENTAL
                  </span>
                )}
              </div>
              {/* KPI grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
                {kpis.map(k => (
                  <div key={k.title} style={{
                    background: '#111827', border: '1px solid #1f2937',
                    borderRadius: 8, padding: '14px 16px',
                  }}>
                    <div style={{
                      fontSize: 9, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace",
                      letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 6,
                    }}>
                      {k.title}
                    </div>
                    <div style={{
                      fontSize: 20, fontWeight: 700, color: k.color,
                      fontFamily: "'Barlow Condensed', sans-serif", lineHeight: 1.1,
                      whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                    }}>
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {/* KPI CARDS — Supabase data (when available) */}
        {selectedMunicipalityData.length > 0 && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
            <h2 className={`font-bold mb-4 text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
              Datos del Año {selectedMunicipalityData[0].year}
            </h2>
            {renderKPICards()}
          </div>
        )}

        {/* TABS — Supabase data */}
        {selectedMunicipalityData.length > 0 && (
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="flex border-b overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`font-semibold whitespace-nowrap transition ${
                    activeTab === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-3 text-sm'}`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className={isMobile ? 'p-3' : 'p-6'}>{renderTab()}</div>
          </div>
        )}

        {/* TABLA SEFIN — visible cuando no hay municipio seleccionado */}
        {!selectedMockMuni && !selectedMunicipality && (
          <div style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, overflow: 'hidden' }}>
            <div style={{
              padding: '12px 20px', borderBottom: '1px solid #1f2937',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 10, color: '#7c8aa3', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.12em', textTransform: 'uppercase' }}>
                {sefinTableData.length} municipios · {selectedYears[0] ?? 2024} · {SEFIN_COLUMNS.length} columnas SEFIN
              </span>
            </div>
            <div style={{ overflowX: 'auto', maxHeight: '70vh', overflowY: 'auto' }}>
              <table style={{ width: 'max-content', borderCollapse: 'collapse', fontSize: 11, fontFamily: "'IBM Plex Mono', monospace" }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                  <tr style={{ borderBottom: '2px solid #1f2937' }}>
                    {SEFIN_COLUMNS.map(col => (
                      <th key={col.key} style={{
                        padding: '8px 10px', color: '#4a5a73', fontWeight: 600,
                        letterSpacing: '0.06em', textTransform: 'uppercase', fontSize: 8,
                        textAlign: col.isText ? 'left' : 'right',
                        background: '#0d1628', whiteSpace: 'nowrap',
                        borderRight: '1px solid #1f2937',
                      }}>
                        {col.header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sefinTableData.map((m, i) => {
                    const catKey = normalize(m.name || '');
                    const cat = categoriaByName.get(catKey) || '';
                    const codDep = COD_DEP_MAP[normalize(m.department || '')] || '';
                    const catColor: Record<string, string> = { A: '#2dd4bf', B: '#60a5fa', C: '#f59e0b', D: '#a78bfa' };
                    const row: Record<string, any> = {
                      no_mun: i + 1,
                      cod_dep: codDep,
                      cod_mun: m.code != null ? String(m.code) : '',
                      department: m.department || '',
                      name: m.name || '',
                      categoria: cat,
                      population: m.population,
                      presupuesto_municipal: m.presupuesto_municipal,
                      gastos_presupuestados: m.gastos_presupuestados,
                      ingresos_propios: m.ingresos_propios,
                      ingresos_recaudados: m.ingresos_recaudados,
                      autonomia_financiera: m.autonomia_financiera,
                      ingresos_corrientes: m.ingresos_corrientes,
                      ingresos_tributarios: m.ingresos_tributarios,
                      impuesto_bi: m.impuesto_bi,
                      impuesto_personal: m.impuesto_personal,
                      impuesto_industria: m.impuesto_industria,
                      impuesto_comercio: m.impuesto_comercio,
                      impuesto_servicios: m.impuesto_servicios,
                      impuesto_pecuario: m.impuesto_pecuario,
                      impuesto_extraccion: m.impuesto_extraccion,
                      impuesto_telecomunicaciones: m.impuesto_telecomunicaciones,
                      tasas_servicios: m.tasas_servicios,
                      derechos: m.derechos,
                      ingresos_no_tributarios: m.ingresos_no_tributarios,
                      ingresos_capital: m.ingresos_capital,
                      prestamos: m.prestamos,
                      venta_activos: m.venta_activos,
                      contribuciones: m.contribuciones,
                      colocacion_bonos: m.colocacion_bonos,
                      transferencias_art91: m.transferencias_art91,
                      otras_transferencias: m.otras_transferencias,
                      subsidios: m.subsidios,
                      herencias_legados: m.herencias_legados,
                      otros_ingresos_capital: m.otros_ingresos_capital,
                      recursos_balance: m.recursos_balance,
                      gastos_funcionamiento: m.gastos_funcionamiento,
                      servicios_personales: m.servicios_personales,
                      servicios_no_personales: m.servicios_no_personales,
                      materiales_suministro: m.materiales_suministro,
                      transferencias_corrientes: m.transferencias_corrientes,
                      otros_gastos: m.otros_gastos,
                      gastos_capital_deuda: m.gastos_capital_deuda,
                      bienes_capitalizables: m.bienes_capitalizables,
                      transferencias_capital: m.transferencias_capital,
                      activos_financieros: m.activos_financieros,
                      servicios_deuda: m.servicios_deuda,
                      otros_gastos_capital: m.otros_gastos_capital,
                      asignaciones_globales: m.asignaciones_globales,
                      total_egresos: m.total_egresos,
                      superavit_deficit: m.superavit_deficit,
                      gasto_corriente: m.gasto_corriente,
                      ingreso_corriente_ajustado: m.ingreso_corriente_ajustado,
                    };
                    return (
                      <tr key={`${m.id}-${m.year}`}
                        onClick={() => setSelectedMunicipality(m.name || '')}
                        style={{ borderBottom: '1px solid #1a2232', cursor: 'pointer', transition: 'background 0.15s' }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0d1628')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {SEFIN_COLUMNS.map(col => {
                          const val = row[col.key];
                          if (col.isText) {
                            return (
                              <td key={col.key} style={{
                                padding: '8px 10px', whiteSpace: 'nowrap', borderRight: '1px solid #1a2232',
                                color: col.key === 'name' ? '#e8eef6'
                                  : col.key === 'categoria' ? (catColor[val] || '#9ca3af')
                                  : '#7c8aa3',
                                fontWeight: col.key === 'name' ? 600 : 400,
                              }}>
                                {val}
                              </td>
                            );
                          }
                          const num = val == null ? 0 : Number(val);
                          return (
                            <td key={col.key} style={{
                              padding: '8px 10px', textAlign: 'right', whiteSpace: 'nowrap',
                              borderRight: '1px solid #1a2232',
                              color: col.key === 'superavit_deficit'
                                ? (num >= 0 ? '#2dd4bf' : '#f87171')
                                : '#9ca3af',
                            }}>
                              {num.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                  {sefinTableData.length === 0 && (
                    <tr>
                      <td colSpan={SEFIN_COLUMNS.length} style={{ padding: '32px 16px', textAlign: 'center', color: '#4a5a73' }}>
                        {municipalities.length === 0 ? 'Cargando datos SEFIN...' : 'Sin municipios para los filtros seleccionados'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>  {/* end flex column */}
    </DashboardLayout>
  );
};

export default PresupuestarioPage;