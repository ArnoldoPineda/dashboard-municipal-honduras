import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
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
} from 'recharts';
import SafeResponsiveContainer from '../components/SafeResponsiveContainer';

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
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedMunicipality, setSelectedMunicipality] = useState<string>('');
  const [selectedYears, setSelectedYears] = useState<number[]>([2024]);
  const [activeTab, setActiveTab] = useState('general');

  // 👇 Estado para evitar parpadeo de Recharts
  const [chartsReady, setChartsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setChartsReady(true), 0);
    return () => clearTimeout(timer);
  }, []);

  const { municipalities, loading, error } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024]);

  const selectedMunicipalityData = useMemo(() => {
    if (!selectedMunicipality) return [];
    return municipalities
      .filter((m) => m.name === selectedMunicipality && selectedYears.includes(m.year))
      .sort((a, b) => b.year - a.year);
  }, [selectedMunicipality, selectedYears, municipalities]);

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

  const departments = Array.from(new Set(allMunicipalities.map((m) => m.department))).sort() as string[];

  const municipalitiesByDept = selectedDepartment ? allMunicipalities.filter((m) => m.department === selectedDepartment) : [];

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
      <div style={{ width: '100%', height: chartHeight }}>
        <SafeResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
            <YAxis />
            <Tooltip formatter={(value: string | number) => `L ${formatNumber(value, 0)}M`} />
            {!isMobile && <Legend />}
            <Bar dataKey="Presupuesto" fill="#0088FE" />
            <Bar dataKey="Egresos" fill="#00C49F" />
          </BarChart>
        </SafeResponsiveContainer>
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
      <div style={{ width: '100%', height: chartHeight }}>
        <SafeResponsiveContainer width="100%" height="100%">
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
        </SafeResponsiveContainer>
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
      <div style={{ width: '100%', height: chartHeight }}>
        <SafeResponsiveContainer width="100%" height="100%">
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
        </SafeResponsiveContainer>
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
            <div style={{ width: '100%', height: chartHeight }}>
              <SafeResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: string | number) => `L ${formatNumber(value, 0)}M`} />
                  {!isMobile && <Legend />}
                  <Bar dataKey="Personales" fill="#0088FE" />
                  <Bar dataKey="No Personales" fill="#00C49F" />
                </BarChart>
              </SafeResponsiveContainer>
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
            <div style={{ width: '100%', height: chartHeight }}>
              <SafeResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis />
                  <Tooltip formatter={(value: string | number) => `L ${formatNumber(value, 0)}M`} />
                  {!isMobile && <Legend />}
                  <Bar dataKey="Total Egresos" fill="#0088FE" />
                  <Bar dataKey="Superávit/Déficit" fill="#82ca9d" />
                </BarChart>
              </SafeResponsiveContainer>
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

  return (
    <DashboardLayout title="Datos Financieros">
      <div className="space-y-6">
        {/* SELECCIONES - RESPONSIVO */}
        <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'} space-y-4`}>
          {/* DEPARTAMENTO */}
          <div>
            <label className={`block font-semibold mb-2 text-gray-900 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Departamento
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedMunicipality('');
                setSelectedYears([2024]);
              }}
              className={`w-full border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 ${
                isMobile ? 'px-3 py-3 text-sm' : 'px-4 py-2'
              }`}
            >
              <option value="">-- Selecciona Departamento --</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* MUNICIPIOS */}
          {selectedDepartment && (
            <div>
              <label className={`block font-semibold mb-2 text-gray-900 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Municipios
              </label>
              <div
                className={`grid gap-2 p-3 border border-gray-300 rounded-lg bg-gray-50 max-h-40 overflow-y-auto ${
                  isMobile ? 'grid-cols-2' : 'grid-cols-3 lg:grid-cols-4'
                }`}
              >
                {municipalitiesByDept.map((mun) => (
                  <label
                    key={mun.name}
                    className={`flex items-center space-x-2 cursor-pointer p-1 hover:bg-blue-100 rounded ${
                      isMobile ? 'text-xs' : 'text-sm'
                    }`}
                  >
                    <input
                      type="radio"
                      name="municipality"
                      value={mun.name}
                      checked={selectedMunicipality === mun.name}
                      onChange={(e) => {
                        setSelectedMunicipality(e.target.value);
                        setSelectedYears([2024]);
                      }}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="text-gray-900">{mun.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* AÑOS */}
          {selectedMunicipality && (
            <div>
              <label className={`block font-semibold mb-2 text-gray-900 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Años para Comparar
              </label>
              <div className="flex gap-2 flex-wrap">
                {[2024, 2023, 2022, 2021].map((year) => (
                  <label
                    key={year}
                    className={`flex items-center space-x-2 border rounded-lg cursor-pointer transition ${
                      isMobile ? 'px-2 py-1 text-xs' : 'px-3 py-2 text-sm'
                    }`}
                    style={{
                      borderColor: selectedYears.includes(year) ? '#2563eb' : '#d1d5db',
                      backgroundColor: selectedYears.includes(year) ? '#dbeafe' : 'transparent',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selectedYears.includes(year)}
                      onChange={() => toggleYear(year)}
                      className="w-4 h-4 accent-blue-600"
                    />
                    <span className="font-medium text-gray-900">{year}</span>
                  </label>
                ))}
              </div>
              <p className={`text-gray-600 mt-2 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Municipio: <span className="font-bold text-blue-700">{selectedMunicipality}</span>
              </p>
            </div>
          )}
        </div>

        {/* KPI CARDS */}
        {selectedMunicipalityData.length > 0 && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
            <h2 className={`font-bold mb-4 text-gray-900 ${isMobile ? 'text-base' : 'text-lg'}`}>
              Datos del Año {selectedMunicipalityData[0].year}
            </h2>
            {renderKPICards()}
          </div>
        )}

        {/* TABS */}
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

        {/* MENSAJE INICIAL */}
        {!selectedMunicipality && (
          <div
            className={`bg-blue-50 border-l-4 border-blue-600 rounded-lg text-center ${
              isMobile ? 'p-4' : 'p-6'
            }`}
          >
            <p className={`text-gray-600 ${isMobile ? 'text-sm' : 'text-lg'}`}>
              👆 Selecciona departamento y municipio para comenzar
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default PresupuestarioPage;