import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import EnhancedKPICard from '../components/EnhancedKPICard.tsx';
import AdvancedAnalysisChart from '../components/AdvancedAnalysisChart.tsx';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { AdaptiveTable } from '../components/COMPONENTES_ADAPTATIVOS';

// SKELETON LOADER COMPONENT
const SkeletonKPI = ({ isMobile }: { isMobile: boolean }) => (
  <div style={{
    backgroundColor: '#f3f4f6',
    borderRadius: '0.5rem',
    padding: isMobile ? '1rem' : '1.5rem',
    animation: 'pulse 2s infinite'
  }}>
    <div style={{ height: '1rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem', marginBottom: '0.5rem' }}></div>
    <div style={{ height: '2rem', backgroundColor: '#e5e7eb', borderRadius: '0.25rem' }}></div>
  </div>
);

const SkeletonChart = ({ height }: { height: number }) => (
  <div style={{
    width: '100%',
    height: `${height}px`,
    backgroundColor: '#f3f4f6',
    borderRadius: '0.5rem',
    animation: 'pulse 2s infinite'
  }}></div>
);

const Dashboard = () => {
  const { isMobile, isTabletSmall, isTablet, isDesktop, isLargeDesktop } = useMediaQuery();
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  const { municipalities, loading, error } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024]);

  const municipalitiesByYear = useMemo(() => {
    return municipalities.filter((m) => m.year === selectedYear);
  }, [municipalities, selectedYear]);

  if (error) {
    return (
      <DashboardLayout title="Dashboard">
        <div style={{ 
          backgroundColor: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '0.5rem', 
          padding: '1rem', 
          color: '#991b1b' 
        }}>
          Error al cargar datos: {error}
        </div>
      </DashboardLayout>
    );
  }

  // Calcular datos (aunque loading sea true, usamos datos disponibles o defaults)
  const totalMunicipios = municipalitiesByYear.length;
  const poblacionTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.population || 0), 0);
  const presupuestoTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.presupuesto_municipal || 0), 0);
  const ingresosTotal = municipalitiesByYear.reduce((sum, m) => sum + (m.ingresos_propios || 0), 0);
  const autonomiaPromedio =
    totalMunicipios > 0
      ? (
          municipalitiesByYear.reduce((sum, m) => sum + (m.autonomia_financiera || 0), 0) / totalMunicipios
        ).toFixed(2)
      : '0.00';
  const poblacionPromedio = totalMunicipios > 0 ? Math.round(poblacionTotal / totalMunicipios) : 0;

  const deptMap: any = {};
  municipalitiesByYear.forEach((mun) => {
    if (!deptMap[mun.department]) {
      deptMap[mun.department] = [];
    }
    deptMap[mun.department].push(mun);
  });

  const poblacionPorDept = Object.entries(deptMap)
    .map(([dept, muns]) => ({
      name: (dept as string).substring(0, 12),
      value: (muns as any[]).reduce((sum, m: any) => sum + (m.population || 0), 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const presupuestoPorDept = Object.entries(deptMap)
    .map(([dept, muns]) => ({
      name: (dept as string).substring(0, 12),
      value: (muns as any[]).reduce((sum, m: any) => sum + (m.presupuesto_municipal || 0), 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 10);

  const trendData = [{ value: 20 }, { value: 40 }, { value: 30 }, { value: 50 }, { value: 45 }, { value: 60 }, { value: 55 }];

  const tableColumns = [
    { key: 'name', label: 'Municipio' },
    { key: 'department', label: 'Departamento' },
    { key: 'population', label: 'Población' },
    { key: 'presupuesto_municipal', label: 'Presupuesto' },
  ];

  const tableData = municipalitiesByYear.slice(0, 10).map((m) => ({
    name: m.name,
    department: m.department,
    population: (m.population || 0).toLocaleString('es-HN'),
    presupuesto_municipal: `L ${(m.presupuesto_municipal || 0).toLocaleString('es-HN')}`,
  }));

  // ALTURA DINÁMICA DE GRÁFICOS POR BREAKPOINT
  const chartHeight = isMobile 
    ? 300 
    : isTabletSmall 
    ? 280 
    : isTablet 
    ? 280 
    : 320;

  return (
    <DashboardLayout title="Dashboard Municipal Honduras">
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* HEADER */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem'
        }}>
          <div>
            <h1 style={{
              fontWeight: 'bold',
              color: '#111827',
              fontSize: isMobile ? '1.5rem' : '1.875rem',
              margin: 0
            }}>
              Dashboard Municipal Honduras
            </h1>
            <p style={{
              color: '#4b5563',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              marginTop: isMobile ? '0.25rem' : '0',
              margin: 0,
              opacity: loading ? 0.5 : 1
            }}>
              Análisis consolidado de {totalMunicipios} municipios | {Object.keys(deptMap).length} departamentos
            </p>
          </div>

          {/* SELECTOR DE AÑO - MEJORADO */}
          <div style={{ 
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '0.75rem',
            width: isMobile ? '100%' : 'auto'
          }}>
            {[2021, 2022, 2023, 2024].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                disabled={loading}
                style={{
                  padding: isMobile ? '0.75rem 1rem' : '0.6rem 1.2rem',
                  borderRadius: '0.5rem',
                  fontWeight: '600',
                  border: 'none',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  backgroundColor: selectedYear === year ? '#2563eb' : '#e5e7eb',
                  color: selectedYear === year ? 'white' : '#374151',
                  fontSize: isMobile ? '1rem' : '1rem',
                  transition: 'all 0.2s',
                  boxShadow: selectedYear === year ? '0 10px 15px rgba(0,0,0,0.1)' : 'none',
                  opacity: loading ? 0.5 : 1,
                  minHeight: isMobile ? '44px' : 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* KPIS ROW 1 - MEJORADA */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile 
            ? 'repeat(2, 1fr)' 
            : isTablet
            ? 'repeat(3, 1fr)'
            : 'repeat(4, 1fr)',
          gap: '1rem'
        }}>
          {loading ? (
            <>
              <SkeletonKPI isMobile={isMobile} />
              <SkeletonKPI isMobile={isMobile} />
              <SkeletonKPI isMobile={isMobile} />
              <SkeletonKPI isMobile={isMobile} />
            </>
          ) : (
            <>
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
                description={`L ${
                  totalMunicipios > 0 ? (presupuestoTotal / totalMunicipios / 1000000).toFixed(0) : '0'
                }M prom`}
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
            </>
          )}
        </div>

        {/* KPIS ROW 2 - MEJORADA */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile 
            ? 'repeat(2, 1fr)' 
            : isTablet
            ? 'repeat(2, 1fr)'
            : 'repeat(3, 1fr)',
          gap: '1rem'
        }}>
          {loading ? (
            <>
              <SkeletonKPI isMobile={isMobile} />
              <SkeletonKPI isMobile={isMobile} />
              <SkeletonKPI isMobile={isMobile} />
            </>
          ) : (
            <>
              <EnhancedKPICard
                title="Ingresos Propios"
                value={`L ${(ingresosTotal / 1000000000).toFixed(1)}B`}
                icon="📈"
                color="indigo"
                description={`${
                  presupuestoTotal > 0 ? ((ingresosTotal / presupuestoTotal) * 100).toFixed(1) : '0.0'
                }% del presupuesto`}
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
                description={`${
                  municipalitiesByYear
                    .filter((m) => m.name === 'Tegucigalpa')
                    .map((m) => `${(m.population || 0).toLocaleString('es-HN')} hab`)[0] || 'N/A'
                }`}
                sparkData={trendData}
              />
            </>
          )}
        </div>

        {/* GRÁFICOS - MEJORADOS */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: isMobile 
            ? '1fr' 
            : isTablet
            ? 'repeat(2, 1fr)'
            : 'repeat(2, 1fr)',
          gap: '1.5rem'
        }}>
          <div style={{ width: '100%', height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}>
            {loading ? (
              <SkeletonChart height={chartHeight} />
            ) : poblacionPorDept.length > 0 ? (
              <AdvancedAnalysisChart
                data={poblacionPorDept}
                title={`Top 10 Departamentos por Población (${selectedYear})`}
                type="bar"
              />
            ) : null}
          </div>
          <div style={{ width: '100%', height: `${chartHeight}px`, minHeight: `${chartHeight}px` }}>
            {loading ? (
              <SkeletonChart height={chartHeight} />
            ) : presupuestoPorDept.length > 0 ? (
              <AdvancedAnalysisChart
                data={presupuestoPorDept}
                title={`Top 10 Departamentos por Presupuesto (${selectedYear})`}
                type="bar"
              />
            ) : null}
          </div>
        </div>

        {/* TABLA */}
        <div style={{ 
          backgroundColor: 'white', 
          borderRadius: '0.5rem', 
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)', 
          overflow: 'hidden' 
        }}>
          <div style={{
            borderBottom: '1px solid #e5e7eb',
            padding: isMobile ? '1rem' : '1.5rem'
          }}>
            <h3 style={{
              fontWeight: 'bold',
              color: '#111827',
              fontSize: isMobile ? '1.125rem' : '1.25rem',
              margin: 0,
              opacity: loading ? 0.5 : 1
            }}>
              Municipios Registrados ({selectedYear})
            </h3>
            <p style={{
              color: '#4b5563',
              fontSize: isMobile ? '0.75rem' : '0.875rem',
              marginTop: isMobile ? '0.25rem' : '0',
              margin: 0,
              opacity: loading ? 0.5 : 1
            }}>
              Total: {totalMunicipios} municipios
            </p>
          </div>
          <div style={{ padding: isMobile ? '1rem' : '0', opacity: loading ? 0.5 : 1 }}>
            {loading ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#9ca3af' }}>
                Cargando datos...
              </div>
            ) : (
              <AdaptiveTable columns={tableColumns} data={tableData} isMobile={isMobile} />
            )}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          background: 'linear-gradient(to right, #2563eb, #9333ea)',
          borderRadius: '0.5rem',
          color: 'white',
          padding: isMobile ? '1.5rem' : '2rem',
          opacity: loading ? 0.5 : 1
        }}>
          <h3 style={{
            fontWeight: 'bold',
            marginBottom: '1rem',
            fontSize: isMobile ? '1.125rem' : '1.25rem',
            margin: 0
          }}>
            Estadísticas Consolidadas - Año {selectedYear}
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)',
            gap: '1rem',
            marginTop: '1rem'
          }}>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.75rem' : '0.875rem', margin: 0 }}>
                Total Municipios
              </p>
              <p style={{ fontWeight: 'bold', fontSize: isMobile ? '1.125rem' : '1.5rem', margin: 0 }}>
                {totalMunicipios}
              </p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.75rem' : '0.875rem', margin: 0 }}>
                Población Promedio
              </p>
              <p style={{ fontWeight: 'bold', fontSize: isMobile ? '1.125rem' : '1.5rem', margin: 0 }}>
                {(poblacionPromedio / 1000).toFixed(1)}K
              </p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.75rem' : '0.875rem', margin: 0 }}>
                Presupuesto Prom
              </p>
              <p style={{ fontWeight: 'bold', fontSize: isMobile ? '1.125rem' : '1.5rem', margin: 0 }}>
                L {totalMunicipios > 0 ? (presupuestoTotal / totalMunicipios / 1000000).toFixed(0) : '0'}M
              </p>
            </div>
            <div>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.75rem' : '0.875rem', margin: 0 }}>
                Autonomía Prom
              </p>
              <p style={{ fontWeight: 'bold', fontSize: isMobile ? '1.125rem' : '1.5rem', margin: 0 }}>
                {autonomiaPromedio}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;