import { useMemo } from 'react';

interface Municipality {
  id: string;
  name: string;
  department: string;
  population?: number;
  budget_amount?: number;
  own_income?: number;
  [key: string]: any;
}

export const useAnalysisData = (municipalities: Municipality[]) => {
  const populationByDepartment = useMemo(() => {
    const groupedByDept: { [key: string]: number } = {};
    
    municipalities.forEach((m) => {
      if (m.department) {
        groupedByDept[m.department] = (groupedByDept[m.department] || 0) + (m.population || 0);
      }
    });

    return Object.entries(groupedByDept)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [municipalities]);

  const budgetByDepartment = useMemo(() => {
    const groupedByDept: { [key: string]: number } = {};
    
    municipalities.forEach((m) => {
      if (m.department) {
        groupedByDept[m.department] = (groupedByDept[m.department] || 0) + (m.budget_amount || 0);
      }
    });

    return Object.entries(groupedByDept)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [municipalities]);

  const topMunicipalities = useMemo(() => {
    return municipalities
      .sort((a, b) => (b.population || 0) - (a.population || 0))
      .slice(0, 10)
      .map((m) => ({
        name: m.name,
        value: m.population || 0,
      }));
  }, [municipalities]);

  return {
    populationByDepartment,
    budgetByDepartment,
    topMunicipalities,
  };
};