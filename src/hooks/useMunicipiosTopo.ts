// src/hooks/useMunicipiosTopo.ts
// Límites oficiales: OCHA COD-AB Honduras (SINIT/SEPLAN), CC BY-IGO.
// Objetos: `municipios` (298, props department/code/name/key) y `departamentos` (18).
import { useEffect, useState } from 'react';

let topoPromise: Promise<any> | null = null; // caché en memoria: una sola descarga por sesión

export function useMunicipiosTopo() {
  const [topo, setTopo] = useState<any>(null);

  useEffect(() => {
    if (!topoPromise) {
      topoPromise = fetch(`${process.env.PUBLIC_URL}/data/honduras-municipios-topo.json`).then((r) => {
        if (!r.ok) throw new Error(`honduras-municipios-topo.json: HTTP ${r.status}`);
        return r.json();
      });
    }
    let alive = true;
    topoPromise
      .then((t) => { if (alive) setTopo(t); })
      .catch((err) => { topoPromise = null; console.error(err); });
    return () => { alive = false; };
  }, []);

  return topo;
}
