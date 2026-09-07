alter table public.patients
  add column if not exists calcification_coronaire boolean not null default false;

create index if not exists patients_calcification_coronaire_idx
  on public.patients (calcification_coronaire);