import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { AdaptiveTable } from '../components/COMPONENTES_ADAPTATIVOS';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp, Download } from 'lucide-react';

type MetricType = 'population' | 'presupuesto' | 'ingresos' | 'autonomia';

interface MunicipalityData {
  id: string;
  name: string;
  department: string;
}

export default function ComparativosPage() {
  const { isMobile, isTablet } = useMediaQuery();
  const { municipalities, loading, error } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024]);
  
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedMunicipalities, setSelectedMunicipalities] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<number[]>([2021, 2022, 2023, 2024]);
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('population');

  const departments = useMemo(() => {
    return [...new Set(municipalities.map((m) => m.department).filter(Boolean))].sort();
  }, [municipalities]);

  const allMunicipalities = useMemo(() => {
    return Array.from(
      new Map(municipalities.map((m) => [m.name, { id: m.id, name: m.name, department: m.department }])).values()
    ).sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [municipalities]);

  const municipalitiesByDept = useMemo(() => {
    return selectedDepartment
      ? allMunicipalities.filter((m) => m.department === selectedDepartment)
      : [];
  }, [allMunicipalities, selectedDepartment]);

  const comparisonData = useMemo(() => {
    if (selectedMunicipalities.length === 0 || selectedYears.length === 0) return [];

    const grouped: any = {};

    municipalities.forEach((m) => {
      if (!selectedMunicipalities.includes(m.name) || !selectedYears.includes(m.year)) return;

      if (!grouped[m.year]) {
        grouped[m.year] = { year: m.year };
      }

      let value = 0;
      switch (selectedMetric) {
        case 'population':
          value = m.population || 0;
          break;
        case 'presupuesto':
          value = m.presupuesto_municipal ? Math.round(m.presupuesto_municipal / 1_000_000) : 0;
          break;
        case 'ingresos':
          value = m.ingresos_propios ? Math.round(m.ingresos_propios / 1_000_000) : 0;
          break;
        case 'autonomia':
          value = m.presupuesto_municipal
            ? Math.round((m.ingresos_propios / m.presupuesto_municipal) * 100 * 10) / 10
            : 0;
          break;
        default:
          value = 0;
      }

      grouped[m.year][m.name] = value;
    });

    return Object.values(grouped).sort((a, b) => a.year - b.year);
  }, [municipalities, selectedMunicipalities, selectedYears, selectedMetric]);

  const tableData = useMemo(() => {
    if (selectedMunicipalities.length === 0 || selectedYears.length === 0) return [];

    const data: any[] = [];

    selectedMunicipalities.forEach((munName) => {
      const munData: any = { municipio: munName };

      selectedYears.forEach((year) => {
        const record = municipalities.find((m) => m.name === munName && m.year === year);
        if (record) {
          let value = 0;
          switch (selectedMetric) {
            case 'population':
              value = record.population || 0;
              munData[`año_${year}`] = value.toLocaleString('es-HN');
              break;
            case 'presupuesto':
              value = record.presupuesto_municipal || 0;
              munData[`año_${year}`] = `L ${(value / 1_000_000).toFixed(1)}M`;
              break;
            case 'ingresos':
              value = record.ingresos_propios || 0;
              munData[`año_${year}`] = `L ${(value / 1_000_000).toFixed(1)}M`;
              break;
            case 'autonomia':
              value = record.presupuesto_municipal
                ? Math.round((record.ingresos_propios / record.presupuesto_municipal) * 100 * 10) / 10
                : 0;
              munData[`año_${year}`] = `${value.toFixed(1)}%`;
              break;
          }
        }
      });

      data.push(munData);
    });

    return data;
  }, [municipalities, selectedMunicipalities, selectedYears, selectedMetric]);

  const toggleMunicipality = (munName: string) => {
    setSelectedMunicipalities((prev) =>
      prev.includes(munName) ? prev.filter((m) => m !== munName) : [...prev, munName]
    );
  };

  const toggleYear = (year: number) => {
    setSelectedYears((prev) =>
      prev.includes(year) ? prev.filter((y) => y !== year) : [...prev, year].sort((a, b) => a - b)
    );
  };

  const getMetricLabel = () => {
    switch (selectedMetric) {
      case 'population':
        return 'Población';
      case 'presupuesto':
        return 'Presupuesto (Millones)';
      case 'ingresos':
        return 'Ingresos Propios (Millones)';
      case 'autonomia':
        return 'Autonomía Financiera (%)';
      default:
        return '';
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (loading) {
    return (
      <DashboardLayout title="Comparativos">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Comparativos">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Comparativos">
      <div className="space-y-6">
        {/* PASO 1: SELECCIONAR DEPARTAMENTO - RESPONSIVO */}
        <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
          <h3 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>
            1. Seleccionar Departamento
          </h3>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedMunicipalities([]);
            }}
            className={`w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-medium ${
              isMobile ? 'px-3 py-3 text-sm' : 'px-4 py-2'
            }`}
          >
            <option value="">-- Selecciona un Departamento --</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* PASO 2: SELECCIONAR MUNICIPIOS - RESPONSIVO */}
        {selectedDepartment && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
            <h3 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>
              2. Seleccionar Municipios
            </h3>
            <div className={`grid gap-3 ${
              isMobile 
                ? 'grid-cols-1' 
                : isTablet 
                ? 'grid-cols-2' 
                : 'grid-cols-3'
            }`}>
              {municipalitiesByDept.map((mun) => (
                <label key={mun.name} className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer hover:bg-blue-50 ${isMobile ? 'text-sm' : ''}`}>
                  <input
                    type="checkbox"
                    checked={selectedMunicipalities.includes(mun.name)}
                    onChange={() => toggleMunicipality(mun.name)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-gray-900 font-medium">{mun.name}</span>
                </label>
              ))}
            </div>
            {selectedMunicipalities.length > 0 && (
              <p className={`mt-4 text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
                Seleccionados: <span className="font-bold text-blue-700">{selectedMunicipalities.join(', ')}</span>
              </p>
            )}
          </div>
        )}

        {/* PASO 3: SELECCIONAR AÑOS - RESPONSIVO */}
        {selectedDepartment && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
            <h3 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>3. Seleccionar Años</h3>
            <div className="flex gap-2 flex-wrap">
              {[2021, 2022, 2023, 2024].map((year) => (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={`rounded-lg font-bold transition ${
                    selectedYears.includes(year)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'}`}
                >
                  {year}
                </button>
              ))}
            </div>
            <p className={`mt-4 text-gray-600 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Seleccionados: <span className="font-bold text-blue-700">{selectedYears.join(', ')}</span>
            </p>
          </div>
        )}

        {/* PASO 4: SELECCIONAR MÉTRICA - RESPONSIVO */}
        {selectedDepartment && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
            <h3 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>4. Métrica a Comparar</h3>
            <div className={`flex gap-2 flex-wrap ${isMobile ? 'text-sm' : ''}`}>
              {(['population', 'presupuesto', 'ingresos', 'autonomia'] as MetricType[]).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  className={`rounded-lg font-medium transition ${
                    selectedMetric === metric
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  } ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2'}`}
                >
                  {metric === 'population' && 'Población'}
                  {metric === 'presupuesto' && 'Presupuesto'}
                  {metric === 'ingresos' && 'Ingresos'}
                  {metric === 'autonomia' && 'Autonomía (%)'}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* GRÁFICO COMPARATIVO - RESPONSIVO */}
        {selectedMunicipalities.length > 0 && selectedYears.length > 0 && comparisonData.length > 0 && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
            <h3 className={`font-bold text-gray-900 mb-4 flex items-center gap-2 ${isMobile ? 'text-base' : 'text-lg'}`}>
              <TrendingUp size={isMobile ? 16 : 20} />
              Comparativa - {getMetricLabel()}
            </h3>
            <ResponsiveContainer width="100%" height={isMobile ? 250 : 400}>
              <LineChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
                <YAxis label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft' }} />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload?.length) {
                      return (
                        <div className="bg-white p-3 rounded shadow-lg border border-gray-300">
                          <p className={`font-semibold text-gray-900 ${isMobile ? 'text-xs' : 'text-sm'}`}>Año {payload[0].payload.year}</p>
                          {payload.map((entry, index) => (
                            <p key={index} style={{ color: entry.color }} className={isMobile ? 'text-xs' : 'text-sm'}>
                              {entry.name}: {entry.value?.toLocaleString('es-HN') || 0}
                            </p>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {!isMobile && <Legend />}
                {selectedMunicipalities.map((mun, idx) => (
                  <Line
                    key={mun}
                    type="monotone"
                    dataKey={mun}
                    stroke={COLORS[idx % COLORS.length]}
                    strokeWidth={2}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* TABLA COMPARATIVA - RESPONSIVA */}
        {selectedMunicipalities.length > 0 && selectedYears.length > 0 && tableData.length > 0 && (
          <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
            <h3 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-base' : 'text-lg'}`}>
              Tabla Comparativa - {getMetricLabel()}
            </h3>
            <div className={isMobile ? '' : 'overflow-x-auto'}>
              <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
                <thead className="bg-blue-50 border-b border-blue-200">
                  <tr>
                    <th className={`text-left font-semibold text-blue-900 ${isMobile ? 'px-3 py-2' : 'px-6 py-3'}`}>
                      Municipio
                    </th>
                    {selectedYears.map((year) => (
                      <th key={year} className={`text-right font-semibold text-blue-900 ${isMobile ? 'px-3 py-2' : 'px-6 py-3'}`}>
                        {year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className={`font-medium text-gray-900 ${isMobile ? 'px-3 py-2' : 'px-6 py-3'}`}>
                        {row.municipio}
                      </td>
                      {selectedYears.map((year) => (
                        <td key={year} className={`text-right text-gray-600 ${isMobile ? 'px-3 py-2' : 'px-6 py-3'}`}>
                          {row[`año_${year}`] || 'N/A'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MENSAJES - RESPONSIVOS */}
        {selectedMunicipalities.length === 0 && selectedDepartment && (
          <div className={`bg-blue-50 border-l-4 border-blue-600 rounded-lg ${isMobile ? 'p-4' : 'p-6'}`}>
            <p className={`text-blue-800 ${isMobile ? 'text-sm' : ''}`}>
              👆 Selecciona al menos un municipio para ver la comparativa
            </p>
          </div>
        )}

        {!selectedDepartment && (
          <div className={`bg-blue-50 border-l-4 border-blue-600 rounded-lg ${isMobile ? 'p-4' : 'p-6'}`}>
            <p className={`text-blue-800 ${isMobile ? 'text-sm' : ''}`}>
              👆 Selecciona un departamento para comenzar
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}