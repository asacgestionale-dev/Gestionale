-- ---------------------------------------------------------------
-- Flusso dei lavori, fatture, costi e anagrafica materiali
-- Da eseguire una sola volta nel SQL Editor di Supabase.
-- ---------------------------------------------------------------

-- Fatture emesse per ogni lavoro: acconti, SAL e saldo
create table if not exists fatture (
  id uuid primary key default gen_random_uuid(),
  lavoro_id uuid not null references lavori on delete cascade,
  numero text not null default '',
  data date not null default current_date,
  tipo text not null default 'Saldo',
  imponibile numeric not null default 0,
  iva numeric not null default 22,
  scadenza date,
  note text default '',
  creato_il timestamptz default now()
);

create index if not exists fatture_lavoro_idx on fatture (lavoro_id);

-- Ogni incasso si può collegare alla fattura che salda
alter table pagamenti add column if not exists fattura_id uuid references fatture on delete set null;

-- Costi del lavoro oltre alla manodopera: materiali e altre spese
alter table lavori add column if not exists costi jsonb not null default '{}'::jsonb;

-- Anagrafica materiali: il magazzino
create table if not exists materiali (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text default '',
  unita text default 'pz',
  prezzo numeric default 0,
  scorta numeric default 0,
  scorta_minima numeric default 0,
  fornitore text default '',
  note text default '',
  creato_il timestamptz default now()
);

alter table fatture enable row level security;
alter table materiali enable row level security;

drop policy if exists "accesso approvato" on fatture;
create policy "accesso approvato" on fatture
  for all using (e_approvato()) with check (e_approvato());

drop policy if exists "accesso approvato" on materiali;
create policy "accesso approvato" on materiali
  for all using (e_approvato()) with check (e_approvato());
