-- ---------------------------------------------------------------
-- Dati di prova: 10 dipendenti, 10 mezzi, 10 DPI
-- Da eseguire nel SQL Editor di Supabase. Si può rilanciare: non crea
-- doppioni. Tutti i record hanno la nota "Dati di prova": in fondo al
-- file c'è la query per toglierli.
-- ---------------------------------------------------------------

-- Tabelle dell'autoparco, nel caso non fossero ancora state create
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
alter table mezzi enable row level security;
drop policy if exists "accesso approvato" on mezzi;
create policy "accesso approvato" on mezzi
  for all using (e_approvato()) with check (e_approvato());

-- ---------------- 10 dipendenti ----------------
insert into dipendenti (nome, ruolo, telefono, email, assunzione, qualifiche, note)
select v.nome, v.ruolo, v.telefono, v.email, v.assunzione::date, v.qualifiche::jsonb, 'Dati di prova'
from (values
  ('Marco Bianchi',    'Capocantiere', '333 000 0001', 'marco.bianchi@example.com',    '2012-03-01', '["Preposto formato", "Primo soccorso", "Antincendio rischio medio"]'),
  ('Luca Ferrari',     'Preposto',     '333 000 0002', 'luca.ferrari@example.com',     '2015-06-15', '["Preposto formato", "Lavori in quota", "PLE piattaforme"]'),
  ('Andrea Romano',    'Preposto',     '333 000 0003', 'andrea.romano@example.com',    '2016-09-01', '["Preposto formato", "Gru su autocarro", "Patente C"]'),
  ('Giuseppe Colombo', 'Tecnico',      '333 000 0004', 'giuseppe.colombo@example.com', '2018-02-12', '["PES/PAV lavori elettrici", "Verifiche impianti"]'),
  ('Francesco Ricci',  'Operaio',      '333 000 0005', 'francesco.ricci@example.com',  '2019-04-08', '["Escavatorista", "Patente C"]'),
  ('Alessio Marino',   'Operaio',      '333 000 0006', 'alessio.marino@example.com',   '2020-01-20', '["Lavori in quota", "Montaggio ponteggi"]'),
  ('Davide Greco',     'Operaio',      '333 000 0007', 'davide.greco@example.com',     '2021-05-03', '["PLE piattaforme", "Carrellista"]'),
  ('Simone Bruno',     'Operaio',      '333 000 0008', 'simone.bruno@example.com',     '2022-03-14', '["Primo soccorso"]'),
  ('Matteo Gallo',     'Operaio',      '333 000 0009', 'matteo.gallo@example.com',     '2023-10-02', '["Spazi confinati", "Lavori in quota"]'),
  ('Elena Conti',      'Impiegato',    '333 000 0010', 'elena.conti@example.com',      '2017-11-06', '["Antincendio rischio basso"]')
) as v(nome, ruolo, telefono, email, assunzione, qualifiche)
where not exists (select 1 from dipendenti d where lower(d.nome) = lower(v.nome));

-- ---------------- 10 mezzi ----------------
-- Alcune scadenze sono volutamente vicine o passate, per vedere i colori:
-- Iveco Daily in scadenza, Dacia Duster con l'assicurazione scaduta,
-- rimorchio fuori servizio.
insert into mezzi (targa, tipo, marca, modello, anno, carburante, km, assegnato_a,
                   assicurazione, revisione, bollo, tagliando, in_servizio, note)
