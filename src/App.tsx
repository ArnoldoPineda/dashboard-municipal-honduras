import React, { useState } from 'react';

import { SimhoContext, NavKey } from './context/SimhoContext';

import MapaInteractivo    from './pages/MapaInteractivo';
import DashboardNacional  from './pages/DashboardNacional';
import MunicipioDETALLE   from './pages/MunicipioDETALLE';
import PresupuestarioPage from './pages/PresupuestarioPage';
import AnalyticsPage     from './pages/AnalyticsPage';
import ComparativesPage  from './pages/ComparativesPage';
import RankingsPage      from './pages/RankingsPage';

// ─── Nav item definition ────────────────────────────────────────────────────

interface NavItem {
  key: NavKey;
  label: string;
  icon: React.ReactNode;
}

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

const NAV_ITEMS: NavItem[] = [
  { key: 'map',          label: 'Mapa Interactivo',  icon: <IconMap /> },
  { key: 'dashboard',    label: 'Dashboard Nacional', icon: <IconDashboard /> },
  { key: 'muniDetail',   label: 'Detalle Municipio',  icon: <IconBuilding /> },
  { key: 'financiero',   label: 'Datos Financieros',  icon: <IconDollar /> },
  { key: 'analisis',     label: 'Análisis',           icon: <IconTrend /> },
  { key: 'comparativos', label: 'Comparativos',       icon: <IconScale /> },
  { key: 'rankings',     label: 'Rankings',           icon: <IconTrophy /> },
];

// ─── Sidebar ────────────────────────────────────────────────────────────────

function Sidebar({ nav, setNav }: { nav: NavKey; setNav: (k: NavKey) => void }) {
  return (
    <aside style={{
      width: 236,
      flexShrink: 0,
      height: '100%',
      position: 'relative',
      zIndex: 5,
      borderRight: '1px solid rgba(0,212,184,0.14)',
      background: 'linear-gradient(rgba(11,17,32,0.97), rgba(8,12,24,0.94))',
      display: 'flex',
      flexDirection: 'column',
      padding: '18px 14px',
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 8px 18px' }}>
        <div style={{
          width: 34,
          height: 34,
          border: '1.5px solid #00d4b8',
          borderRadius: 8,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulseGlow 3.4s ease-in-out infinite',
          flexShrink: 0,
        }}>
          <div style={{
            width: 12,
            height: 12,
            background: '#00d4b8',
            borderRadius: 3,
            boxShadow: '#00d4b8 0px 0px 10px',
          }} />
        </div>
        <div style={{ lineHeight: 1 }}>
          <div style={{ fontSize: 20, fontWeight: 600, letterSpacing: '0.16em', color: '#e8eef6' }}>SIMHO</div>
          <div style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 8,
            color: '#7c8aa3',
            letterSpacing: '0.06em',
            marginTop: 4,
          }}>
            INTELIGENCIA MUNICIPAL
          </div>
        </div>
      </div>

      {/* Nav list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1, overflowY: 'auto' }}>
        <div style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 8.5,
          color: '#4a5a73',
          letterSpacing: '0.14em',
          padding: '8px 10px 5px',
        }}>
          NAVEGACIÓN
        </div>

        {NAV_ITEMS.map(item => {
          const active = nav === item.key;
          return (
            <div
              key={item.key}
              onClick={() => setNav(item.key)}
              style={{
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
                transition: 'color 0.16s',
                userSelect: 'none',
              }}
              onMouseEnter={e => {
                if (!active) (e.currentTarget as HTMLElement).style.color = '#c8d5e8';
              }}
              onMouseLeave={e => {
                if (!active) (e.currentTarget as HTMLElement).style.color = '#aab6c9';
              }}
            >
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
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '1px solid rgba(0,212,184,0.1)',
        paddingTop: 14,
        marginTop: 8,
      }}>
        <div style={{ fontSize: 10, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          v2.0 · Honduras 2019–2024
        </div>
      </div>
    </aside>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────

function App() {
  const [nav, setNav] = useState<NavKey>('map');

  return (
    <SimhoContext.Provider value={{ isEmbedded: true, nav, setNav }}>
      {/* Root shell */}
      <div style={{
        position: 'fixed',
        inset: 0,
        background: '#0a0f1e',
        fontFamily: "'Barlow Condensed', sans-serif",
        color: '#e8eef6',
        overflow: 'hidden',
        display: 'flex',
      }}>
        {/* Background: teal grid */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          backgroundImage: `
            linear-gradient(rgba(0,212,184,0.043) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,212,184,0.043) 1px, transparent 1px)
          `,
          backgroundSize: '42px 42px',
          opacity: 0.55,
        }} />

        {/* Background: teal radial top */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(120% 78% at 50% -12%, rgba(0,212,184,0.1), transparent 58%)',
        }} />

        {/* Background: amber radial bottom-right */}
        <div style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: 'radial-gradient(90% 60% at 88% 108%, rgba(245,158,11,0.06), transparent 60%)',
        }} />

        {/* Sidebar */}
        <Sidebar nav={nav} setNav={setNav} />

        {/* Content area */}
        <main
          key={nav}
          className="simho-view-in simho-content"
          style={{
            flex: 1,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {nav === 'map'          && <MapaInteractivo />}
          {nav === 'dashboard'    && <DashboardNacional />}
          {nav === 'muniDetail'   && <MunicipioDETALLE />}
          {nav === 'financiero'   && <PresupuestarioPage />}
          {nav === 'analisis'     && <AnalyticsPage />}
          {nav === 'comparativos' && <ComparativesPage />}
          {nav === 'rankings'     && <RankingsPage />}
        </main>
      </div>
    </SimhoContext.Provider>
  );
}

export default App;
