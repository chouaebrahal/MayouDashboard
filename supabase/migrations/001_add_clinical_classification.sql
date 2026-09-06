alter table public.patients
  add column if not exists cto boolean not null default false,
  add column if not exists cas_specifique text;

create index if not exists patients_cto_idx on public.patients (cto);
create index if not exists patients_cas_specifique_idx on public.patients (cas_specifique);