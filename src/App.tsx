import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Dashboard from "./pages/Dashboard.tsx";
import RankingsPage from "./pages/RankingsPage.tsx";
import PresupuestarioPage from "./pages/PresupuestarioPage.tsx";
import ComparativesPage from "./pages/ComparativesPage.tsx";
import AnalyticsPage from "./pages/AnalyticsPage.tsx";

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: "100vh", backgroundColor: "#f5f5f5" }}>
        {/* ❌ QUITA LA NAVIGATION DE AQUÍ */}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/analisis" element={<AnalyticsPage />} />
          <Route path="/datos-financieros" element={<PresupuestarioPage />} />
          <Route path="/comparativos" element={<ComparativesPage />} />
          <Route path="/rankings" element={<RankingsPage />} />
          <Route path="/presupuestario" element={<PresupuestarioPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;