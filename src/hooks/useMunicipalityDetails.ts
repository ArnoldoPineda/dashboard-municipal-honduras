import { useEffect, useState } from 'react';
import { supabase } from '../services/supabaseClient';

interface FiscalData {
  municipio: string;
  departamento: string;
  año: number;
  general: { total: number; details: Array<{ label: string; amount: number; percentage?: number; color?: string }> };
  ingresos_tributarios: { total: number; details: Array<{ label: string; amount: number; percentage?: number; color?: string }> };
  ingresos_no_tributarios: { total: number; details: Array<{ label: string; amount: number; percentage?: number; color?: string }> };
  ingresos_capital: { total: number; details: Array<{ label: string; amount: number; percentage?: number; color?: string }> };
  gastos_funcionamiento: { total: number; details: Array<{ label: string; amount: number; percentage?: number; color?: string }> };
  gastos_capital: { total: number; details: Array<{ label: string; amount: number; percentage?: number; color?: string }> };
  total_egresos: { total: number; details: Array<{ label: string; amount: number; percentage?: number; color?: string }> };
}

export default function useMunicipalityDetails(
  municipioName?: string,
  year?: number,
  departmentName?: string
) {
  const [data, setData] = useState<FiscalData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!municipioName || !year) {
      setData(null);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('municipalities')
          .select('*')
          .eq('name', municipioName)
          .eq('year', year);

        if (departmentName) {
          query = query.eq('department', departmentName);
        }

        const { data: municipalityData, error: queryError } = await query.single();

        if (queryError) {
          throw new Error(queryError.message);
        }

        if (!municipalityData) {
          throw new Error('Municipio no encontrado');
        }

        // Estructurar datos
        const presupuestoTotal = municipalityData.presupuesto_municipal || 0;
        const ingresosTotal = municipalityData.ingresos_propios || 0;
        const egresosTotal = municipalityData.total_egresos || 0;

        const fiscalData: FiscalData = {
          municipio: municipalityData.name,
          departamento: municipalityData.department,
          año: municipalityData.year,

          // INFORMACIÓN GENERAL
          general: {
            total: presupuestoTotal,
            details: [
              {
                label: 'POBLACIÓN AJUSTADA 2002',
                amount: municipalityData.population || 0,
              },
              {
                label: 'PRESUPUESTO MUNICIPAL',
                amount: presupuestoTotal,
              },
              {
                label: 'GASTOS PRESUPUESTADOS',
                amount: municipalityData.gastos_presupuestados || 0,
              },
              {
                label: 'INGRESOS PROPIOS',
                amount: ingresosTotal,
              },
              {
                label: 'INGRESOS RECAUDADOS',
                amount: municipalityData.ingresos_recaudados || 0,
              },
              {
                label: 'AUTONOMÍA FINANCIERA',
                amount: municipalityData.autonomia_financiera || 0,
              },
              {
                label: 'INGRESOS CORRIENTES',
                amount: municipalityData.ingresos_corrientes || 0,
              },
            ],
          },

          // INGRESOS TRIBUTARIOS
          ingresos_tributarios: {
            total: municipalityData.ingresos_tributarios || 0,
            details: [
              {
                label: 'IMPUESTO SOBRE BIENES INMUEBLES',
                amount: municipalityData.impuesto_bi || 0,
              },
              {
                label: 'IMPUESTO SOBRE PERSONAL',
                amount: municipalityData.impuesto_personal || 0,
              },
              {
                label: 'IMPUESTO INDUSTRIA Y COMERCIO',
                amount: municipalityData.impuesto_industria || 0,
              },
              {
                label: 'IMPUESTO COMERCIO',
                amount: municipalityData.impuesto_comercio || 0,
              },
              {
                label: 'IMPUESTO SERVICIOS',
                amount: municipalityData.impuesto_servicios || 0,
              },
              {
                label: 'IMPUESTO PECUARIO',
                amount: municipalityData.impuesto_pecuario || 0,
              },
              {
                label: 'IMPUESTO EXTRACCIÓN',
                amount: municipalityData.impuesto_extraccion || 0,
              },
              {
                label: 'IMPUESTO TELECOMUNICACIONES',
                amount: municipalityData.impuesto_telecomunicaciones || 0,
              },
            ],
          },

          // INGRESOS NO TRIBUTARIOS
          ingresos_no_tributarios: {
            total: (municipalityData.tasas_servicios || 0) +
              (municipalityData.derechos || 0) +
              (municipalityData.ingresos_no_tributarios || 0),
            details: [
              {
                label: 'TASAS Y SERVICIOS',
                amount: municipalityData.tasas_servicios || 0,
              },
              {
                label: 'DERECHOS',
                amount: municipalityData.derechos || 0,
              },
              {
                label: 'OTROS INGRESOS NO TRIBUTARIOS',
                amount: municipalityData.ingresos_no_tributarios || 0,
              },
            ],
          },

          // INGRESOS DE CAPITAL
          ingresos_capital: {
            total: municipalityData.ingresos_capital || 0,
            details: [
              {
                label: 'PRÉSTAMOS',
                amount: municipalityData.prestamos || 0,
              },
              {
                label: 'VENTA DE ACTIVOS',
                amount: municipalityData.venta_activos || 0,
              },
              {
                label: 'CONTRIBUCIONES',
                amount: municipalityData.contribuciones || 0,
              },
              {
                label: 'COLOCACIÓN DE BONOS',
                amount: municipalityData.colocacion_bonos || 0,
              },
              {
                label: 'TRANSFERENCIAS ART. 91',
                amount: municipalityData.transferencias_art91 || 0,
              },
              {
                label: 'OTRAS TRANSFERENCIAS',
                amount: municipalityData.otras_transferencias || 0,
              },
              {
                label: 'SUBSIDIOS',
                amount: municipalityData.subsidios || 0,
              },
              {
                label: 'HERENCIAS Y LEGADOS',
                amount: municipalityData.herencias_legados || 0,
              },
              {
                label: 'OTROS INGRESOS DE CAPITAL',
                amount: municipalityData.otros_ingresos_capital || 0,
              },
              {
                label: 'RECURSOS DEL BALANCE',
                amount: municipalityData.recursos_balance || 0,
              },
            ],
          },

          // GASTOS DE FUNCIONAMIENTO
          gastos_funcionamiento: {
            total: municipalityData.gastos_funcionamiento || 0,
            details: [
              {
                label: 'SERVICIOS PERSONALES',
                amount: municipalityData.servicios_personales || 0,
              },
              {
                label: 'SERVICIOS NO PERSONALES',
                amount: municipalityData.servicios_no_personales || 0,
              },
              {
                label: 'MATERIALES Y SUMINISTRO',
                amount: municipalityData.materiales_suministro || 0,
              },
              {
                label: 'TRANSFERENCIAS CORRIENTES',
                amount: municipalityData.transferencias_corrientes || 0,
              },
              {
                label: 'OTROS GASTOS',
                amount: municipalityData.otros_gastos || 0,
              },
            ],
          },

          // GASTOS DE CAPITAL Y DEUDA PÚBLICA
          gastos_capital: {
            total: municipalityData.gastos_capital_deuda || 0,
            details: [
              {
                label: 'BIENES CAPITALIZABLES',
                amount: municipalityData.bienes_capitalizables || 0,
              },
              {
                label: 'TRANSFERENCIAS DE CAPITAL',
                amount: municipalityData.transferencias_capital || 0,
              },
              {
                label: 'ACTIVOS FINANCIEROS',
                amount: municipalityData.activos_financieros || 0,
              },
              {
                label: 'SERVICIOS DE DEUDA',
                amount: municipalityData.servicios_deuda || 0,
              },
              {
                label: 'OTROS GASTOS DE CAPITAL',
                amount: municipalityData.otros_gastos_capital || 0,
              },
              {
                label: 'ASIGNACIONES GLOBALES',
                amount: municipalityData.asignaciones_globales || 0,
              },
            ],
          },

          // TOTAL EGRESOS
          total_egresos: {
            total: egresosTotal,
            details: [
              {
                label: 'TOTAL EGRESOS',
                amount: egresosTotal,
              },
              {
                label: 'SUPERÁVIT/DÉFICIT',
                amount: municipalityData.superavit_deficit || 0,
              },
            ],
          },
        };

        setData(fiscalData);
      } catch (err: any) {
        setError(err.message || 'Error al cargar datos del municipio');
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [municipioName, year, departmentName]);

  return { data, loading, error };
}