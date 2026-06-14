import React, { createContext, useContext, useState } from 'react';

export type IndicatorKey = 'presupuesto' | 'poblacion' | 'autonomia';

interface NavbarContextValue {
  indicator:    IndicatorKey;
  setIndicator: (k: IndicatorKey) => void;
  fiscalYear:   number;
  setFiscalYear: (y: number) => void;
}

const NavbarContext = createContext<NavbarContextValue>({
  indicator:    'presupuesto',
  setIndicator: () => {},
  fiscalYear:   2024,
  setFiscalYear: () => {},
});

export function NavbarProvider({ children }: { children: React.ReactNode }) {
  const [indicator,  setIndicator]  = useState<IndicatorKey>('presupuesto');
  const [fiscalYear, setFiscalYear] = useState(2024);

  return (
    <NavbarContext.Provider value={{ indicator, setIndicator, fiscalYear, setFiscalYear }}>
      {children}
    </NavbarContext.Provider>
  );
}

export const useNavbar = () => useContext(NavbarContext);
