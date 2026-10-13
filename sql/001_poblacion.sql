-- 001_poblacion.sql — población municipal INE (Proyecciones 2013–2050, base Censo 2013).
-- ESTADO: SIN EJECUTAR. Requiere aprobación antes de correrlo en el SQL Editor de Supabase.
-- Clave: código INE de departamento (01 Atlántida … 18 Yoro, orden alfabético) + `code` SEFIN del municipio.

create table if not exists public.poblacion (
  cod_depto  smallint not null check (cod_depto between 1 and 18),
  cod_muni   smallint not null check (cod_muni > 0),
  anio       smallint not null check (anio between 2000 and 2050),
  poblacion  integer  not null check (poblacion > 0),
  fuente     text     not null default 'INE – Proyecciones de población 2013–2050',
  primary key (cod_depto, cod_muni, anio)
);

alter table public.poblacion enable row level security;

-- Lectura pública (dato abierto); escritura solo con service_role, que omite RLS.
create policy "poblacion_lectura_publica" on public.poblacion
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.poblacion from anon, authenticated;
