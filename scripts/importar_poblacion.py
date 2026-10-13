#!/usr/bin/env python3
"""
Carga la población INE a la tabla public.poblacion (sql/001_poblacion.sql).
ESTADO: SIN EJECUTAR. Falta el CSV del INE [PENDIENTE] y aprobar 001_poblacion.sql.

CSV esperado (UTF-8, con encabezado): cod_depto,cod_muni,anio,poblacion

Uso:
    python scripts/importar_poblacion.py ruta.csv             # solo valida, no escribe
    python scripts/importar_poblacion.py ruta.csv --escribir  # upsert en Supabase

.env.local: REACT_APP_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
"""

import argparse
import csv
import os
import sys
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("csv")
ap.add_argument("--escribir", action="store_true", help="sin esta bandera solo valida")
args = ap.parse_args()

filas, errores = [], []
with open(args.csv, encoding="utf-8-sig", newline="") as f:
    for i, r in enumerate(csv.DictReader(f), start=2):
        try:
            fila = {k: int(r[k]) for k in ("cod_depto", "cod_muni", "anio", "poblacion")}
        except (KeyError, ValueError) as e:
            errores.append(f"línea {i}: {e}")
            continue
        if not (1 <= fila["cod_depto"] <= 18 and fila["cod_muni"] > 0 and fila["poblacion"] > 0):
            errores.append(f"línea {i}: fuera de rango {fila}")
            continue
        filas.append(fila)

claves = [(r["cod_depto"], r["cod_muni"], r["anio"]) for r in filas]
if len(claves) != len(set(claves)):
    errores.append("claves (cod_depto, cod_muni, anio) duplicadas")

por_anio = {}
for r in filas:
    por_anio[r["anio"]] = por_anio.get(r["anio"], 0) + 1
print(f"{len(filas)} filas válidas; municipios por año: {dict(sorted(por_anio.items()))}")
if errores:
    print("\n".join(errores[:20]))
    sys.exit(1)
if not args.escribir:
    print("Validación OK. No se escribió nada (use --escribir).")
    sys.exit(0)

for line in (Path(__file__).parent.parent / ".env.local").read_text(encoding="utf-8-sig").splitlines():
    k, _, v = line.partition("=")
    if v and not k.startswith("#"):
        os.environ.setdefault(k.strip(), v.strip())

from supabase import create_client  # noqa: E402

sb = create_client(os.environ["REACT_APP_SUPABASE_URL"], os.environ["SUPABASE_SERVICE_ROLE_KEY"])
for i in range(0, len(filas), 500):
    sb.table("poblacion").upsert(filas[i:i + 500]).execute()
print(f"Upsert de {len(filas)} filas en public.poblacion.")
