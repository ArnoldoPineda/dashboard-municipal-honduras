import React, { createContext, useContext, useState } from 'react';
import { ANIO_ACTUAL } from '../data/anios';
import type { MetricaMapa } from '../lib/indicadores';

/** Métrica compartida por el Panorama, el Mapa nacional y la Vista Departamental. */
export type IndicatorKey = MetricaMapa;

interface NavbarContextValue {
  indicator:    IndicatorKey;
  setIndicator: (k: IndicatorKey) => void;
  fiscalYear:   number;
  setFiscalYear: (y: number) => void;
}

const NavbarContext = createContext<NavbarContextValue>({
  indicator:    'autonomia',
  setIndicator: () => {},
  fiscalYear:   ANIO_ACTUAL,
  setFiscalYear: () => {},
});

export function NavbarProvider({ children }: { children: React.ReactNode }) {
  const [indicator,  setIndicator]  = useState<IndicatorKey>('autonomia');
  const [fiscalYear, setFiscalYear] = useState(ANIO_ACTUAL);

  return (
    <NavbarContext.Provider value={{ indicator, setIndicator, fiscalYear, setFiscalYear }}>
      {children}
    </NavbarContext.Provider>
  );
}

export const useNavbar = () => useContext(NavbarContext);
