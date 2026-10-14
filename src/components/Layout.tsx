import React, { useEffect, useRef, useState } from 'react';
import { RANGO_ANIOS } from '../data/anios';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import PieFuente from './PieFuente';
import { useEsMovil } from '../hooks/useMediaQuery';
import { useEnLinea } from '../hooks/useEnLinea';

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
  { to: '/dashboard',    label: 'Panorama Nacional', icon: <IconDashboard />, exact: false },
  { to: '/muni-detalle', label: 'Ficha Municipal',    icon: <IconBuilding />,  exact: false, alias: '/municipio/' },
  { to: '/base-datos',   label: 'Base de Datos',  icon: <IconDollar />,    exact: false },
  { to: '/analisis',     label: 'Análisis',            icon: <IconTrend />,     exact: false },
  { to: '/comparativos', label: 'Comparativos',        icon: <IconScale />,     exact: false },
  { to: '/rankings',     label: 'Rankings',            icon: <IconTrophy />,    exact: false },
];

// ── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ enDrawer = false }: { enDrawer?: boolean }) {
  const location = useLocation();

  return (
    <aside className={enDrawer ? undefined : 'simho-sidebar'} style={{
      width: enDrawer ? 'min(280px, 82vw)' : 220,
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
      <div className="simho-sidebar-texto" style={{
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
              aria-label={item.label}
              title={item.label}
              style={({ isActive: routerIsActive }) => {
                const active = item.exact ? routerIsActive : location.pathname.startsWith(item.to) || (!!item.alias && location.pathname.startsWith(item.alias));
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
                const active = item.exact ? routerActive : location.pathname.startsWith(item.to) || (!!item.alias && location.pathname.startsWith(item.alias));
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
                    <span className="simho-sidebar-texto" style={{ position: 'relative', zIndex: 1 }}>{item.label}</span>
                  </>
                );
              }}
            </NavLink>
        ))}
      </div>

      <div className="simho-sidebar-texto" style={{
        borderTop: '1px solid rgba(0,212,184,0.1)',
        paddingTop: 12,
        marginTop: 8,
      }}>
        <div style={{ fontSize: 9.5, color: '#4a5a73', fontFamily: "'IBM Plex Mono', monospace", letterSpacing: '0.06em' }}>
          v2.1 · Honduras {RANGO_ANIOS}
        </div>
      </div>
    </aside>
  );
}

// ── Top Navbar ───────────────────────────────────────────────────────────────

function IconMenu() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function TopNavbar({ onMenu, botonRef }: { onMenu?: () => void; botonRef?: React.Ref<HTMLButtonElement> }) {
  // Año e indicador ya no viven aquí: cada página tiene su SelectorAnio (estado global).
  return (
    <header style={{
      height: 54,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: onMenu ? '0 16px 0 8px' : '0 20px',
      borderBottom: '1px solid rgba(0,212,184,0.18)',
      background: 'rgba(8,12,24,0.88)',
      backdropFilter: 'blur(8px)',
      position: 'relative',
      zIndex: 10,
    }}>
      {/* Logo (en celular, precedido por el botón del menú) */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {onMenu && (
          <button ref={botonRef} type="button" onClick={onMenu} aria-label="Abrir menú" style={{
            all: 'unset', cursor: 'pointer', width: 44, height: 44, display: 'grid', placeItems: 'center', color: '#aab6c9', borderRadius: 10,
          }}>
            <IconMenu />
          </button>
        )}
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
    </header>
  );
}

// ── Drawer (celular) ─────────────────────────────────────────────────────────

/** Menú lateral completo sobre el contenido; se cierra con Esc, con el fondo o al navegar. */
function Drawer({ onCerrar }: { onCerrar: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const panel = ref.current;
    panel?.querySelector<HTMLElement>('a')?.focus();
    const teclas = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCerrar(); return; }
      if (e.key !== 'Tab' || !panel) return;
      // Foco atrapado dentro del menú mientras está abierto.
      const links = Array.from(panel.querySelectorAll<HTMLElement>('a'));
      const [primero, ultimo] = [links[0], links[links.length - 1]];
      if (e.shiftKey && document.activeElement === primero) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primero.focus(); }
    };
    document.addEventListener('keydown', teclas);
    return () => document.removeEventListener('keydown', teclas);
  }, [onCerrar]);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50 }}>
      <div onClick={onCerrar} style={{ position: 'absolute', inset: 0, background: 'rgba(4,7,14,0.7)' }} />
      <div ref={ref} role="dialog" aria-modal="true" aria-label="Navegación" style={{ position: 'absolute', top: 0, bottom: 0, left: 0 }}>
        <Sidebar enDrawer />
      </div>
    </div>
  );
}

// ── Layout ───────────────────────────────────────────────────────────────────

export default function Layout() {
  const location = useLocation();
  const esMovil = useEsMovil();
  const enLinea = useEnLinea();
  const [menuAbierto, setMenuAbierto] = useState(false);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const cerrarMenu = React.useCallback(() => { setMenuAbierto(false); botonMenu.current?.focus(); }, []);
  useEffect(() => { setMenuAbierto(false); }, [location.pathname, esMovil]);

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
      <TopNavbar onMenu={esMovil ? () => setMenuAbierto(true) : undefined} botonRef={botonMenu} />
      {esMovil && menuAbierto && <Drawer onCerrar={cerrarMenu} />}
      {!enLinea && (
        <div role="status" style={{
          flexShrink: 0, position: 'relative', zIndex: 9, padding: '8px 16px', textAlign: 'center',
          background: 'rgba(240,163,58,0.14)', borderBottom: '1px solid rgba(240,163,58,0.5)',
          color: '#f0a33a', fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600,
        }}>
          Sin conexión — datos no disponibles
        </div>
      )}

      {/* Below navbar: sidebar + content */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative', zIndex: 1 }}>
        {!esMovil && <Sidebar />}

        <main
          key={location.pathname}
          className="simho-view-in simho-content"
          style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }}
        >
          <Outlet />
          <PieFuente />
        </main>
      </div>
    </div>
  );
}
