import React, { useState, useMemo, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import useMunicipalityDetails from '../hooks/useMunicipalityDetails';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../services/supabaseClient';

interface ExpandedSection {
  [key: string]: boolean;
}

// ── SIMHO token shortcuts ───────────────────────────────────────
const C = {
  card:    'rgba(13,21,38,0.74)',
  border:  'rgba(0,212,184,0.14)',
  divider: 'rgba(0,212,184,0.10)',
  input:   'rgba(8,13,24,0.80)',
  inputBorder: 'rgba(0,212,184,0.25)',
  text:    '#e8eef6',
  secondary: '#7c8aa3',
  muted:   '#4a5a73',
  teal:    '#00d4b8',
  tealDim: '#5eead4',
  amber:   '#f59e0b',
  red:     '#ef5a5a',
  green:   '#1f9d57',
};

const cardStyle: React.CSSProperties = {
  background: C.card,
  border: `1px solid ${C.border}`,
  borderRadius: 10,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontFamily: "'IBM Plex Mono', monospace",
  fontSize: 10,
  color: C.muted,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
  marginBottom: 6,
};

const selectStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  background: C.input,
  border: `1px solid ${C.inputBorder}`,
  borderRadius: 8,
  color: C.text,
  fontSize: 13,
  fontFamily: "'Barlow Condensed', sans-serif",
  outline: 'none',
  cursor: 'pointer',
};

