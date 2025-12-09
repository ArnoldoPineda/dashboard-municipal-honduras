import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { useMunicipalities } from '../hooks/useMunicipalities.ts';
import useAdvancedAnalysis from '../hooks/useAdvancedAnalysis.ts';
import AdvancedAnalysisChart from '../components/AdvancedAnalysisChart.tsx';

const AnalyticsPage = () => {
  const { municipalities, loading, error } = useMunicipalities();
  const analysisData = useAdvancedAnalysis(municipalities);
  const [selectedDept, setSelectedDept] = useState(null);

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-96">
          <div className="text-xl text-gray-600">Cargando análisis...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error al cargar datos: {error}
        </div>
      </DashboardLayout>
    );
  }

  const deptInfo = selectedDept ? analysisData.deptDetails[selectedDept] : null;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Título */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Análisis Avanzado</h1>
          <p className="text-gray-600">Visualización de datos municipales por departamento</p>
        </div>

        {/* Selector de Departamento */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Selecciona un Departamento (opcional)
          </label>
          <select
            value={selectedDept || ''}
            onChange={(e) => setSelectedDept(e.target.value || null)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Todos los Departamentos</option>
            {Object.keys(analysisData.deptDetails).map((dept) => (
              <option key={dept} value={dept}>
                {dept}
              </option>
            ))}
          </select>
        </div>

        {/* Detalles del Departamento Seleccionado */}
        {deptInfo && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
              <p className="text-gray-600 text-sm">Población Total</p>
              <p className="text-2xl font-bold text-blue-900">
                {(deptInfo.population / 1000).toFixed(1)}K
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Promedio: {deptInfo.avgPopulation.toLocaleString('es-HN')}
              </p>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
              <p className="text-gray-600 text-sm">Municipios</p>
              <p className="text-2xl font-bold text-green-900">{deptInfo.municipalities}</p>
              <p className="text-xs text-gray-600 mt-1">Municipios en el departamento</p>
            </div>

            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
              <p className="text-gray-600 text-sm">Presupuesto</p>
              <p className="text-2xl font-bold text-purple-900">
                L {(deptInfo.budget / 1000000000).toFixed(1)}B
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Prom: L {(deptInfo.avgBudget / 1000000).toFixed(0)}M
              </p>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border border-orange-200">
              <p className="text-gray-600 text-sm">Autonomía</p>
              <p className="text-2xl font-bold text-orange-900">{deptInfo.autonomy}%</p>
              <p className="text-xs text-gray-600 mt-1">Promedio financiero</p>
            </div>
          </div>
        )}

        {/* Fila 1: Población y Presupuesto */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdvancedAnalysisChart
            data={
              selectedDept
                ? analysisData.populationByDept.filter((d) => d.name === selectedDept)
                : analysisData.populationByDept.slice(0, 10)
            }
            title="Población por Departamento"
            type="bar"
          />
          <AdvancedAnalysisChart
            data={
              selectedDept
                ? analysisData.budgetByDept.filter((d) => d.name === selectedDept)
                : analysisData.budgetByDept.slice(0, 10)
            }
            title="Presupuesto por Departamento"
            type="bar"
          />
        </div>

        {/* Fila 2: Ingresos y Autonomía */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdvancedAnalysisChart
            data={
              selectedDept
                ? analysisData.incomeByDept.filter((d) => d.name === selectedDept)
                : analysisData.incomeByDept.slice(0, 10)
            }
            title="Ingresos Propios por Departamento"
            type="bar"
          />
          <AdvancedAnalysisChart
            data={
              selectedDept
                ? analysisData.autonomyByDept.filter((d) => d.name === selectedDept)
                : analysisData.autonomyByDept.slice(0, 10)
            }
            title="Autonomía Financiera Promedio"
            type="bar"
          />
        </div>

        {/* Fila 3: Top Municipios */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdvancedAnalysisChart
            data={analysisData.topMunicipalities}
            title="Top 15 Municipios por Población"
            type="bar"
          />
          <AdvancedAnalysisChart
            data={analysisData.populationDistribution}
            title="Distribución de Población (Top 20)"
            type="pie"
          />
        </div>

        {/* Fila 4: Presupuesto y Correlación */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <AdvancedAnalysisChart
            data={analysisData.budgetDistribution}
            title="Distribución de Presupuesto (Top 20)"
            type="pie"
          />
          <AdvancedAnalysisChart
            data={analysisData.correlationData}
            title="Correlación: Población vs Presupuesto"
            type="scatter"
          />
        </div>

        {/* Resumen Estadístico */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-bold mb-4 text-gray-900">Resumen Estadístico General</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <p className="text-gray-600 text-sm">Total Municipios</p>
              <p className="text-2xl font-bold text-gray-900">{municipalities.length}</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <p className="text-gray-600 text-sm">Total Departamentos</p>
              <p className="text-2xl font-bold text-gray-900">
                {Object.keys(analysisData.deptDetails).length}
              </p>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <p className="text-gray-600 text-sm">Población Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {(municipalities.reduce((sum, m) => sum + (m.population || 0), 0) / 1000000).toFixed(1)}M
              </p>
            </div>
            <div className="border-l-4 border-orange-500 pl-4">
              <p className="text-gray-600 text-sm">Presupuesto Total</p>
              <p className="text-2xl font-bold text-gray-900">
                L {(municipalities.reduce((sum, m) => sum + (m.budget_amount || 0), 0) / 1000000000).toFixed(1)}B
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AnalyticsPage;