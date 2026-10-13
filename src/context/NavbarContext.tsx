import React, { createContext, useContext, useState } from 'react';
import { ANIO_ACTUAL } from '../data/anios';

export type IndicatorKey = 'presupuesto' | 'poblacion' | 'autonomia' | 'categorias';

interface NavbarContextValue {
  indicator:    IndicatorKey;
  setIndicator: (k: IndicatorKey) => void;
  fiscalYear:   number;
  setFiscalYear: (y: number) => void;
}

const NavbarContext = createContext<NavbarContextValue>({
  indicator:    'presupuesto',
  setIndicator: () => {},
  fiscalYear:   ANIO_ACTUAL,
  setFiscalYear: () => {},
});

export function NavbarProvider({ children }: { children: React.ReactNode }) {
  const [indicator,  setIndicator]  = useState<IndicatorKey>('presupuesto');
  const [fiscalYear, setFiscalYear] = useState(ANIO_ACTUAL);

  return (
    <NavbarContext.Provider value={{ indicator, setIndicator, fiscalYear, setFiscalYear }}>
      {children}
    </NavbarContext.Provider>
  );
}

export const useNavbar = () => useContext(NavbarContext);
