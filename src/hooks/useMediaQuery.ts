import { useState, useEffect } from 'react';

interface MediaQueryState {
  isMobile: boolean;
  isTabletSmall: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isLargeDesktop: boolean;
}

export const useMediaQuery = (): MediaQueryState & { width: number } => {
  const [state, setState] = useState<MediaQueryState & { width: number }>({
    isMobile: false,
    isTabletSmall: false,
    isTablet: false,
    isDesktop: false,
    isLargeDesktop: false,
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
  });

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;

      setState({
        width,
        isMobile: width < 640,
        isTabletSmall: width >= 640 && width < 768,
        isTablet: width >= 768 && width < 1024,
        isDesktop: width >= 1024 && width < 1280,
        isLargeDesktop: width >= 1280,
      });
    };

    // Ejecutar al montar
    handleResize();

    // Listener para cambios
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return state;
};

/** Celular: por debajo de 768 px (barra superior con menú ☰, tarjetas en lugar de tablas). */
export const MEDIA_MOVIL = '(max-width: 767px)';

/** true en celular; se lee al montar (sin parpadeo) y sigue los cambios de tamaño. */
export function useEsMovil(): boolean {
  const consulta = () => typeof window !== 'undefined' && !!window.matchMedia?.(MEDIA_MOVIL).matches;
  const [movil, setMovil] = useState(consulta);
  useEffect(() => {
    const q = window.matchMedia?.(MEDIA_MOVIL);
    if (!q) return;
    const f = () => setMovil(q.matches);
    f();
    q.addEventListener('change', f);
    return () => q.removeEventListener('change', f);
  }, []);
  return movil;
}
