import React, { useState, useMemo } from 'react';
import DashboardLayout from '../components/DashboardLayout.tsx';
import { useMediaQuery } from '../hooks/useMediaQuery';
import { useMunicipalitiesMultiYear } from '../hooks/useMunicipalities';

type RankingType = 'population' | 'budget' | 'income' | 'financial_autonomy';

export default function RankingsPage() {
  const { isMobile, isTablet } = useMediaQuery();
  const { municipalities, loading, error } = useMunicipalitiesMultiYear([2021, 2022, 2023, 2024]);
  const [rankingType, setRankingType] = useState<RankingType>('population');
  const [selectedYear, setSelectedYear] = useState<number>(2024);

  // ✅ HOOKS SIEMPRE AL INICIO (ANTES de cualquier if/return)
  const filteredMunicipalities = useMemo(() => {
    return municipalities.filter(m => m.year === selectedYear);
  }, [municipalities, selectedYear]);

  const rankedData = useMemo(() => {
    let sorted = [...filteredMunicipalities];

    switch (rankingType) {
      case 'population':
        return sorted.sort((a, b) => (b.population || 0) - (a.population || 0));
      case 'budget':
        return sorted.sort((a, b) => (b.presupuesto_municipal || 0) - (a.presupuesto_municipal || 0));
      case 'income':
        return sorted.sort((a, b) => (b.ingresos_propios || 0) - (a.ingresos_propios || 0));
      case 'financial_autonomy':
        return sorted.sort((a, b) => (b.autonomia_financiera || 0) - (a.autonomia_financiera || 0));
      default:
        return sorted;
    }
  }, [filteredMunicipalities, rankingType]);

  if (loading) {
    return (
      <DashboardLayout title="Rankings">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Rankings">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          Error: {error}
        </div>
      </DashboardLayout>
    );
  }

  const getRankingLabel = () => {
    switch (rankingType) {
      case 'population':
        return 'Población';
      case 'budget':
        return 'Presupuesto Municipal';
      case 'income':
        return 'Ingresos Propios';
      case 'financial_autonomy':
        return 'Autonomía Financiera (%)';
      default:
        return '';
    }
  };

  const getValueFormatted = (municipality: any) => {
    switch (rankingType) {
      case 'population':
        return (municipality.population || 0).toLocaleString('es-HN');
      case 'budget':
        return `L ${(municipality.presupuesto_municipal / 1_000_000).toFixed(1)}M`;
      case 'income':
        return `L ${(municipality.ingresos_propios / 1_000_000).toFixed(1)}M`;
      case 'financial_autonomy':
        return `${(municipality.autonomia_financiera || 0).toFixed(2)}%`;
      default:
        return '';
    }
  };

  const renderMobileCards = () => {
    return (
      <div className="space-y-3">
        {rankedData.map((municipality, index) => (
          <div
            key={municipality.id}
            className={`rounded-lg p-4 border-l-4 shadow-sm ${
              index < 3
                ? index === 0
                  ? 'bg-yellow-50 border-yellow-400'
                  : index === 1
                  ? 'bg-gray-50 border-gray-400'
                  : 'bg-orange-50 border-orange-600'
                : 'bg-white border-blue-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${
                    index === 0
                      ? 'bg-yellow-400 text-white'
                      : index === 1
                      ? 'bg-gray-400 text-white'
                      : index === 2
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
                  </span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{municipality.name}</p>
                    <p className="text-xs text-gray-600">{municipality.department}</p>
                  </div>
                </div>
                <p className={`text-right font-bold text-sm ${
                  index < 3 ? 'text-blue-700' : 'text-gray-700'
                }`}>
                  {getValueFormatted(municipality)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderDesktopTable = () => {
    return (
      <div className="overflow-x-auto">
        <table className={`w-full ${isMobile ? 'text-xs' : 'text-sm'}`}>
          <thead className="bg-gray-100 border-b border-gray-200">
            <tr>
              <th className={`text-center font-semibold text-gray-900 ${isMobile ? 'px-3 py-2 w-10' : 'px-6 py-3 w-12'}`}>#</th>
              <th className={`text-left font-semibold text-gray-900 ${isMobile ? 'px-3 py-2' : 'px-6 py-3'}`}>
                Municipio
              </th>
              {!isMobile && (
                <th className={`text-left font-semibold text-gray-900 px-6 py-3`}>Departamento</th>
              )}
              <th className={`text-right font-semibold text-gray-900 ${isMobile ? 'px-3 py-2' : 'px-6 py-3'}`}>
                {getRankingLabel()}
              </th>
            </tr>
          </thead>
          <tbody>
            {rankedData.map((municipality, index) => (
              <tr
                key={municipality.id}
                className={`border-b border-gray-100 hover:bg-gray-50 transition ${
                  index < 3 ? 'bg-yellow-50' : ''
                }`}
              >
                <td className={`text-center font-bold ${isMobile ? 'px-3 py-2' : 'px-6 py-4'}`}>
                  <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full font-bold text-sm ${
                    index === 0
                      ? 'bg-yellow-400 text-white'
                      : index === 1
                      ? 'bg-gray-400 text-white'
                      : index === 2
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-200 text-gray-700'
                  }`}>
                    {index + 1}
                  </span>
                </td>
                <td className={`text-gray-900 font-medium ${isMobile ? 'px-3 py-2' : 'px-6 py-4'}`}>
                  {municipality.name}
                </td>
                {!isMobile && (
                  <td className={`text-gray-600 px-6 py-4`}>{municipality.department}</td>
                )}
                <td className={`text-gray-600 text-right font-semibold ${isMobile ? 'px-3 py-2' : 'px-6 py-4'}`}>
                  {getValueFormatted(municipality)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <DashboardLayout title="Rankings">
      <div className="space-y-6">
        {/* SELECTOR DE AÑO - RESPONSIVO */}
        <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
          <h2 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-base' : 'text-xl'}`}>
            Selecciona Año
          </h2>
          <div className="flex gap-2 flex-wrap">
            {[2024, 2023, 2022, 2021].map((year) => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`rounded-lg font-bold transition ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                } ${isMobile ? 'px-3 py-2 text-sm' : 'px-4 py-2'}`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>

        {/* SELECTOR DE RANKING - RESPONSIVO */}
        <div className={`bg-white rounded-lg shadow-md overflow-hidden ${isMobile ? 'p-3' : 'p-6'}`}>
          <h2 className={`font-bold text-gray-900 mb-4 ${isMobile ? 'text-base' : 'text-xl'}`}>
            Selecciona un Ranking
          </h2>
          <div className={`grid gap-2 ${
            isMobile 
              ? 'grid-cols-2' 
              : isTablet 
              ? 'grid-cols-2' 
              : 'grid-cols-4'
          }`}>
            <button
              onClick={() => setRankingType('population')}
              className={`rounded-lg font-medium transition ${
                rankingType === 'population'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2 text-sm'}`}
            >
              Población
            </button>
            <button
              onClick={() => setRankingType('budget')}
              className={`rounded-lg font-medium transition ${
                rankingType === 'budget'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2 text-sm'}`}
            >
              Presupuesto
            </button>
            <button
              onClick={() => setRankingType('income')}
              className={`rounded-lg font-medium transition ${
                rankingType === 'income'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2 text-sm'}`}
            >
              Ingresos
            </button>
            <button
              onClick={() => setRankingType('financial_autonomy')}
              className={`rounded-lg font-medium transition ${
                rankingType === 'financial_autonomy'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              } ${isMobile ? 'px-2 py-2 text-xs' : 'px-4 py-2 text-sm'}`}
            >
              Autonomía
            </button>
          </div>
        </div>

        {/* CONTENIDO - RESPONSIVE (CARDS EN MOBILE, TABLA EN DESKTOP) */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className={`border-b border-gray-200 ${isMobile ? 'p-4' : 'p-6'}`}>
            <h2 className={`font-bold text-gray-900 ${isMobile ? 'text-lg' : 'text-2xl'}`}>
              Ranking por {getRankingLabel()} - Año {selectedYear}
            </h2>
            <p className={`text-gray-600 mt-1 ${isMobile ? 'text-xs' : 'text-sm'}`}>
              Total de municipios: {rankedData.length}
            </p>
          </div>

          <div className={isMobile ? 'p-4' : ''}>
            {isMobile ? renderMobileCards() : renderDesktopTable()}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}