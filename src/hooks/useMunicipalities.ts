// src/hooks/useMunicipalities.ts
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../services/supabaseClient.ts';

export type Municipality = {
  id: string;
  code: number | null;
  name: string | null;
  department: string | null;
  year: number;
  population: number | null;
  presupuesto_municipal: number | null;
  ingresos_propios: number | null;
  ingresos_recaudados: number | null;
  ingresos_tributarios: number | null;
  ingresos_corrientes: number | null;
  autonomia_financiera: number | null;
  gastos_presupuestados: number | null;
  total_egresos: number | null;
  impuesto_bi: number | null;
  impuesto_personal: number | null;
  impuesto_industria: number | null;
  impuesto_comercio: number | null;
  impuesto_servicios: number | null;
  impuesto_pecuario: number | null;
  impuesto_extraccion: number | null;
  impuesto_telecomunicaciones: number | null;
  tasas_servicios: number | null;
  derechos: number | null;
  ingresos_no_tributarios: number | null;
  ingresos_capital: number | null;
  prestamos: number | null;
  venta_activos: number | null;
  contribuciones: number | null;
  colocacion_bonos: number | null;
  transferencias_art91: number | null;
  otras_transferencias: number | null;
  subsidios: number | null;
  herencias_legados: number | null;
  otros_ingresos_capital: number | null;
  recursos_balance: number | null;
  gastos_funcionamiento: number | null;
  servicios_personales: number | null;
  servicios_no_personales: number | null;
  materiales_suministro: number | null;
  transferencias_corrientes: number | null;
  otros_gastos: number | null;
  gastos_capital_deuda: number | null;
  bienes_capitalizables: number | null;
  transferencias_capital: number | null;
  activos_financieros: number | null;
  servicios_deuda: number | null;
  otros_gastos_capital: number | null;
  asignaciones_globales: number | null;
  superavit_deficit: number | null;
  gasto_corriente: number | null;
  ingreso_corriente_ajustado: number | null;
};

// Hook multi-año - OPTIMIZADO SIN REFETCH INNECESARIO
export const useMunicipalitiesMultiYear = (
  selectedYears: number[] = [2024]
) => {
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Ref para almacenar el string de años y evitar refetch innecesario
  const yearsStringRef = useRef<string>('');

  useEffect(() => {
    // Convertir array a string para comparar (evita recrear el array)
    const yearsString = JSON.stringify(selectedYears.sort());
    
    // Si el string es igual, NO hacer fetch
    if (yearsStringRef.current === yearsString && municipalities.length > 0) {
      return;
    }

    yearsStringRef.current = yearsString;

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase.from('municipalities').select('*');

        if (selectedYears && selectedYears.length > 0) {
          query = query.in('year', selectedYears);
        }

        const { data, error } = await query;

        if (error) {
          throw error;
        }

        setMunicipalities((data as Municipality[]) || []);
      } catch (err: any) {
        setError(err.message ?? 'Error al cargar municipios');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedYears, municipalities.length]); // Añadir municipalities.length para evitar bucle infinito

  return { municipalities, loading, error };
};

// Hook legacy: por defecto solo 2024
export const useMunicipalities = () => {
  return useMunicipalitiesMultiYear([2024]);
};