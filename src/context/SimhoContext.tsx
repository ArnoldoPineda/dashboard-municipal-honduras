import { createContext, useContext } from 'react';

export type NavKey =
  | 'map'
  | 'dashboard'
  | 'muniDetail'
  | 'financiero'
  | 'analisis'
  | 'comparativos'
  | 'rankings';

interface SimhoContextValue {
  isEmbedded: boolean;
  nav: NavKey;
  setNav: (key: NavKey) => void;
}

export const SimhoContext = createContext<SimhoContextValue>({
  isEmbedded: false,
  nav: 'map',
  setNav: () => {},
});

export const useSimho = () => useContext(SimhoContext);