export default function MunicipioDETALLE() {
  const { isMobile } = useMediaQuery();
  const { municipalities } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024, 2025]);

  // Dedicated departments query — no year filter, guaranteed to return all 18
  const [departments, setDepartments] = useState<string[]>([]);
  const [deptsLoading, setDeptsLoading] = useState(true);
  useEffect(() => {
    supabase
      .from('municipalities')
      .select('department')
      .limit(500)
      .then(({ data }) => {
        if (data) {
          const depts = [...new Set(
            data.map((d: any) => d.department).filter(Boolean) as string[]
          )].sort();
          setDepartments(depts);
        }
        setDeptsLoading(false);
      });
  }, []);

  const [selectedYear, setSelectedYear] = useState(2024);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedMunicipio, setSelectedMunicipio] = useState('');
  const [expandedSections, setExpandedSections] = useState<ExpandedSection>({
    general: true,
    ingresos_tributarios: false,
    ingresos_no_tributarios: false,
    ingresos_capital: false,
    gastos_funcionamiento: false,
    gastos_capital: false,
    total_egresos: false,
  });

  const { data: fiscalData, loading: detailLoading, error } = useMunicipalityDetails(
    selectedMunicipio,
    selectedYear,
    selectedDepartment
  );

  const municipiosByDept = useMemo(() => {
    return selectedDepartment
      ? [...new Set(
          municipalities
            .filter((m) => m.department === selectedDepartment && m.year === selectedYear)
            .map((m) => m.name)
        )].sort()
      : [];
  }, [municipalities, selectedDepartment, selectedYear]);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-HN', {
      style: 'currency', currency: 'HNL',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(amount);

  // ── FiscalSection ───────────────────────────────────────────
  const FiscalSection = ({
    title, color, details, sectionKey, total,
  }: {
    title: string;
    color: string;
    details: Array<{ label: string; amount: number; percentage?: number; color?: string }>;
    sectionKey: string;
    total: number;
  }) => {
    const isExpanded = expandedSections[sectionKey];
    return (
      <div style={{ ...cardStyle, marginBottom: 10, overflow: 'hidden' }}>
        <button
          onClick={() => toggleSection(sectionKey)}
          style={{
            width: '100%',
            padding: isMobile ? '12px 16px' : '14px 20px',
            background: color,
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 700,
            fontSize: isMobile ? 13 : 14,
            fontFamily: "'Barlow Condensed', sans-serif",
            letterSpacing: '0.06em',
          }}
        >
          <div>
            <div>{title}</div>
            <div style={{ fontSize: isMobile ? 11 : 12, fontWeight: 400, marginTop: 3, opacity: 0.9 }}>
              {formatCurrency(total)}
            </div>
          </div>
          {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </button>

        {isExpanded && (
          <div style={{ padding: isMobile ? '12px 14px' : '16px 20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {details.map((detail, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: 10,
                    borderBottom: idx < details.length - 1 ? `1px solid ${C.divider}` : 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: isMobile ? 12 : 13, fontWeight: 500, color: C.text }}>
                      {detail.label}
                    </div>
                    {detail.percentage !== undefined && detail.percentage > 0 && (
                      <div style={{ fontSize: isMobile ? 10 : 11, color: C.secondary, marginTop: 2 }}>
                        {detail.percentage.toFixed(1)}% del total
                      </div>
                    )}
                  </div>
                  <div style={{
                    textAlign: 'right',
                    fontSize: isMobile ? 12 : 13,
                    fontWeight: 700,
                    color: detail.color || color,
                    minWidth: isMobile ? 80 : 120,
                    fontFamily: "'IBM Plex Mono', monospace",
                  }}>
                    {formatCurrency(detail.amount)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  // ── Loading ─────────────────────────────────────────────────
  if (detailLoading) {
    return (
      <DashboardLayout title="Detalle por Municipio">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 240 }}>
          <div style={{
            width: 40, height: 40, borderRadius: '50%',
            border: `3px solid rgba(0,212,184,0.15)`,
            borderTopColor: C.teal,
            animation: 'spin 0.8s linear infinite',
          }} />
        </div>
      </DashboardLayout>
    );
  }

  // ── Main render ─────────────────────────────────────────────
  return (
    <DashboardLayout title="Detalle por Municipio">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* ── Filters ── */}
        <div style={{
          ...cardStyle,
          padding: isMobile ? '14px' : '18px 20px',
          display: 'grid',
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
          gap: 14,
        }}>
          <div>
            <label style={labelStyle}>Año</label>
            <select
              value={selectedYear}
              onChange={e => { setSelectedYear(parseInt(e.target.value)); setSelectedMunicipio(''); }}
              style={selectStyle}
            >
              {[2025, 2024, 2023, 2022, 2021].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Departamento</label>
            <select
              value={selectedDepartment}
              onChange={e => { setSelectedDepartment(e.target.value); setSelectedMunicipio(''); }}
              style={selectStyle}
            >
              {deptsLoading
                ? <option value="">Cargando departamentos…</option>
                : <option value="">— Selecciona Departamento —</option>
              }
              {departments.map(dept => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={labelStyle}>Municipio</label>
            <select
              value={selectedMunicipio}
              onChange={e => setSelectedMunicipio(e.target.value)}
              disabled={!selectedDepartment}
              style={{
                ...selectStyle,
                opacity: !selectedDepartment ? 0.45 : 1,
                cursor: !selectedDepartment ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">— Selecciona Municipio —</option>
              {municipiosByDept.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>

        {/* ── Placeholder ── */}
        {!selectedMunicipio && (
          <div style={{
            background: 'rgba(0,212,184,0.06)',
            border: `1px solid rgba(0,212,184,0.22)`,
            borderRadius: 10,
            padding: isMobile ? '14px 16px' : '16px 20px',
          }}>
            <p style={{ color: C.tealDim, fontSize: isMobile ? 13 : 14, margin: 0 }}>
              Selecciona un municipio para ver los detalles fiscales
            </p>
          </div>
        )}

        {/* ── Error ── */}
        {error && (
          <div style={{
            background: 'rgba(239,90,90,0.1)',
            border: `1px solid rgba(239,90,90,0.3)`,
            borderRadius: 10,
            padding: '12px 16px',
            color: C.red,
          }}>
            Error: {error}
          </div>
        )}

        {/* ── Fiscal detail ── */}
        {selectedMunicipio && fiscalData && !detailLoading && (
          <>
            {/* Header */}
            <div style={{ ...cardStyle, padding: isMobile ? '14px 16px' : '16px 20px' }}>
              <h2 style={{
                color: C.text,
                margin: '0 0 4px',
                fontSize: isMobile ? 18 : 22,
                fontWeight: 600,
                letterSpacing: '0.02em',
              }}>
                {fiscalData.municipio}, {fiscalData.departamento}
              </h2>
              <p style={{ color: C.secondary, fontSize: 12, margin: 0, fontFamily: "'IBM Plex Mono', monospace" }}>
                Año: {fiscalData.año}
              </p>
            </div>

            <FiscalSection title="INFORMACIÓN GENERAL"               color="#1d6fa4" details={fiscalData.general.details}                sectionKey="general"              total={fiscalData.general.total} />
            <FiscalSection title="INGRESOS TRIBUTARIOS"              color="#0e7c56" details={fiscalData.ingresos_tributarios.details}     sectionKey="ingresos_tributarios" total={fiscalData.ingresos_tributarios.total} />
            <FiscalSection title="INGRESOS NO TRIBUTARIOS"           color="#b07005" details={fiscalData.ingresos_no_tributarios.details}  sectionKey="ingresos_no_tributarios" total={fiscalData.ingresos_no_tributarios.total} />
            <FiscalSection title="INGRESOS DE CAPITAL"               color="#8b3074" details={fiscalData.ingresos_capital.details}         sectionKey="ingresos_capital"     total={fiscalData.ingresos_capital.total} />
            <FiscalSection title="GASTOS DE FUNCIONAMIENTO"          color="#b03a3a" details={fiscalData.gastos_funcionamiento.details}    sectionKey="gastos_funcionamiento" total={fiscalData.gastos_funcionamiento.total} />
            <FiscalSection title="GASTOS DE CAPITAL Y DEUDA PÚBLICA" color="#5b3d99" details={fiscalData.gastos_capital.details}           sectionKey="gastos_capital"       total={fiscalData.gastos_capital.total} />
            <FiscalSection title="TOTAL EGRESOS"                     color="#374776" details={fiscalData.total_egresos.details}            sectionKey="total_egresos"        total={fiscalData.total_egresos.total} />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
