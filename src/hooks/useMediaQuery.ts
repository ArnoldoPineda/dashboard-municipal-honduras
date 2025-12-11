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