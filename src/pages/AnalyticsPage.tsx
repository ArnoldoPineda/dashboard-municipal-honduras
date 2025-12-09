import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { AdaptiveTable } from '../components/COMPONENTES_ADAPTATIVOS';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, AlertCircle, CheckCircle } from 'lucide-react';

interface MunicipalityMetrics {
  id: string;
  name: string;
  department: string;
  latestYear: number;
  autonomy: number;
  autonomyTrend?: number;
  status: 'critical' | 'warning' | 'healthy';
  deficit: boolean;
}

export default function AnalyticsPage() {
  const { isMobile, isTablet } = useMediaQuery();
  const { municipalities, loading, error } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');

  const departments = useMemo(() => {
    return [...new Set(municipalities.map((m) => m.department).filter(Boolean))].sort();
  }, [municipalities]);

  const municipalityMetrics = useMemo(() => {
    const metrics: MunicipalityMetrics[] = [];
    const byMunicipality = new Map<string, any>();

    municipalities.forEach((m) => {
      if (!byMunicipality.has(m.id)) {
        byMunicipality.set(m.id, {
          id: m.id,
          name: m.name,
          department: m.department,
          years: {},
        });
      }
      byMunicipality.get(m.id).years[m.year] = m;
    });

    byMunicipality.forEach((munData) => {
      if (!munData.name) return;

      const years = Object.keys(munData.years)
        .map((y) => parseInt(y))
        .sort((a, b) => b - a);

      if (years.length > 0) {
        const latestYear = years[0];
        const latestData = munData.years[latestYear];

        const autonomy = latestData.presupuesto_municipal
          ? (latestData.ingresos_propios / latestData.presupuesto_municipal) * 100
          : 0;

        let autonomyTrend = undefined;
        if (years.length > 1) {
          const previousYear = years[1];
          const previousData = munData.years[previousYear];
          const previousAutonomy = previousData.presupuesto_municipal
            ? (previousData.ingresos_propios / previousData.presupuesto_municipal) * 100
            : 0;
          autonomyTrend = autonomy - previousAutonomy;
        }

        const hasDeficit = latestData.ingresos_propios < latestData.presupuesto_municipal * 0.1;

        let status: 'critical' | 'warning' | 'healthy' = 'healthy';
        if (autonomy < 10 && hasDeficit) status = 'critical';
        else if (autonomy < 25) status = 'warning';

        metrics.push({
          id: munData.id,
          name: munData.name,
          department: munData.department,
          latestYear,
          autonomy: Math.round(autonomy * 10) / 10,
          autonomyTrend: autonomyTrend ? Math.round(autonomyTrend * 10) / 10 : undefined,
          status,
          deficit: hasDeficit,
        });
      }
    });

    return metrics.sort((a, b) => b.autonomy - a.autonomy);
  }, [municipalities]);

  const filteredMetrics = useMemo(() => {
    return selectedDepartment
      ? municipalityMetrics.filter((m) => m.department === selectedDepartment)
      : municipalityMetrics;
  }, [municipalityMetrics, selectedDepartment]);

  const autonomyChartData = useMemo(() => {
    return filteredMetrics
      .filter((m) => m.name)
      .sort((a, b) => b.autonomy - a.autonomy)
      .slice(0, 15)
      .map((m) => ({
        name: (m.name || 'Sin Nombre').substring(0, 12),
        fullName: m.name || 'Sin Nombre',
        autonomy: m.autonomy,
        status: m.status,
      }));
  }, [filteredMetrics]);

  const departmentComparison = useMemo(() => {
    if (selectedDepartment) {
      return filteredMetrics
        .filter((m) => m.name)
        .sort((a, b) => b.autonomy - a.autonomy)
        .slice(0, 12)
        .map((m) => ({
          name: (m.name || 'Sin Nombre').substring(0, 10),
          fullName: m.name || 'Sin Nombre',
          autonomia2024: m.autonomy,
          deficit: m.deficit ? 1 : 0,
        }));
    }

    const deptData = new Map<string, any>();
    filteredMetrics.forEach((m) => {
      if (!m.department) return;
      if (!deptData.has(m.department)) {
        deptData.set(m.department, { autonomies: [], count: 0 });
      }
      deptData.get(m.department).autonomies.push(m.autonomy);
      deptData.get(m.department).count++;
    });

    return Array.from(deptData.entries())
      .map(([dept, data]) => ({
        name: (dept || 'Sin Departamento').substring(0, 12),
        fullName: dept || 'Sin Departamento',
        autonomia2024: Math.round((data.autonomies.reduce((a: number, b: number) => a + b, 0) / data.count) * 10) / 10,
        deficit: data.autonomies.filter((a: number) => a < 10).length,
      }))
      .sort((a, b) => b.autonomia2024 - a.autonomia2024)
      .slice(0, 15);
  }, [filteredMetrics, selectedDepartment]);

  const kpis = useMemo(() => {
    const totalMunicipalities = filteredMetrics.length;
    const avgAutonomy =
      totalMunicipalities > 0
        ? Math.round((filteredMetrics.reduce((sum, m) => sum + m.autonomy, 0) / totalMunicipalities) * 10) / 10
        : 0;
    const criticalCount = filteredMetrics.filter((m) => m.status === 'critical').length;
    const warningCount = filteredMetrics.filter((m) => m.status === 'warning').length;

    return {
      totalMunicipalities,
      avgAutonomy,
      criticalCount,
      warningCount,
      healthyCount: totalMunicipalities - criticalCount - warningCount,
    };
  }, [filteredMetrics]);

  const criticalMunicipalities = useMemo(() => {
    return filteredMetrics
      .filter((m) => m.status === 'critical' && m.name)
      .sort((a, b) => a.autonomy - b.autonomy)
      .slice(0, 10);
  }, [filteredMetrics]);

  const warningMunicipalities = useMemo(() => {
    return filteredMetrics
      .filter((m) => m.status === 'warning' && m.name)
      .sort((a, b) => a.autonomy - b.autonomy)
      .slice(0, 10);
  }, [filteredMetrics]);

  // TABLAS PARA AdaptiveTable
  const criticalColumns = [
    { key: 'name', label: 'Municipio' },
    { key: 'department', label: 'Dpto' },
    { key: 'latestYear', label: 'Año' },
    { key: 'autonomy', label: 'Autonomía %' },
  ];

  const criticalTableData = criticalMunicipalities.map((mun) => ({
    name: mun.name,
    department: mun.department,
    latestYear: mun.latestYear,
    autonomy: `${mun.autonomy.toFixed(1)}%`,
  }));

  const warningTableData = warningMunicipalities.map((mun) => ({
    name: mun.name,
    department: mun.department,
    latestYear: mun.latestYear,
    autonomy: `${mun.autonomy.toFixed(1)}%`,
  }));

  if (loading) {
    return (
      <DashboardLayout title="Análisis">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Análisis">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Análisis">
      <div className="space-y-6">
        {/* KPIS - RESPONSIVO */}
        <div className={`grid gap-4 ${
          isMobile 
            ? 'grid-cols-1' 
            : isTablet 
            ? 'grid-cols-2' 
            : 'grid-cols-5'
        }`}>
          <div className={`bg-white rounded-lg shadow p-4 border-l-4 border-blue-600 ${isMobile ? 'p-3' : ''}`}>
            <p className={`text-gray-600 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Total de Municipios</p>
            <p className={`font-bold text-blue-600 mt-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{kpis.totalMunicipalities}</p>
            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : ''}`}>Analizados</p>
          </div>

          <div className={`bg-white rounded-lg shadow p-4 border-l-4 border-green-600 ${isMobile ? 'p-3' : ''}`}>
            <p className={`text-gray-600 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Autonomía Promedio</p>
            <p className={`font-bold text-green-600 mt-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{kpis.avgAutonomy}%</p>
            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : ''}`}>Financiera</p>
          </div>

          <div className={`bg-white rounded-lg shadow p-4 border-l-4 border-yellow-600 ${isMobile ? 'p-3' : ''}`}>
            <p className={`text-gray-600 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>En Advertencia</p>
            <p className={`font-bold text-yellow-600 mt-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{kpis.warningCount}</p>
            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : ''}`}>Municipios</p>
          </div>

          <div className={`bg-white rounded-lg shadow p-4 border-l-4 border-red-600 ${isMobile ? 'p-3' : ''}`}>
            <p className={`text-gray-600 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>En Situación Crítica</p>
            <p className={`font-bold text-red-600 mt-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{kpis.criticalCount}</p>
            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : ''}`}>Municipios</p>
          </div>

          <div className={`bg-white rounded-lg shadow p-4 border-l-4 border-emerald-600 ${isMobile ? 'p-3' : ''}`}>
            <p className={`text-gray-600 font-medium ${isMobile ? 'text-xs' : 'text-sm'}`}>Situación Saludable</p>
            <p className={`font-bold text-emerald-600 mt-2 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>{kpis.healthyCount}</p>
            <p className={`text-gray-500 mt-1 ${isMobile ? 'text-xs' : ''}`}>Municipios</p>
          </div>
        </div>

        {/* FILTRO POR DEPARTAMENTO - RESPONSIVO */}
        <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-3' : 'p-4'}`}>
          <label className={`font-medium text-gray-700 block ${isMobile ? 'text-xs' : 'text-sm'}`}>
            Filtrar por Departamento:
          </label>
          <div className={`flex gap-2 mt-2 ${isMobile ? 'flex-col' : 'flex-row items-center'}`}>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className={`border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${
                isMobile ? 'w-full px-3 py-3 text-sm' : 'px-4 py-2'
              }`}
            >
              <option value="">Todos los Departamentos</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
            {selectedDepartment && (
              <button
                onClick={() => setSelectedDepartment('')}
                className={`bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition ${
                  isMobile ? 'w-full px-3 py-3 text-xs' : 'px-4 py-2 text-sm'
                }`}
              >
                Limpiar filtro
              </button>
            )}
          </div>
        </div>

        {/* GRÁFICOS - RESPONSIVO */}
        <div className={`grid gap-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {/* Autonomía Financiera */}
          <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-4' : 'p-6'}`}>
            <h3 className={`font-bold text-gray-900 mb-4 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
              <CheckCircle size={isMobile ? 16 : 20} />
              Autonomía Financiera
            </h3>
            {autonomyChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <BarChart data={autonomyChartData} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={isMobile ? 60 : 80}
                    interval={0}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <YAxis label={{ value: 'Autonomía (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        return (
                          <div className="bg-white p-3 rounded shadow-lg border border-gray-300">
                            <p className="text-sm font-semibold text-gray-900">
                              {payload[0].payload.fullName}
                            </p>
                            <p className="text-sm text-blue-600">
                              Autonomía: {payload[0].value.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="autonomy" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600 py-8">Sin datos disponibles</p>
            )}
          </div>

          {/* Comparación */}
          <div className={`bg-white rounded-lg shadow-md ${isMobile ? 'p-4' : 'p-6'}`}>
            <h3 className={`font-bold text-gray-900 mb-4 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
              <TrendingUp size={isMobile ? 16 : 20} />
              {selectedDepartment ? `Top Municipios` : 'Top Departamentos'}
            </h3>
            {departmentComparison.length > 0 ? (
              <ResponsiveContainer width="100%" height={isMobile ? 250 : 300}>
                <BarChart data={departmentComparison} margin={{ top: 20, right: 30, left: 0, bottom: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    dataKey="name"
                    angle={-45}
                    textAnchor="end"
                    height={isMobile ? 60 : 80}
                    interval={0}
                    tick={{ fontSize: isMobile ? 10 : 12 }}
                  />
                  <YAxis label={{ value: 'Autonomía (%)', angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.[0]) {
                        return (
                          <div className="bg-white p-3 rounded shadow-lg border border-gray-300">
                            <p className="text-sm font-semibold text-gray-900">
                              {payload[0].payload.fullName}
                            </p>
                            <p className="text-sm text-blue-600">
                              Autonomía: {payload[0].payload.autonomia2024.toFixed(1)}%
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="autonomia2024" fill="#10b981" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center text-gray-600 py-8">Sin datos disponibles</p>
            )}
          </div>
        </div>

        {/* MUNICIPIOS CRÍTICOS */}
        {criticalMunicipalities.length > 0 && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? '' : ''}`}>
            <div className={`border-b border-red-200 bg-red-50 ${isMobile ? 'p-3' : 'p-6'}`}>
              <h3 className={`font-bold text-red-900 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                <AlertCircle size={isMobile ? 16 : 20} className="text-red-600" />
                Municipios en Situación Crítica ({criticalMunicipalities.length})
              </h3>
            </div>
            <div className={isMobile ? 'p-3' : ''}>
              <AdaptiveTable 
                columns={criticalColumns}
                data={criticalTableData}
                isMobile={isMobile}
              />
            </div>
          </div>
        )}

        {/* MUNICIPIOS EN ADVERTENCIA */}
        {warningMunicipalities.length > 0 && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden`}>
            <div className={`border-b border-yellow-200 bg-yellow-50 ${isMobile ? 'p-3' : 'p-6'}`}>
              <h3 className={`font-bold text-yellow-900 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
                <AlertCircle size={isMobile ? 16 : 20} className="text-yellow-600" />
                Municipios en Advertencia ({warningMunicipalities.length})
              </h3>
            </div>
            <div className={isMobile ? 'p-3' : ''}>
              <AdaptiveTable 
                columns={criticalColumns}
                data={warningTableData}
                isMobile={isMobile}
              />
            </div>
          </div>
        )}

        {/* MENSAJE SI NO HAY DATOS CRÍTICOS NI DE ADVERTENCIA */}
        {criticalMunicipalities.length === 0 && warningMunicipalities.length === 0 && (
          <div className={`bg-green-50 border-l-4 border-green-600 rounded-lg ${isMobile ? 'p-4' : 'p-6'}`}>
            <h3 className={`font-bold text-green-900 mb-2 ${isMobile ? 'text-base' : 'text-lg'}`}>✓ Situación Saludable</h3>
            <p className={`text-green-800 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Todos los municipios {selectedDepartment ? `de ${selectedDepartment}` : ''} están en situación saludable.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}