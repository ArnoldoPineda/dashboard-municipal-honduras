import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';
import useMunicipalityDetails from '../hooks/useMunicipalityDetails';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface ExpandedSection {
  [key: string]: boolean;
}

export default function MunicipioDETALLE() {
  const { isMobile } = useMediaQuery();
  const { municipalities } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024]);

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
  
  const { data: fiscalData, loading, error } = useMunicipalityDetails(
  selectedMunicipio,
  selectedYear,
  selectedDepartment
);

  const departments = useMemo(() => {
    return [...new Set(municipalities.map((m) => m.department).filter(Boolean))].sort();
  }, [municipalities]);

  const municipiosByDept = useMemo(() => {
    return selectedDepartment
      ? [
          ...new Set(
            municipalities
              .filter((m) => m.department === selectedDepartment && m.year === selectedYear)
              .map((m) => m.name)
          ),
        ].sort()
      : [];
  }, [municipalities, selectedDepartment, selectedYear]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const FiscalSection = ({
    title,
    color,
    details,
    sectionKey,
    total,
  }: {
    title: string;
    color: string;
    details: Array<{ label: string; amount: number; percentage?: number; color?: string }>;
    sectionKey: string;
    total: number;
  }) => {
    const isExpanded = expandedSections[sectionKey];

    return (
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '0.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1rem',
          overflow: 'hidden',
        }}
      >
        <button
          onClick={() => toggleSection(sectionKey)}
          style={{
            width: '100%',
            padding: isMobile ? '1rem' : '1.5rem',
            backgroundColor: color,
            color: 'white',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontWeight: 'bold',
            fontSize: isMobile ? '0.875rem' : '1rem',
          }}
        >
          <div>
            <div>{title}</div>
            <div style={{ fontSize: isMobile ? '0.75rem' : '0.875rem', fontWeight: 'normal', marginTop: '0.25rem' }}>
              {formatCurrency(total)}
            </div>
          </div>
          {isExpanded ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
        </button>

        {isExpanded && (
          <div style={{ padding: isMobile ? '1rem' : '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {details.map((detail, idx) => (
                <div
                  key={idx}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingBottom: '0.75rem',
                    borderBottom: idx < details.length - 1 ? '1px solid #e5e7eb' : 'none',
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontSize: isMobile ? '0.75rem' : '0.875rem',
                        fontWeight: '500',
                        color: '#111827',
                      }}
                    >
                      {detail.label}
                    </div>
                    {detail.percentage !== undefined && detail.percentage > 0 && (
                      <div
                        style={{
                          fontSize: isMobile ? '0.7rem' : '0.75rem',
                          color: '#6b7280',
                          marginTop: '0.25rem',
                        }}
                      >
                        {detail.percentage.toFixed(1)}% del total
                      </div>
                    )}
                  </div>
                  <div
                    style={{
                      textAlign: 'right',
                      fontSize: isMobile ? '0.75rem' : '0.875rem',
                      fontWeight: 'bold',
                      color: detail.color || color,
                      minWidth: isMobile ? '80px' : '120px',
                    }}
                  >
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

  if (loading) {
    return (
      <DashboardLayout title="Detalle por Municipio">
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '24rem' }}>
          <div
            style={{
              animation: 'spin 1s linear infinite',
              borderRadius: '50%',
              height: '3rem',
              width: '3rem',
              borderWidth: '4px',
              borderStyle: 'solid',
              borderColor: '#e5e7eb',
              borderTopColor: '#3b82f6',
            }}
          ></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Detalle por Municipio">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)',
            gap: '1rem',
            backgroundColor: 'white',
            padding: isMobile ? '0.75rem' : '1.5rem',
            borderRadius: '0.5rem',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#111827',
              }}
            >
              Año
            </label>
            <select
              value={selectedYear}
              onChange={(e) => {
                setSelectedYear(parseInt(e.target.value));
                setSelectedDepartment('');
                setSelectedMunicipio('');
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            >
              {[2024, 2023, 2022, 2021].map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#111827',
              }}
            >
              Departamento
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedMunicipio('');
              }}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
              }}
            >
              <option value="">-- Selecciona Departamento --</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '0.5rem',
                color: '#111827',
              }}
            >
              Municipio
            </label>
            <select
              value={selectedMunicipio}
              onChange={(e) => setSelectedMunicipio(e.target.value)}
              disabled={!selectedDepartment}
              style={{
                width: '100%',
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                outline: 'none',
                backgroundColor: !selectedDepartment ? '#f3f4f6' : 'white',
                cursor: !selectedDepartment ? 'not-allowed' : 'pointer',
              }}
            >
              <option value="">-- Selecciona Municipio --</option>
              {municipiosByDept.map((mun) => (
                <option key={mun} value={mun}>
                  {mun}
                </option>
              ))}
            </select>
          </div>
        </div>

        {!selectedMunicipio && (
          <div
            style={{
              backgroundColor: '#f0f4f8',
              borderLeft: '4px solid #2563eb',
              borderRadius: '0.5rem',
              padding: isMobile ? '1rem' : '1.5rem',
            }}
          >
            <p style={{ color: '#1e40af', fontSize: isMobile ? '0.875rem' : '1rem' }}>
              Selecciona un municipio para ver los detalles fiscales
            </p>
          </div>
        )}

        {error && (
          <div
            style={{
              backgroundColor: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '0.5rem',
              padding: '1rem',
              color: '#991b1b',
            }}
          >
            Error: {error}
          </div>
        )}

        {selectedMunicipio && fiscalData && (
          <>
            <div
              style={{
                backgroundColor: 'white',
                padding: isMobile ? '1rem' : '1.5rem',
                borderRadius: '0.5rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <h2 style={{ color: '#111827', marginBottom: '0.5rem', fontSize: isMobile ? '1.25rem' : '1.5rem' }}>
                {fiscalData.municipio}, {fiscalData.departamento}
              </h2>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Año: {fiscalData.año}
              </p>
            </div>

            <FiscalSection
              title="INFORMACIÓN GENERAL"
              color="#3b82f6"
              details={fiscalData.general.details}
              sectionKey="general"
              total={fiscalData.general.total}
            />

            <FiscalSection
              title="INGRESOS TRIBUTARIOS"
              color="#059669"
              details={fiscalData.ingresos_tributarios.details}
              sectionKey="ingresos_tributarios"
              total={fiscalData.ingresos_tributarios.total}
            />

            <FiscalSection
              title="INGRESOS NO TRIBUTARIOS"
              color="#f59e0b"
              details={fiscalData.ingresos_no_tributarios.details}
              sectionKey="ingresos_no_tributarios"
              total={fiscalData.ingresos_no_tributarios.total}
            />

            <FiscalSection
              title="INGRESOS DE CAPITAL"
              color="#ec4899"
              details={fiscalData.ingresos_capital.details}
              sectionKey="ingresos_capital"
              total={fiscalData.ingresos_capital.total}
            />

            <FiscalSection
              title="GASTOS DE FUNCIONAMIENTO"
              color="#ef4444"
              details={fiscalData.gastos_funcionamiento.details}
              sectionKey="gastos_funcionamiento"
              total={fiscalData.gastos_funcionamiento.total}
            />

            <FiscalSection
              title="GASTOS DE CAPITAL Y DEUDA PÚBLICA"
              color="#8b5cf6"
              details={fiscalData.gastos_capital.details}
              sectionKey="gastos_capital"
              total={fiscalData.gastos_capital.total}
            />

            <FiscalSection
              title="TOTAL EGRESOS"
              color="#6366f1"
              details={fiscalData.total_egresos.details}
              sectionKey="total_egresos"
              total={fiscalData.total_egresos.total}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  );
}