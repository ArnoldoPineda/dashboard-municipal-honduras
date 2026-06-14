import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useNavbar, IndicatorKey } from '../context/NavbarContext';

// ── Icons ────────────────────────────────────────────────────────────────────

function IconMap() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M9 4 4 6v14l5-2 6 2 5-2V4l-5 2-6-2z" strokeLinejoin="round" />
      <path d="M9 4v14M15 6v14" />
    </svg>
  );
}
function IconDashboard() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 20h16" strokeLinecap="round" />
      <rect x="5.5" y="12" width="3.4" height="6" rx="1" />
      <rect x="10.3" y="7" width="3.4" height="11" rx="1" />
      <rect x="15.1" y="9.5" width="3.4" height="8.5" rx="1" />
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M5 21V8l7-4 7 4v13" strokeLinejoin="round" />
      <path d="M9.5 21v-5h5v5M4 21h16M9.5 11h.01M14.5 11h.01" strokeLinecap="round" />
    </svg>
  );
}
function IconDollar() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 7.5v9M9.8 10c0-1.1 1-1.8 2.2-1.8s2.2.6 2.2 1.6-1 1.5-2.2 1.5-2.2.6-2.2 1.6 1 1.7 2.2 1.7 2.2-.7 2.2-1.8" strokeLinecap="round" />
    </svg>
  );
}
function IconTrend() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M4 16l5-5 4 4 7-7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8h4v4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function IconScale() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M12 4v16M6 8h12" strokeLinecap="round" />
      <path d="M6 8l-2.6 5h5.2zM18 8l-2.6 5h5.2z" strokeLinejoin="round" />
      <path d="M9 20h6" strokeLinecap="round" />
    </svg>
  );
}
function IconTrophy() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <path d="M8 4h8v5a4 4 0 0 1-8 0V4z" strokeLinejoin="round" />
      <path d="M8 6H5.5v1A2.8 2.8 0 0 0 8 9.7M16 6h2.5v1A2.8 2.8 0 0 1 16 9.7M10 14.5h4M9 20h6M12 14v6" strokeLinecap="round" />
    </svg>
  );
}

// ── Nav items ────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { to: '/',             label: 'Mapa Interactivo',  icon: <IconMap />,      exact: true },
  { to: '/dashboard',    label: 'Dashboard Nacional', icon: <IconDashboard />, exact: false },
  { to: '/muni-detalle', label: 'Detalle Municipio',  icon: <IconBuilding />,  exact: false },
  { to: '/financiero',   label: 'Datos Financieros',  icon: <IconDollar />,    exact: false },
  { to: '/analisis',     label: 'Análisis',            icon: <IconTrend />,     exact: false },
  { to: '/comparativos', label: 'Comparativos',        icon: <IconScale />,     exact: false },
  { to: '/rankings',     label: 'Rankings',            icon: <IconTrophy />,    exact: false },
];

const INDICATORS: { key: IndicatorKey; label: string }[] = [
  { key: 'presupuesto', label: 'PRESUPUESTO' },
  { key: 'poblacion',   label: 'POBLACIÓN'   },
  { key: 'autonomia',   label: 'AUTONOMÍA'   },
  { key: 'categorias',  label: 'CATEGORÍAS'  },
];

const FISCAL_YEARS = [2019, 2020, 2021, 2022, 2023, 2024, 2025];

// ── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar() {
  const location = useLocation();

  return (
    <aside style={{
      width: 220,
      flexShrink: 0,
      height: '100%',
      borderRight: '1px solid rgba(0,212,184,0.14)',
      background: 'linear-gradient(rgba(11,17,32,0.97), rgba(8,12,24,0.94))',
      display: 'flex',
      flexDirection: 'column',
      padding: '14px 12px',
      overflowY: 'auto',
      position: 'relative',
      zIndex: 5,
    }}>
      <div style={{
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 8.5,
        color: '#4a5a73',
        letterSpacing: '0.14em',
        padding: '4px 10px 10px',
        textTransform: 'uppercase',
      }}>
        Navegación
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
        {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.exact}
              style={({ isActive: routerIsActive }) => {
                const active = item.exact ? routerIsActive : location.pathname.startsWith(item.to);
                return {
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 11,
                  padding: '10px 12px',
                  borderRadius: 10,
                  cursor: 'pointer',
                  fontSize: 13.5,
                  fontWeight: 500,
                  letterSpacing: '0.01em',
                  whiteSpace: 'nowrap',
                  color: active ? '#5eead4' : '#aab6c9',
                  textDecoration: 'none',
                  transition: 'color 0.16s',
                  userSelect: 'none',
                };
              }}
            >
              {({ isActive: routerActive }) => {
                const active = item.exact ? routerActive : location.pathname.startsWith(item.to);
                return (
                  <>
                    {active && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        borderRadius: 10,
                        background: 'rgba(0,212,184,0.12)',
                        boxShadow: '#00d4b8 2px 0px 0px inset',
                      }} />
                    )}
                    <span style={{ position: 'relative', zIndex: 1, lineHeight: 0 }}>{item.icon}</span>
                    <span style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                  </>
                );
              }}
            </NavLink>
        ))}
      </div>

      <div style={{
        borderTop: '1px solid rgba(0,212,184,0.1)',
        paddingTop: 12,
        marginTop: 8,
      }}>
        <div style={{ fontSize: 9.5, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          v2.1 · Honduras 2019–2025
        </div>
      </div>
    </aside>
  );
}

// ── Top Navbar ───────────────────────────────────────────────────────────────

function TopNavbar() {
  const { indicator, setIndicator, fiscalYear, setFiscalYear } = useNavbar();

  return (
    <header style={{
      height: 54,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      borderBottom: '1px solid rgba(0,212,184,0.18)',
      background: 'rgba(8,12,24,0.88)',
      backdropFilter: 'blur(8px)',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 32,
          height: 32,
          border: '1.5px solid #00d4b8',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulseGlow 3.4s ease-in-out infinite',
          flexShrink: 0,
        }}>
          <div style={{ width: 11, height: 11, background: '#00d4b8', borderRadius: 3, boxShadow: '#00d4b8 0 0 10px' }} />
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 19, fontWeight: 600, letterSpacing: '0.18em', color: '#e8eef6' }}>SIMHO</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 8, color: '#7c8aa3', letterSpacing: '0.06em', marginTop: 2 }}>
            INTELIGENCIA MUNICIPAL
          </div>
        </div>
      </div>

      {/* Indicator toggles */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {INDICATORS.map((ind) => (
          <button
            key={ind.key}
            onClick={() => setIndicator(ind.key)}
            style={{
              background: indicator === ind.key ? 'rgba(0,212,184,0.18)' : 'transparent',
              border: `1px solid ${indicator === ind.key ? 'rgba(0,212,184,0.6)' : 'rgba(0,212,184,0.2)'}`,
              borderRadius: 7,
              color: indicator === ind.key ? '#00d4b8' : '#7c8aa3',
              cursor: 'pointer',
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10,
              fontWeight: indicator === ind.key ? 700 : 400,
              padding: '5px 12px',
              letterSpacing: '0.08em',
              transition: 'all 0.14s',
            }}
          >
            {ind.label}
          </button>
        ))}
      </div>

      {/* Right: year picker + badge */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <select
          className="simho-select"
          value={fiscalYear}
          onChange={(e) => setFiscalYear(Number(e.target.value))}
          style={{ fontSize: 11, padding: '4px 10px' }}
        >
          {FISCAL_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 9,
          letterSpacing: '0.1em',
          border: '1px solid rgba(245,158,11,0.4)',
          color: '#f59e0b',
          background: 'rgba(245,158,11,0.1)',
          borderRadius: 5,
          padding: '4px 10px',
          whiteSpace: 'nowrap',
        }}>
          AÑO FISCAL {fiscalYear}
        </div>
      </div>
    </header>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const location = useLocation();

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: '#0a0f1e',
      fontFamily: "'Barlow Condensed', sans-serif",
      color: '#e8eef6',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Background grid */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `
          linear-gradient(rgba(0,212,184,0.043) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,212,184,0.043) 1px, transparent 1px)
        `,
        backgroundSize: '42px 42px',
        opacity: 0.55,
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(120% 78% at 50% -12%, rgba(0,212,184,0.1), transparent 58%)',
        zIndex: 0,
      }} />
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        background: 'radial-gradient(90% 60% at 88% 108%, rgba(245,158,11,0.06), transparent 60%)',
        zIndex: 0,
      }} />

      {/* Top navbar (full width) */}
      <TopNavbar />

      {/* Below navbar: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        <Sidebar />

        <main
          key={location.pathname}
          className="simho-view-in simho-content"
          style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
