import { useEffect, useState } from 'react';

/** false cuando el navegador no tiene conexión (los datos de Supabase se piden siempre a la red). */
export function useEnLinea(): boolean {
  const [enLinea, setEnLinea] = useState(() => typeof navigator === 'undefined' || navigator.onLine !== false);
  useEffect(() => {
    const si = () => setEnLinea(true);
    const no = () => setEnLinea(false);
    window.addEventListener('online', si);
    window.addEventListener('offline', no);
    return () => { window.removeEventListener('online', si); window.removeEventListener('offline', no); };
  }, []);
  return enLinea;
}
