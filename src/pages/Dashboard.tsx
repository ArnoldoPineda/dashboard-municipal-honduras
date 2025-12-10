import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import EnhancedKPICard from '../components/EnhancedKPICard.tsx';
import AdvancedAnalysisChart from '../components/AdvancedAnalysisChart.tsx';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { AdaptiveTable } from '../components/COMPONENTES_ADAPTATIVOS';

const Dashboard = () => {
  const { isMobile, isTablet } = useMediaQuery();
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [chartsReady, setChartsReady] = useState(false);

  const { municipalities, loading, error } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024]);

  const municipalitiesByYear = useMemo(() => {
    return municipalities.filter((m) => m.year === selectedYear);
  }, [municipalities, selectedYear]);

  // Esperar a que el DOM esté listo antes de renderizar gráficos
  useEffect(() => {
    const timer = setTimeout(() => {
      setChartsReady(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error al cargar datos: {error}
        </div>
      </DashboardLayout>
    );
  }

  const totalMunicipios = municipalitiesByYear.length;
  const poblacionTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.population || 0), 0);
  const presupuestoTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.presupuesto_municipal || 0), 0);
  const ingresosTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.ingresos_propios || 0), 0);
  const autonomiaPromedio = totalMunicipios > 0 
    ? (municipalitiesByYear.reduce((sum, m) => sum + (m.autonomia_financiera || 0), 0) / totalMunicipios).toFixed(2)
    : '0.00';
  const poblacionPromedio = totalMunicipios > 0 ? Math.round(poblacionTotal / totalMunicipios) : 0;

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

  const trendData = [
    { value: 20 },
    { value: 40 },
    { value: 30 },
    { value: 50 },
    { value: 45 },
    { value: 60 },
    { value: 55 },
  ];

  // TABLA para AdaptiveTable
  const tableColumns = [
    { key: 'name', label: 'Municipio' },
    { key: 'department', label: 'Departamento' },
    { key: 'population', label: 'Población' },
    { key: 'presupuesto_municipal', label: 'Presupuesto' },
  ];

  const tableData = municipalitiesByYear.slice(0, 10).map(m => ({
    name: m.name,
    department: m.department,
    population: (m.population || 0).toLocaleString('es-HN'),
    presupuesto_municipal: `L ${(m.presupuesto_municipal || 0).toLocaleString('es-HN')}`,
  }));

  return (
    <DashboardLayout title="Dashboard Municipal Honduras">
      <div className="space-y-6">
        {/* HEADER - RESPONSIVO */}
        <div className={`${isMobile ? 'space-y-4' : 'flex justify-between items-start'}`}>
          <div>
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Dashboard Municipal Honduras
            </h1>
            <p className={`text-gray-600 ${isMobile ? 'text-xs mt-1' : 'text-sm'}`}>
              Análisis consolidado de {totalMunicipios} municipios | {Object.keys(deptMap).length} departamentos
            </p>
          </div>

          {/* SELECTOR DE AÑO - RESPONSIVO */}
          <div className={`flex gap-2 ${isMobile ? 'flex-wrap' : ''}`}>
            {[2021, 2022, 2023, 2024].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-3 py-2 rounded-lg font-semibold transition ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white shadow-lg'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${isMobile ? 'text-sm' : ''}`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* KPIS - RESPONSIVO */}
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1' 
            : isTablet 
            ? 'grid-cols-2' 
            : 'grid-cols-4'
        }`}>
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

        {/* SEGUNDA FILA KPIS - RESPONSIVO */}
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1' 
            : isTablet 
            ? 'grid-cols-2' 
            : 'grid-cols-3'
        }`}>
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

        {/* GRÁFICOS - RESPONSIVO - SOLO SI CHARTS ESTÁN LISTOS */}
        {chartsReady && (
          <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            <div key={`chart-poblacion-${selectedYear}`}>
              <AdvancedAnalysisChart
                data={poblacionPorDept}
                title={`Top 10 Departamentos por Población (${selectedYear})`}
                type="bar"
              />
            </div>
            <div key={`chart-presupuesto-${selectedYear}`}>
              <AdvancedAnalysisChart
                data={presupuestoPorDept}
                title={`Top 10 Departamentos por Presupuesto (${selectedYear})`}
                type="bar"
              />
            </div>
          </div>
        )}

        {/* TABLA - RESPONSIVA (TABLA EN DESKTOP, CARDS EN MOBILE) */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className={`border-b border-gray-200 ${isMobile ? 'p-4' : 'p-6'}`}>
            <h3 className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              Municipios Registrados ({selectedYear})
            </h3>
            <p className={`text-gray-600 ${isMobile ? 'text-xs mt-1' : 'text-sm'}`}>
              Total: {totalMunicipios} municipios
            </p>
          </div>
          <div className={isMobile ? 'p-4' : ''}>
            <AdaptiveTable 
              columns={tableColumns}
              data={tableData}
              isMobile={isMobile}
            />
          </div>
        </div>

        {/* FOOTER STATS - RESPONSIVO */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white">
          <div className={isMobile ? 'p-6' : 'p-8'}>
            <h3 className={`font-bold mb-4 ${isMobile ? 'text-lg' : 'text-xl'}`}>
              Estadísticas Consolidadas - Año {selectedYear}
            </h3>
            <div className={`grid gap-4 ${
              isMobile 
                ? 'grid-cols-2' 
                : isTablet 
                ? 'grid-cols-2' 
                : 'grid-cols-4'
            }`}>
              <div>
                <p className={`text-blue-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>Total Municipios</p>
                <p className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>{totalMunicipios}</p>
              </div>
              <div>
                <p className={`text-blue-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>Población Promedio</p>
                <p className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>{(poblacionPromedio / 1000).toFixed(1)}K</p>
              </div>
              <div>
                <p className={`text-blue-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>Presupuesto Prom</p>
                <p className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>
                  L {totalMunicipios > 0 ? (presupuestoTotal / totalMunicipios / 1000000).toFixed(0) : '0'}M
                </p>
              </div>
              <div>
                <p className={`text-blue-100 ${isMobile ? 'text-xs' : 'text-sm'}`}>Autonomía Prom</p>
                <p className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>{autonomiaPromedio}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;