values
  ('GK482TR',   'Furgone',           'Fiat',    'Ducato',               2021, 'Gasolio',  86500, 'Luca Ferrari',     '2027-03-31', '2027-05-15', '2027-02-28', '2026-11-20', true,  'Dati di prova'),
  ('FZ915LM',   'Furgone',           'Iveco',   'Daily 35S',            2019, 'Gasolio', 142300, 'Simone Bruno',     '2026-09-28', '2026-10-05', '2027-01-31', '2026-09-20', true,  'Dati di prova'),
  ('GP207XC',   'Furgone',           'Ford',    'Transit Custom',       2022, 'Gasolio',  54200, 'Marco Bianchi',    '2027-06-30', '2026-12-10', '2027-04-30', '2027-01-15', true,  'Dati di prova'),
  ('GR640BN',   'Auto',              'Fiat',    'Panda',                2023, 'Benzina',  21800, 'Elena Conti',      '2027-08-31', '2027-02-28', '2027-05-31', '2027-03-01', true,  'Dati di prova'),
  ('GE338KD',   'Auto',              'Dacia',   'Duster',               2020, 'GPL',      98700, 'Giuseppe Colombo', '2026-09-01', '2027-03-20', '2026-10-31', '2026-12-05', true,  'Dati di prova'),
  ('FX772HP',   'Pick-up',           'Toyota',  'Hilux',                2019, 'Gasolio', 131000, 'Francesco Ricci',  '2027-01-31', '2026-10-12', '2027-03-31', '2026-10-01', true,  'Dati di prova'),
  ('EZ104RT',   'Autocarro',         'Iveco',   'Eurocargo con gru',    2017, 'Gasolio', 187400, 'Andrea Romano',    '2027-04-30', '2027-01-18', '2027-04-30', '2026-11-10', true,  'Dati di prova · gru con verifica periodica annuale'),
  ('FD553KA',   'Piattaforma aerea', 'Socage',  'ForSte 21D su Isuzu',  2018, 'Gasolio',  64200, 'Davide Greco',     '2027-05-31', '2026-09-30', '2027-05-31', '2026-12-15', true,  'Dati di prova · PLE con verifica periodica annuale'),
  ('MEZ-ESC01', 'Escavatore',        'Kubota',  'KX019-4 miniescavatore', 2020, 'Gasolio',   0, '',                 '2027-02-28', null,         null,         '2026-10-30', true,  'Dati di prova · mezzo d''opera, ore motore 2.340'),
  ('XB318KL',   'Rimorchio',         'Humbaur', 'Carrello 2 assi',      2016, '',             0, '',                 '2027-03-31', '2026-11-30', null,         null,         false, 'Dati di prova · fermo per riparazione impianto luci')
on conflict (targa) do nothing;

-- ---------------- 10 DPI ----------------
-- La validità in mesi è indicativa: fa fede la nota informativa del fabbricante.
insert into dpi (nome, categoria, norma, durata_mesi, note)
select v.nome, v.categoria, v.norma, v.durata_mesi, 'Dati di prova'
from (values
  ('Elmetto di protezione',                'Testa',            'EN 397',            60),
  ('Occhiali a mascherina',                'Occhi e viso',     'EN 166',            24),
  ('Cuffie antirumore',                    'Udito',            'EN 352-1',          36),
  ('Semimaschera con filtri A2P3',         'Vie respiratorie', 'EN 140 / EN 14387', 12),
  ('Guanti antitaglio',                    'Mani',             'EN 388',             6),
  ('Guanti dielettrici',                   'Mani',             'EN 60903',           6),
  ('Scarpe antinfortunistiche S3',         'Piedi',            'EN ISO 20345',      12),
  ('Giacca impermeabile',                  'Corpo',            'EN 343',            24),
  ('Imbracatura anticaduta',               'Anticaduta',       'EN 361',            60),
  ('Gilet alta visibilità',                'Alta visibilità',  'EN ISO 20471',      24)
) as v(nome, categoria, norma, durata_mesi)
where not exists (select 1 from dpi d where lower(d.nome) = lower(v.nome));

-- Controllo: quanti record di prova ci sono adesso
select 'dipendenti' as tabella, count(*) from dipendenti where note like 'Dati di prova%'
union all select 'mezzi', count(*) from mezzi where note like 'Dati di prova%'
union all select 'dpi', count(*) from dpi where note like 'Dati di prova%';

-- ---------------------------------------------------------------
-- Per TOGLIERE i dati di prova (eseguire solo quando non servono più):
--   delete from mezzi      where note like 'Dati di prova%';
--   delete from dipendenti where note like 'Dati di prova%';
--   delete from dpi        where note like 'Dati di prova%';
-- ---------------------------------------------------------------
