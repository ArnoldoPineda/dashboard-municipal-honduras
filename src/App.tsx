import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Navigation from "./components/Navigation.tsx";
import Dashboard from "./pages/Dashboard_MEJORADO.tsx";
import RankingsPage from "./pages/RankingsPage.tsx";
import PresupuestarioPage from "./pages/PresupuestarioPage.tsx";
import ComparativesPageNew from "./pages/ComparativesPage";
import AnalyticsPage from "./pages/AnalyticsPage";

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        <Navigation />
        <div className="max-w-7xl mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/comparativos" element={<ComparativesPageNew />} />
            <Route path="/analisis" element={<AnalyticsPage />} />
            <Route path="/rankings" element={<RankingsPage />} />
            <Route path="/presupuestario" element={<PresupuestarioPage />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}

export default App;