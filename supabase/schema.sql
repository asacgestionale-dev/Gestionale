-- Schema del gestionale cantieri.
-- Da eseguire nel SQL Editor di Supabase (una volta sola).

-- ---------------------------------------------------------------
-- Profili: estendono gli utenti di Supabase Auth con ruolo e stato.
-- L'accesso all'app resta bloccato finché un amministratore non approva.
-- ---------------------------------------------------------------
create table if not exists profili (
  id uuid primary key references auth.users on delete cascade,
  nome text not null default '',
  email text not null default '',
  ruolo text not null default 'Operaio',
  approvato boolean not null default false,
  creato_il timestamptz not null default now()
);

-- Alla registrazione il profilo nasce da solo; il primo iscritto è l'amministratore
create or replace function crea_profilo()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  primo boolean;
begin
  select count(*) = 0 into primo from profili;

  insert into profili (id, nome, email, ruolo, approvato)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', ''),
    new.email,
    case when primo then 'Amministratore'
         else coalesce(new.raw_user_meta_data->>'ruolo', 'Operaio') end,
    primo
  );
  return new;
end;
$$;

drop trigger if exists su_nuovo_utente on auth.users;
create trigger su_nuovo_utente
  after insert on auth.users
  for each row execute function crea_profilo();

-- Chi è amministratore (usata dalle policy, evita ricorsione su profili)
create or replace function e_amministratore()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from profili
    where id = auth.uid() and ruolo = 'Amministratore' and approvato
  );
$$;

-- Chi ha un accesso valido: solo gli approvati vedono i dati
create or replace function e_approvato()
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (select 1 from profili where id = auth.uid() and approvato);
$$;

-- ---------------------------------------------------------------
-- Anagrafiche e operatività
-- ---------------------------------------------------------------
create table if not exists clienti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  indirizzo text default '',
  referente text default '',
  telefono text default '',
  creato_il timestamptz not null default now()
);

create table if not exists dipendenti (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  ruolo text default 'Operaio',
  telefono text default '',
  email text default '',
  assunzione date,
  qualifiche jsonb not null default '[]',
  note text default ''
);

create table if not exists lavori (
  id uuid primary key default gen_random_uuid(),
  titolo text not null,
  cliente_id uuid references clienti on delete set null,
  note text default '',
  durata numeric not null default 1,
  materiali jsonb not null default '[]',
  indirizzo text default '',
  posizione jsonb,
  importo numeric not null default 0,
  incassato numeric not null default 0,
  completato boolean not null default false,
  chiuso boolean not null default false,
  appuntamento boolean not null default false,
  spostamenti jsonb not null default '[]',
  consuntivo jsonb,
  assegnato jsonb,
  colore text default 'blu',
  creato_il timestamptz not null default now(),
  validato_il timestamptz
);

-- Presenze: una riga per dipendente e giornata
create table if not exists presenze (
  id uuid primary key default gen_random_uuid(),
  giorno date not null,
  dipendente text not null,
  stato text not null default 'Presente',
  unique (giorno, dipendente)
);

-- Composizione delle squadre giorno per giorno
create table if not exists squadre (
  id uuid primary key default gen_random_uuid(),
  giorno date not null,
  squadra_id text not null,
  membri jsonb not null default '[]',
  unique (giorno, squadra_id)
);

-- Squadre fisse: valgono per ogni giornata finché non si riapre il lucchetto
create table if not exists squadre_bloccate (
  squadra_id text primary key,
  membri jsonb not null default '[]'
);

create table if not exists pagamenti (
  id uuid primary key default gen_random_uuid(),
  lavoro_id uuid not null references lavori on delete cascade,
  tipo text not null default 'Acconto',
  importo numeric not null default 0,
  data date not null default current_date,
  modalita text default 'Bonifico',
  note text default ''
);

create table if not exists dpi (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text default '',
  norma text default '',
  durata_mesi integer default 12,
  note text default ''
);

create table if not exists dpi_consegne (
  id uuid primary key default gen_random_uuid(),
  dpi_id uuid references dpi on delete cascade,
  dipendente text not null,
  taglia text default '',
  data_consegna date not null default current_date,
  scadenza date,
  note text default ''
);

-- ---------------------------------------------------------------
-- Row Level Security: nessun accesso senza account approvato
-- ---------------------------------------------------------------
alter table profili enable row level security;
alter table clienti enable row level security;
alter table dipendenti enable row level security;
alter table lavori enable row level security;
alter table presenze enable row level security;
alter table squadre enable row level security;
alter table squadre_bloccate enable row level security;
alter table pagamenti enable row level security;
alter table dpi enable row level security;
alter table dpi_consegne enable row level security;

-- Profili: ognuno vede il proprio, l'amministratore vede e gestisce tutti
drop policy if exists "profilo proprio" on profili;
create policy "profilo proprio" on profili
  for select using (id = auth.uid() or e_amministratore());

drop policy if exists "amministratore aggiorna profili" on profili;
create policy "amministratore aggiorna profili" on profili
  for update using (e_amministratore());

drop policy if exists "amministratore elimina profili" on profili;
create policy "amministratore elimina profili" on profili
  for delete using (e_amministratore());

-- Dati operativi: leggibili e modificabili da chi ha l'accesso approvato
do $$
declare
  t text;
begin
  foreach t in array array[
    'clienti','dipendenti','lavori','presenze','squadre',
    'squadre_bloccate','pagamenti','dpi','dpi_consegne'
  ]
  loop
    execute format('drop policy if exists "accesso approvato" on %I', t);
    execute format(
      'create policy "accesso approvato" on %I for all using (e_approvato()) with check (e_approvato())',
      t
    );
  end loop;
end $$;

-- ---------------------------------------------------------------
-- Archivio documenti (fatture, certificati, preventivi)
-- ---------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('documenti', 'documenti', false)
on conflict (id) do nothing;

drop policy if exists "documenti leggibili" on storage.objects;
create policy "documenti leggibili" on storage.objects
  for select using (bucket_id = 'documenti' and e_approvato());

drop policy if exists "documenti scrivibili" on storage.objects;
create policy "documenti scrivibili" on storage.objects
  for insert with check (bucket_id = 'documenti' and e_approvato());

drop policy if exists "documenti eliminabili" on storage.objects;
create policy "documenti eliminabili" on storage.objects
  for delete using (bucket_id = 'documenti' and e_approvato());
