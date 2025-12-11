import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import { useMediaQuery } from '../hooks/useMediaQuery';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { TrendingUp } from 'lucide-react';

type MetricType = 'population' | 'presupuesto' | 'ingresos' | 'autonomia';

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

    return Object.values(grouped).sort((a: any, b: any) => a.year - b.year);
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
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '24rem' }}>
          <div style={{ 
            animation: 'spin 1s linear infinite',
            borderRadius: '50%',
            height: '3rem',
            width: '3rem',
            borderWidth: '4px',
            borderStyle: 'solid',
            borderColor: '#e5e7eb',
            borderTopColor: '#3b82f6'
          }}></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Comparativos">
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '0.5rem', padding: '1rem', color: '#991b1b' }}>
          Error: {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Comparativos">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* PASO 1: SELECCIONAR DEPARTAMENTO */}
        <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', padding: isMobile ? '0.75rem' : '1.5rem' }}>
          <h3 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '1rem', fontSize: isMobile ? '1rem' : '1.125rem' }}>
            1. Seleccionar Departamento
          </h3>
          <select
            value={selectedDepartment}
            onChange={(e) => {
              setSelectedDepartment(e.target.value);
              setSelectedMunicipalities([]);
            }}
            style={{
              width: '100%',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              padding: isMobile ? '0.75rem' : '0.5rem',
              fontSize: isMobile ? '0.875rem' : '1rem',
              fontWeight: '500',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          >
            <option value="">-- Selecciona un Departamento --</option>
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* PASO 2: SELECCIONAR MUNICIPIOS */}
        {selectedDepartment && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', padding: isMobile ? '0.75rem' : '1.5rem' }}>
            <h3 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '1rem', fontSize: isMobile ? '1rem' : '1.125rem' }}>
              2. Seleccionar Municipios
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(3, 1fr)',
              gap: '0.75rem'
            }}>
              {municipalitiesByDept.map((mun) => (
                <label key={mun.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem', border: '1px solid #d1d5db', borderRadius: '0.5rem', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={selectedMunicipalities.includes(mun.name)}
                    onChange={() => toggleMunicipality(mun.name)}
                    style={{ width: '1rem', height: '1rem', accentColor: '#2563eb' }}
                  />
                  <span style={{ color: '#111827', fontWeight: '500', fontSize: isMobile ? '0.875rem' : '1rem' }}>{mun.name}</span>
                </label>
              ))}
            </div>
            {selectedMunicipalities.length > 0 && (
              <p style={{ marginTop: '1rem', color: '#4b5563', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
                Seleccionados: <span style={{ fontWeight: 'bold', color: '#1d4ed8' }}>{selectedMunicipalities.join(', ')}</span>
              </p>
            )}
          </div>
        )}

        {/* PASO 3: SELECCIONAR AÑOS */}
        {selectedDepartment && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', padding: isMobile ? '0.75rem' : '1.5rem' }}>
            <h3 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '1rem', fontSize: isMobile ? '1rem' : '1.125rem' }}>
              3. Seleccionar Años
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {[2021, 2022, 2023, 2024].map((year) => (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  style={{
                    padding: isMobile ? '0.5rem 0.75rem' : '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontWeight: 'bold',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedYears.includes(year) ? '#2563eb' : '#e5e7eb',
                    color: selectedYears.includes(year) ? 'white' : '#374151',
                    fontSize: isMobile ? '0.875rem' : '1rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
            <p style={{ marginTop: '1rem', color: '#4b5563', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
              Seleccionados: <span style={{ fontWeight: 'bold', color: '#1d4ed8' }}>{selectedYears.join(', ')}</span>
            </p>
          </div>
        )}

        {/* PASO 4: SELECCIONAR MÉTRICA */}
        {selectedDepartment && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', padding: isMobile ? '0.75rem' : '1.5rem' }}>
            <h3 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '1rem', fontSize: isMobile ? '1rem' : '1.125rem' }}>
              4. Métrica a Comparar
            </h3>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              {(['population', 'presupuesto', 'ingresos', 'autonomia'] as MetricType[]).map((metric) => (
                <button
                  key={metric}
                  onClick={() => setSelectedMetric(metric)}
                  style={{
                    padding: isMobile ? '0.5rem 0.5rem' : '0.5rem 1rem',
                    borderRadius: '0.5rem',
                    fontWeight: '500',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: selectedMetric === metric ? '#16a34a' : '#e5e7eb',
                    color: selectedMetric === metric ? 'white' : '#374151',
                    fontSize: isMobile ? '0.75rem' : '1rem',
                    transition: 'all 0.2s'
                  }}
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

        {/* GRÁFICO COMPARATIVO */}
        {selectedMunicipalities.length > 0 && selectedYears.length > 0 && comparisonData.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', padding: isMobile ? '0.75rem' : '1.5rem' }}>
            <h3 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: isMobile ? '1rem' : '1.125rem' }}>
              <TrendingUp size={isMobile ? 16 : 20} />
              Comparativa - {getMetricLabel()}
            </h3>
            <div style={{ width: '100%', height: isMobile ? '250px' : '400px', display: 'block' }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={comparisonData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" tick={{ fontSize: isMobile ? 10 : 12 }} />
                  <YAxis label={{ value: getMetricLabel(), angle: -90, position: 'insideLeft' }} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload?.length) {
                        return (
                          <div style={{ backgroundColor: 'white', padding: '0.75rem', borderRadius: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', border: '1px solid #d1d5db' }}>
                            <p style={{ fontWeight: '600', color: '#111827', fontSize: isMobile ? '0.75rem' : '0.875rem' }}>Año {payload[0].payload.year}</p>
                            {payload.map((entry, index) => (
                              <p key={index} style={{ color: entry.color, fontSize: isMobile ? '0.75rem' : '0.875rem' }}>
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
          </div>
        )}

        {/* TABLA COMPARATIVA */}
        {selectedMunicipalities.length > 0 && selectedYears.length > 0 && tableData.length > 0 && (
          <div style={{ backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden', padding: isMobile ? '0.75rem' : '1.5rem' }}>
            <h3 style={{ fontWeight: 'bold', color: '#111827', marginBottom: '1rem', fontSize: isMobile ? '1rem' : '1.125rem' }}>
              Tabla Comparativa - {getMetricLabel()}
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', fontSize: isMobile ? '0.75rem' : '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f0f4f8', borderBottom: '1px solid #d1d5db' }}>
                    <th style={{ textAlign: 'left', fontWeight: '600', color: '#1e3a8a', padding: isMobile ? '0.5rem' : '1rem' }}>
                      Municipio
                    </th>
                    {selectedYears.map((year) => (
                      <th key={year} style={{ textAlign: 'right', fontWeight: '600', color: '#1e3a8a', padding: isMobile ? '0.5rem' : '1rem' }}>
                        {year}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, idx) => (
                    <tr key={idx} style={{ backgroundColor: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ fontWeight: '500', color: '#111827', padding: isMobile ? '0.5rem' : '1rem' }}>
                        {row.municipio}
                      </td>
                      {selectedYears.map((year) => (
                        <td key={year} style={{ textAlign: 'right', color: '#4b5563', padding: isMobile ? '0.5rem' : '1rem' }}>
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

        {/* MENSAJES */}
        {selectedMunicipalities.length === 0 && selectedDepartment && (
          <div style={{ backgroundColor: '#f0f4f8', borderLeft: '4px solid #2563eb', borderRadius: '0.5rem', padding: isMobile ? '1rem' : '1.5rem' }}>
            <p style={{ color: '#1e40af', fontSize: isMobile ? '0.875rem' : '1rem' }}>
              👆 Selecciona al menos un municipio para ver la comparativa
            </p>
          </div>
        )}

        {!selectedDepartment && (
          <div style={{ backgroundColor: '#f0f4f8', borderLeft: '4px solid #2563eb', borderRadius: '0.5rem', padding: isMobile ? '1rem' : '1.5rem' }}>
            <p style={{ color: '#1e40af', fontSize: isMobile ? '0.875rem' : '1rem' }}>
              👆 Selecciona un departamento para comenzar
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}