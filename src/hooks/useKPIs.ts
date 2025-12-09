import { useMemo } from 'react';

interface Municipality {
  id: string;
  name: string;
  population?: number;
  income?: number;
  [key: string]: any;
}

interface KPIs {
  totalMunicipalities: number;
  totalPopulation: number;
  averagePopulation: number;
  totalIncome: number;
}

const useKPIs = (municipalities: Municipality[]) => {
  const kpis: KPIs = useMemo(() => {
    if (!municipalities || municipalities.length === 0) {
      return {
        totalMunicipalities: 0,
        totalPopulation: 0,
        averagePopulation: 0,
        totalIncome: 0,
      };
    }

    const totalMunicipalities = municipalities.length;
    const totalPopulation = municipalities.reduce((sum, m) => sum + (m.population || 0), 0);
    const averagePopulation = totalPopulation / totalMunicipalities;
    const totalIncome = municipalities.reduce((sum, m) => sum + (m.income || 0), 0);

    return {
      totalMunicipalities,
      totalPopulation,
      averagePopulation,
      totalIncome,
    };
  }, [municipalities]);

  return kpis;
};

export default useKPIs;