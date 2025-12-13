import React, { useState, useEffect } from 'react';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface DashboardLayoutProps {
  title?: string;
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, children }) => {
  const { isMobile } = useMediaQuery();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Cerrado por defecto en mobile
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // En desktop, abrir sidebar automáticamente
    if (!isMobile) {
      setSidebarOpen(true);
    }
  }, [isMobile]);

  // No renderizar hasta que esté montado (evita hidration mismatch)
  if (!mounted) return null;

  const handleNavClick = () => {
    // Cerrar sidebar en mobile al clickear un link
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* HEADER */}
      <header className={`bg-white shadow-sm sticky top-0 z-40 ${isMobile ? 'px-4 py-3' : 'px-6 py-4'}`}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            {isMobile && (
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                ☰
              </button>
            )}
            <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-xl' : 'text-2xl'}`}>
              {title || 'Dashboard'}
            </h1>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR - Mobile drawer, Desktop fixed */}
        {(sidebarOpen || !isMobile) && (
          <>
            {/* Overlay en mobile */}
            {isMobile && sidebarOpen && (
              <div
                className="fixed inset-0 bg-black bg-opacity-50 z-30"
                onClick={() => setSidebarOpen(false)}
              />
            )}
            
            {/* Sidebar */}
            <aside className={`${
              isMobile 
                ? 'fixed left-0 top-0 h-full bg-white shadow-lg z-30 pt-16 w-64' 
                : 'w-64 bg-white shadow-sm'
            }`}>
              <nav className="p-4 space-y-2">
                <a 
                  href="/" 
                  onClick={handleNavClick}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Dashboard
                </a>
                <a 
                  href="/presupuestario" 
                  onClick={handleNavClick}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Datos Financieros
                </a>
                <a 
                  href="/analisis" 
                  onClick={handleNavClick}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Análisis
                </a>
                <a 
                  href="/comparativos" 
                  onClick={handleNavClick}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Comparativos
                </a>
                <a 
                  href="/rankings" 
                  onClick={handleNavClick}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Rankings
                </a>
                <a 
                  href="/detalle-municipio" 
                  onClick={handleNavClick}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded"
                >
                  Detalle Municipio
                </a>
              </nav>
            </aside>
          </>
        )}

        {/* CONTENT AREA */}
        <main className={`flex-1 overflow-y-scroll ${isMobile ? 'px-3 py-4' : 'px-6 py-8'}`}>
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* FOOTER */}
      <footer className={`bg-white border-t border-gray-200 ${isMobile ? 'px-4 py-3 text-xs' : 'px-6 py-4 text-sm'}`}>
        <div className="max-w-7xl mx-auto text-gray-600">
          <p>© 2024 Dashboard Municipal Honduras. Todos los derechos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default DashboardLayout;