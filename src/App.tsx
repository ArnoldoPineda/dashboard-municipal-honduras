import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import { NavbarProvider }    from './context/NavbarContext';
import { SimhoContext }      from './context/SimhoContext';

import Layout               from './components/Layout';
import MapaInteractivo      from './pages/MapaInteractivo';
import VistaDepartamental   from './pages/VistaDepartamental';
import DetalleMunicipio     from './pages/DetalleMunicipio';
import DashboardNacional    from './pages/DashboardNacional';
import MunicipioDETALLE     from './pages/MunicipioDETALLE';
import PresupuestarioPage   from './pages/PresupuestarioPage';
import AnalyticsPage        from './pages/AnalyticsPage';
import ComparativesPage     from './pages/ComparativesPage';
import RankingsPage         from './pages/RankingsPage';

// Legacy SimhoContext shim — keeps existing pages from throwing.
// Navigation in those pages is no-op; actual routing uses React Router.
const shimNav = 'map' as any;
const shimSetNav = () => {};

export default function App() {
  return (
    <BrowserRouter>
      <NavbarProvider>
        <SimhoContext.Provider value={{ isEmbedded: true, nav: shimNav, setNav: shimSetNav }}>
          <Routes>
            <Route element={<Layout />}>
              <Route index                        element={<MapaInteractivo />}    />
              <Route path="departamento/:id"      element={<VistaDepartamental />} />
              <Route path="municipio/:id"         element={<DetalleMunicipio />}   />
              <Route path="dashboard"             element={<DashboardNacional />}  />
              <Route path="muni-detalle"          element={<MunicipioDETALLE />}   />
              <Route path="financiero"            element={<PresupuestarioPage />} />
              <Route path="analisis"              element={<AnalyticsPage />}      />
              <Route path="comparativos"          element={<ComparativesPage />}   />
              <Route path="rankings"              element={<RankingsPage />}       />
              <Route path="*"                     element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </SimhoContext.Provider>
      </NavbarProvider>
    </BrowserRouter>
  );
}
