import { useMemo } from 'react';

export const useAdvancedAnalysis = (municipalities) => {
  return useMemo(() => {
    if (!municipalities || municipalities.length === 0) {
      return {
        populationByDept: [],
        budgetByDept: [],
        incomeByDept: [],
        autonomyByDept: [],
        topMunicipalities: [],
        populationDistribution: [],
        budgetDistribution: [],
        correlationData: [],
        deptDetails: {},
      };
    }

    // Agrupar por departamento
    const deptMap = {};
    municipalities.forEach((mun) => {
      if (!deptMap[mun.department]) {
        deptMap[mun.department] = [];
      }
      deptMap[mun.department].push(mun);
    });

    // Población por departamento
    const populationByDept = Object.entries(deptMap)
      .map(([dept, muns]) => ({
        name: dept,
        value: muns.reduce((sum, m) => sum + (m.population || 0), 0),
        municipios: muns.length,
      }))
      .sort((a, b) => b.value - a.value);

    // Presupuesto por departamento
    const budgetByDept = Object.entries(deptMap)
      .map(([dept, muns]) => ({
        name: dept,
        value: muns.reduce((sum, m) => sum + (m.budget_amount || 0), 0),
      }))
      .sort((a, b) => b.value - a.value);

    // Ingresos por departamento
    const incomeByDept = Object.entries(deptMap)
      .map(([dept, muns]) => ({
        name: dept,
        value: muns.reduce((sum, m) => sum + (m.own_income || 0), 0),
      }))
      .sort((a, b) => b.value - a.value);

    // Autonomía financiera promedio por departamento
    const autonomyByDept = Object.entries(deptMap)
      .map(([dept, muns]) => ({
        name: dept,
        value: (
          muns.reduce((sum, m) => sum + (m.financial_autonomy || 0), 0) / muns.length
        ).toFixed(2),
      }))
      .sort((a, b) => b.value - a.value);

    // Top 15 municipios por población
    const topMunicipalities = municipalities
      .sort((a, b) => (b.population || 0) - (a.population || 0))
      .slice(0, 15)
      .map((m) => ({
        name: m.name.substring(0, 15),
        value: m.population,
        fullName: m.name,
        dept: m.department,
      }));

    // Distribución de población (todos los municipios)
    const populationDistribution = municipalities
      .filter((m) => m.population > 0)
      .sort((a, b) => (b.population || 0) - (a.population || 0))
      .slice(0, 20)
      .map((m) => ({
        name: m.name.substring(0, 12),
        value: m.population,
      }));

    // Distribución de presupuesto
    const budgetDistribution = municipalities
      .filter((m) => m.budget_amount > 0)
      .sort((a, b) => (b.budget_amount || 0) - (a.budget_amount || 0))
      .slice(0, 20)
      .map((m) => ({
        name: m.name.substring(0, 12),
        value: m.budget_amount,
      }));

    // Correlación población vs presupuesto
    const correlationData = municipalities
      .filter((m) => m.population > 0 && m.budget_amount > 0)
      .map((m) => ({
        x: m.population,
        y: m.budget_amount,
        name: m.name,
      }));

    // Detalles por departamento
    const deptDetails = {};
    Object.entries(deptMap).forEach(([dept, muns]) => {
      const totalPop = muns.reduce((sum, m) => sum + (m.population || 0), 0);
      const totalBudget = muns.reduce((sum, m) => sum + (m.budget_amount || 0), 0);
      const totalIncome = muns.reduce((sum, m) => sum + (m.own_income || 0), 0);
      const avgAutonomy = muns.reduce((sum, m) => sum + (m.financial_autonomy || 0), 0) / muns.length;

      deptDetails[dept] = {
        population: totalPop,
        budget: totalBudget,
        income: totalIncome,
        autonomy: avgAutonomy.toFixed(2),
        municipalities: muns.length,
        avgPopulation: Math.round(totalPop / muns.length),
        avgBudget: Math.round(totalBudget / muns.length),
      };
    });

    return {
      populationByDept,
      budgetByDept,
      incomeByDept,
      autonomyByDept,
      topMunicipalities,
      populationDistribution,
      budgetDistribution,
      correlationData,
      deptDetails,
    };
  }, [municipalities]);
};

export default useAdvancedAnalysis;