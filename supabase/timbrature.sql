-- ---------------------------------------------------------------
-- Timbrature: entrate e uscite registrate dagli operai dal telefono
-- Da eseguire una sola volta nel SQL Editor di Supabase.
-- ---------------------------------------------------------------

create table if not exists timbrature (
  id uuid primary key default gen_random_uuid(),
  dipendente text not null,
  giorno date not null default current_date,
  tipo text not null,
  ora timestamptz not null default now(),
  lat double precision,
  lon double precision,
  lavoro_id uuid references lavori on delete set null,
  note text default ''
);

create index if not exists timbrature_giorno_idx on timbrature (giorno, dipendente);

alter table timbrature enable row level security;

drop policy if exists "accesso approvato" on timbrature;
create policy "accesso approvato" on timbrature
  for all using (e_approvato()) with check (e_approvato());
