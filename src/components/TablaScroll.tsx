// Contenedor con scroll horizontal para tablas anchas. En celular (index.css, < 768 px) muestra un degradado
// a la derecha mientras haya más columnas y una sombra en la columna fija (.col-fija) al desplazar.
import React, { useCallback, useEffect, useRef, useState } from 'react';

export default function TablaScroll({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const [lados, setLados] = useState({ izq: false, der: false });
  const medir = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const izq = el.scrollLeft > 1;
    const der = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setLados((l) => (l.izq === izq && l.der === der ? l : { izq, der }));
  }, []);
  useEffect(() => {
    medir();
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [medir]);

  return (
    <div className="tabla-scroll-marco" data-mas-der={lados.der || undefined}>
      <div ref={ref} className="tabla-scroll" data-desplazada={lados.izq || undefined} onScroll={medir} style={{ overflowX: 'auto', ...style }}>
        {children}
      </div>
    </div>
  );
}
