-- ---------------------------------------------------------------
-- Ferie residue, richieste dal telefono e zone valide per timbrare
-- Da eseguire una sola volta nel SQL Editor di Supabase.
-- ---------------------------------------------------------------

-- Giorni di ferie che spettano ogni anno a ciascun dipendente
alter table dipendenti add column if not exists ferie_annue integer default 26;

-- Richieste di ferie e permessi inviate dagli operai: restano in attesa
-- finche' l'ufficio non decide.
create table if not exists richieste_ferie (
  id uuid primary key default gen_random_uuid(),
  dipendente text not null,
  tipo text not null default 'Ferie',
  data_inizio date not null,
  data_fine date not null,
  note text default '',
  stato text not null default 'In attesa',
  motivo_rifiuto text default '',
  creata_il timestamptz default now(),
  decisa_il timestamptz,
  decisa_da text default ''
);

create index if not exists richieste_ferie_stato_idx on richieste_ferie (stato, data_inizio);

-- Impostazioni condivise del gestionale, una riga per argomento
create table if not exists impostazioni (
  chiave text primary key,
  valore jsonb not null default '{}'::jsonb,
  aggiornata_il timestamptz default now()
);

-- Una timbratura fuori dalle zone consentite resta registrata ma segnata
alter table timbrature add column if not exists valida boolean default true;
alter table timbrature add column if not exists distanza integer;

alter table richieste_ferie enable row level security;
alter table impostazioni enable row level security;

drop policy if exists "accesso approvato" on richieste_ferie;
create policy "accesso approvato" on richieste_ferie
  for all using (e_approvato()) with check (e_approvato());

-- Le impostazioni le leggono tutti, le cambia solo l'amministratore
drop policy if exists "impostazioni lettura" on impostazioni;
create policy "impostazioni lettura" on impostazioni
  for select using (e_approvato());

drop policy if exists "impostazioni scrittura" on impostazioni;
create policy "impostazioni scrittura" on impostazioni
  for insert with check (e_amministratore());

drop policy if exists "impostazioni modifica" on impostazioni;
create policy "impostazioni modifica" on impostazioni
  for update using (e_amministratore()) with check (e_amministratore());
