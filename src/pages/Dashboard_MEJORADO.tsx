import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import EnhancedKPICard from '../components/EnhancedKPICard.tsx';
import AdvancedAnalysisChart from '../components/AdvancedAnalysisChart.tsx';

const Dashboard = () => {
  // ✅ Estado para el año seleccionado (por defecto 2024)
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  // Cargar datos de todos los años disponibles
  const { municipalities, loading, error } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024]);

  // ✅ Filtrar municipios por año seleccionado
  const municipalitiesByYear = useMemo(() => {
    return municipalities.filter((m) => m.year === selectedYear);
  }, [municipalities, selectedYear]);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error al cargar datos: {error}
        </div>
      </DashboardLayout>
    );
  }

  // Calcular stats con datos filtrados por año
  const totalMunicipios = municipalitiesByYear.length;
  const poblacionTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.population || 0), 0);
  const presupuestoTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.presupuesto_municipal || 0), 0);
  const ingresosTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.ingresos_propios || 0), 0);
  const autonomiaPromedio = totalMunicipios > 0 
    ? (municipalitiesByYear.reduce((sum, m) => sum + (m.autonomia_financiera || 0), 0) / totalMunicipios).toFixed(2)
    : '0.00';
  const poblacionPromedio = totalMunicipios > 0 ? Math.round(poblacionTotal / totalMunicipios) : 0;

  // Datos por departamento para gráficos
  const deptMap = {};
  municipalitiesByYear.forEach((mun) => {
    if (!deptMap[mun.department]) {
      deptMap[mun.department] = [];
    }
    deptMap[mun.department].push(mun);
  });

  const poblacionPorDept = Object.entries(deptMap)
    .map(([dept, muns]) => ({
      name: dept.substring(0, 12),
      value: muns.reduce((sum, m) => sum + (m.population || 0), 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const presupuestoPorDept = Object.entries(deptMap)
    .map(([dept, muns]) => ({
      name: dept.substring(0, 12),
      value: muns.reduce((sum, m) => sum + (m.presupuesto_municipal || 0), 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  // Datos para mini gráficos (simulación de tendencia)
  const trendData = [
    { value: 20 },
    { value: 40 },
    { value: 30 },
    { value: 50 },
    { value: 45 },
    { value: 60 },
    { value: 55 },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header con selector de año */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Dashboard Municipal Honduras</h1>
            <p className="text-gray-600">Análisis consolidado de {totalMunicipios} municipios | {Object.keys(deptMap).length} departamentos</p>
          </div>

          {/* ✅ SELECTOR DE AÑO */}
          <div className="flex gap-2">
            {[2021, 2022, 2023, 2024].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-lg font-semibold transition ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* KPIs Mejorados */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <EnhancedKPICard
            title="Total Municipios"
            value={totalMunicipios}
            icon="🏛️"
            color="blue"
            description="Municipios registrados"
            trendValue="+0.0%"
            trend="neutral"
            sparkData={trendData}
          />
          <EnhancedKPICard
            title="Población Total"
            value={`${(poblacionTotal / 1000000).toFixed(1)}M`}
            icon="👥"
            color="green"
            description={`${poblacionPromedio.toLocaleString('es-HN')} prom`}
            trendValue="+2.3%"
            trend="up"
            sparkData={trendData}
          />
          <EnhancedKPICard
            title="Presupuesto Total"
            value={`L ${(presupuestoTotal / 1000000000).toFixed(1)}B`}
            icon="💰"
            color="purple"
            description={`L ${totalMunicipios > 0 ? (presupuestoTotal / totalMunicipios / 1000000).toFixed(0) : '0'}M prom`}
            trendValue="+1.8%"
            trend="up"
            sparkData={trendData}
          />
          <EnhancedKPICard
            title="Autonomía Promedio"
            value={`${autonomiaPromedio}%`}
            icon="📊"
            color="orange"
            description="Financiera"
            trendValue="+0.5%"
            trend="up"
            sparkData={trendData}
          />
        </div>

        {/* Segunda fila de KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <EnhancedKPICard
            title="Ingresos Propios"
            value={`L ${(ingresosTotal / 1000000000).toFixed(1)}B`}
            icon="📈"
            color="indigo"
            description={`${presupuestoTotal > 0 ? ((ingresosTotal / presupuestoTotal) * 100).toFixed(1) : '0.0'}% del presupuesto`}
            trendValue="+3.2%"
            trend="up"
            sparkData={trendData}
          />
          <EnhancedKPICard
            title="Departamentos"
            value={Object.keys(deptMap).length}
            icon="🗺️"
            color="red"
            description="Cobertura nacional"
            trendValue="100%"
            trend="neutral"
            sparkData={trendData}
          />
          <EnhancedKPICard
            title="Municipio Mayor"
            value="Tegucigalpa"
            icon="🌟"
            color="green"
            description={`${municipalitiesByYear
              .filter((m) => m.name === 'Tegucigalpa')
              .map((m) => `${(m.population || 0).toLocaleString('es-HN')} hab`)[0] || 'N/A'}`}
            sparkData={trendData}
          />
        </div>

        {/* Gráficos principales */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdvancedAnalysisChart
            data={poblacionPorDept}
            title={`Top 10 Departamentos por Población (${selectedYear})`}
            type="bar"
          />
          <AdvancedAnalysisChart
            data={presupuestoPorDept}
            title={`Top 10 Departamentos por Presupuesto (${selectedYear})`}
            type="bar"
          />
        </div>

        {/* Tabla de municipios */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-bold text-gray-900">Municipios Registrados ({selectedYear})</h3>
            <p className="text-gray-600 text-sm">Total: {totalMunicipios} municipios</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Municipio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Departamento
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Población
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Presupuesto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">
                    Ingresos Propios
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {municipalitiesByYear.slice(0, 10).map((municipio) => (
                  <tr key={municipio.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {municipio.name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{municipio.department}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {(municipio.population || 0).toLocaleString('es-HN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      L {(municipio.presupuesto_municipal || 0).toLocaleString('es-HN')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      L {(municipio.ingresos_propios || 0).toLocaleString('es-HN')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer stats */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-8 text-white">
          <h3 className="text-xl font-bold mb-4">Estadísticas Consolidadas - Año {selectedYear}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-blue-100 text-sm">Total de Municipios</p>
              <p className="text-2xl font-bold">{totalMunicipios}</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Población Promedio</p>
              <p className="text-2xl font-bold">{(poblacionPromedio / 1000).toFixed(1)}K</p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Presupuesto Promedio</p>
              <p className="text-2xl font-bold">
                L {totalMunicipios > 0 ? (presupuestoTotal / totalMunicipios / 1000000).toFixed(0) : '0'}M
              </p>
            </div>
            <div>
              <p className="text-blue-100 text-sm">Autonomía Promedio</p>
              <p className="text-2xl font-bold">{autonomiaPromedio}%</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;