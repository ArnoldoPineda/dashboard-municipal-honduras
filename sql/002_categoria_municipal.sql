-- 002_categoria_municipal.sql — categoría municipal A–D con fuente y criterio documentados.
-- ESTADO: SIN EJECUTAR. Requiere aprobación.
-- Criterio: categoría establecida por la SGJD en 2020 (nota al pie de las hojas 2021 y 2022 del Excel SEFIN).
-- Mientras no se cargue, la app lee municipalities.category (columna CATEGORÍA del Excel SEFIN).
-- Clave: código INE de departamento (01 Atlántida, 02 Colón, 03 Comayagua … 06 Choluteca … 18 Yoro; = COD_DEP_MAP de PresupuestarioPage) + `code` SEFIN, igual que public.poblacion.

create table if not exists public.categoria_municipal (
  cod_depto  smallint not null check (cod_depto between 1 and 18),
  cod_muni   smallint not null check (cod_muni > 0),
  anio       smallint not null check (anio between 2000 and 2050),
  categoria  char(1)  not null check (categoria in ('A', 'B', 'C', 'D')),
  fuente     text     not null default 'Excel SEFIN Base_Financiera_Municipal, nota: "Categoría Municipal establecida por la SGJD 2020"',
  criterio   text     not null default 'SGJD 2020',  -- regla de clasificación de la SGJD: [PENDIENTE] documento oficial
  primary key (cod_depto, cod_muni, anio)
);

alter table public.categoria_municipal enable row level security;

-- Lectura pública (dato abierto); escritura solo con service_role, que omite RLS.
create policy "categoria_municipal_lectura_publica" on public.categoria_municipal
  for select to anon, authenticated using (true);

revoke insert, update, delete on public.categoria_municipal from anon, authenticated;
