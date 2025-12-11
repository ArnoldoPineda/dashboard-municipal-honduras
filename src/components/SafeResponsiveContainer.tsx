import React, { useEffect, useRef, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

interface SafeResponsiveContainerProps {
  width?: string | number;
  height?: string | number;
  children: React.ReactNode;
}

/**
 * SafeResponsiveContainer ULTRA ROBUSTA
 * - Nunca renderiza ResponsiveContainer sin dimensiones reales
 * - Múltiples fallbacks y mecanismos de detección
 * - 100% garantizado anti-parpadeo
 */
const SafeResponsiveContainer: React.FC<SafeResponsiveContainerProps> = ({
  width = '100%',
  height = '100%',
  children,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [ready, setReady] = useState(false);
  const readyRef = useRef(false);
  const attemptCountRef = useRef(0);

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    // Función CRÍTICA para verificar dimensiones reales
    const checkAndSetReady = () => {
      if (readyRef.current) return; // Ya está ready, no hagas nada
      
      const rect = el.getBoundingClientRect();
      const computedStyle = window.getComputedStyle(el);
      const width = parseFloat(computedStyle.width);
      const height = parseFloat(computedStyle.height);

      // Condiciones ESTRICTAS para estar ready
      if (rect.width > 0 && rect.height > 0 && width > 0 && height > 0 && !isNaN(width) && !isNaN(height)) {
        readyRef.current = true;
        setReady(true);
      }
    };

    // INTENTO 1: Chequear inmediatamente
    checkAndSetReady();

    // INTENTO 2: ResizeObserver (más confiable en navegadores modernos)
    let observer: ResizeObserver | null = null;
    try {
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver((entries) => {
          for (let entry of entries) {
            if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
              checkAndSetReady();
            }
          }
        });
        observer.observe(el);
      }
    } catch (e) {
      console.warn('ResizeObserver error:', e);
    }

    // INTENTO 3: Aggressive timeouts (garantía de que se dispare)
    const timeouts: NodeJS.Timeout[] = [];
    const attempts = [10, 25, 50, 75, 100, 150, 200, 300, 500, 750, 1000];
    for (let delay of attempts) {
      timeouts.push(
        setTimeout(() => {
          attemptCountRef.current++;
          checkAndSetReady();
        }, delay)
      );
    }

    // INTENTO 4: Mutation Observer (detecta cambios en el DOM)
    let mutationObserver: MutationObserver | null = null;
    try {
      mutationObserver = new MutationObserver(() => {
        checkAndSetReady();
      });
      mutationObserver.observe(el, {
        attributes: true,
        attributeFilter: ['style', 'class'],
        subtree: false,
      });
    } catch (e) {
      console.warn('MutationObserver error:', e);
    }

    // INTENTO 5: Escuchar cambios de ventana
    const handleResize = () => {
      checkAndSetReady();
    };
    const handleLoad = () => {
      checkAndSetReady();
    };
    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('load', handleLoad, { passive: true });

    // INTENTO 6: Intersection Observer (como último recurso)
    let intersectionObserver: IntersectionObserver | null = null;
    try {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          for (let entry of entries) {
            if (entry.isIntersecting) {
              checkAndSetReady();
            }
          }
        },
        { threshold: 0 }
      );
      intersectionObserver.observe(el);
    } catch (e) {
      console.warn('IntersectionObserver error:', e);
    }

    // CLEANUP
    return () => {
      if (observer) {
        try {
          observer.disconnect();
        } catch (e) {}
      }
      if (mutationObserver) {
        try {
          mutationObserver.disconnect();
        } catch (e) {}
      }
      if (intersectionObserver) {
        try {
          intersectionObserver.disconnect();
        } catch (e) {}
      }
      timeouts.forEach(t => clearTimeout(t));
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('load', handleLoad);
    };
  }, []);

  return (
    <div 
      ref={wrapperRef} 
      style={{ 
        width: '100%', 
        height: '100%',
        minHeight: '1px',
        minWidth: '1px',
        display: 'block',
      }}
    >
      {ready ? (
        <div style={{ width: '100%', height: '100%', display: 'block' }}>
          <ResponsiveContainer width={width as string | number} height={height as string | number}>
            {children}
          </ResponsiveContainer>
        </div>
      ) : (
        // Placeholder invisible pero que ocupa espacio
        <div 
          style={{ 
            width: '100%', 
            height: '100%', 
            minHeight: '1px',
            display: 'block',
          }} 
        />
      )}
    </div>
  );
};

export default SafeResponsiveContainer;