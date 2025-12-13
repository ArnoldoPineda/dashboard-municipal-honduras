import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

export default function Navigation() {
  const location = useLocation();
  const { isMobile } = useMediaQuery();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const navLinks = [
    { path: '/', label: 'Dashboard' },
    { path: '/presupuestario', label: 'Datos Financieros' },
    { path: '/analisis', label: 'Análisis' },
    { path: '/comparativos', label: 'Comparativos' },
    { path: '/rankings', label: 'Rankings' },
    { path: '/detalle-municipio', label: 'Detalle Municipio' },
  ];

  return (
    <nav className="bg-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className={`mx-auto ${isMobile ? 'px-3 py-3' : 'max-w-7xl px-4 py-4'}`}>
        <div className="flex items-center justify-between">
          <h1 className={`font-bold ${isMobile ? 'text-lg' : 'text-2xl'}`}>
            Dashboard Municipal
          </h1>

          {/* MOBILE HAMBURGER */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-blue-500 rounded"
            >
              ☰
            </button>
          )}

          {/* DESKTOP MENU */}
          {!isMobile && (
            <ul className="flex gap-6">
              {navLinks.map((link) => (
                <li key={link.path}>
                  <Link
                    to={link.path}
                    className={`px-4 py-2 rounded transition ${
                      isActive(link.path) ? 'bg-blue-700' : 'hover:bg-blue-500'
                    }`}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* MOBILE MENU - DROPDOWN */}
        {isMobile && mobileMenuOpen && (
          <ul className="flex flex-col gap-2 mt-3 border-t border-blue-500 pt-3">
            {navLinks.map((link) => (
              <li key={link.path}>
                <Link
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-4 py-2 rounded transition ${
                    isActive(link.path)
                      ? 'bg-blue-700'
                      : 'hover:bg-blue-500'
                  }`}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </nav>
  );
}