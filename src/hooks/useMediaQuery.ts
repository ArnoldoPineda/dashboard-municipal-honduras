import { useState, useEffect } from 'react';

export const useMediaQuery = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      setWidth(w);
      setIsMobile(w < 640);
      setIsTablet(w >= 640 && w < 1024);
      setIsDesktop(w >= 1024);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return { isMobile, isTablet, isDesktop, width };
};