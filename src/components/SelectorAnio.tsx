import React from 'react';
import { useNavbar } from '../context/NavbarContext';
import { ANIOS_SEFIN } from '../data/anios';

/** Selector del año fiscal: un solo estado global (NavbarContext) para todas las páginas de un año. */
export default function SelectorAnio() {
  const { fiscalYear, setFiscalYear } = useNavbar();
  return (
    <select
      className="simho-select"
      aria-label="Año fiscal"
      value={fiscalYear}
      onChange={(e) => setFiscalYear(Number(e.target.value))}
      style={{ fontSize: 11, padding: '4px 30px 4px 10px', width: 'auto', flexShrink: 0 }}
    >
      {ANIOS_SEFIN.map((y) => <option key={y} value={y}>{y}</option>)}
    </select>
  );
}
