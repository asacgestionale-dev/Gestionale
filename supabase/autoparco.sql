-- ---------------------------------------------------------------
-- Autoparco: mezzi aziendali e interventi di officina
-- Da eseguire una sola volta nel SQL Editor di Supabase.
-- ---------------------------------------------------------------

create table if not exists mezzi (
  id uuid primary key default gen_random_uuid(),
  targa text not null unique,
  tipo text default 'Furgone',
  marca text default '',
  modello text default '',
  anno integer,
  carburante text default '',
  km integer default 0,
  assegnato_a text default '',
  assicurazione date,
  revisione date,
  bollo date,
  tagliando date,
  in_servizio boolean default true,
  note text default '',
  creato_il timestamptz default now()
);

create table if not exists mezzi_interventi (
  id uuid primary key default gen_random_uuid(),
  mezzo_id uuid references mezzi on delete cascade,
  tipo text default 'Riparazione',
  data date not null default current_date,
  km integer default 0,
  costo numeric default 0,
  officina text default '',
  note text default ''
);

-- Stesse regole delle altre tabelle: dentro solo chi ha l'accesso approvato
alter table mezzi enable row level security;
alter table mezzi_interventi enable row level security;

drop policy if exists "accesso approvato" on mezzi;
create policy "accesso approvato" on mezzi
  for all using (e_approvato()) with check (e_approvato());

drop policy if exists "accesso approvato" on mezzi_interventi;
create policy "accesso approvato" on mezzi_interventi
  for all using (e_approvato()) with check (e_approvato());
