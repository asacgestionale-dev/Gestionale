-- ---------------------------------------------------------------
-- Dati di prova: 10 dipendenti, 10 mezzi, 10 DPI, 10 clienti, 10 lavori,
-- 10 materiali, fatture e incassi
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

-- ---------------- 10 clienti ----------------
-- La tabella clienti non aveva un campo note: lo aggiungo, così anche i
-- clienti di prova si riconoscono e si tolgono. Il gestionale lo ignora.
alter table clienti add column if not exists note text default '';

insert into clienti (nome, indirizzo, referente, telefono, note)
select v.nome, v.indirizzo, v.referente, v.telefono, 'Dati di prova'
from (values
  ('Condominio Parco dei Pini',         'Via Roma 45, Cisterna di Latina',               'Paolo Fabbri (amministratore)', '0773 000 101'),
  ('Ristorante La Lanterna srl',        'Corso della Repubblica 120, Latina',            'Gino Esposito',                 '0773 000 102'),
  ('Supermercato Freschezza srl',       'Via Nettunense 210, Aprilia',                   'Laura Sartori',                 '06 000 0103'),
  ('Studio Medico Salus',               'Corso della Repubblica 15, Velletri',           'Dott.ssa Anna Mancini',         '06 000 0104'),
  ('Famiglia Moretti',                  'Via Roma 12, Cori',                             'Roberto Moretti',               '333 000 0105'),
  ('Azienda Agricola Il Casale',        'Via Monti Lepini 300, Sezze',                   'Stefano Leone',                 '0773 000 106'),
  ('Hotel Riviera Blu',                 'Riviera Zanardelli 150, Anzio',                 'Chiara Villa',                  '06 000 0107'),
  ('Scuola dell''infanzia Arcobaleno',  'Via Roma 8, Sermoneta',                         'Suor Maria Grazia',             '0773 000 108'),
  ('Officina F.lli Rinaldi snc',        'Via Nettuno 90, Cisterna di Latina',            'Fabio Rinaldi',                 '06 000 0109'),
  ('Palestra Energy Club',              'Via Isonzo 60, Latina',                         'Valentina Costa',               '0773 000 110')
) as v(nome, indirizzo, referente, telefono)
where not exists (select 1 from clienti c where lower(c.nome) = lower(v.nome));

-- ---------------- 10 lavori ----------------
-- Uno per cliente di prova (servono i clienti qui sopra). Le date sono
-- relative al giorno in cui si esegue lo script, così restano attuali:
--   4 da assegnare
--   3 assegnati per domani (Squadra 1 alle 8:00 e alle 11:30, Squadra 2 alle 9:00)
--   1 con appuntamento fisso dopodomani alle 10:00 (Squadra 3)
--   1 eseguito ieri con rapportino da validare (con segnalazioni: un'ora in
--     più e un materiale non previsto)
--   1 chiuso cinque giorni fa, validato e saldato
-- La nota di ogni lavoro finisce con "· Dati di prova".
insert into lavori (titolo, cliente_id, note, durata, materiali, indirizzo, importo, incassato,
                    completato, chiuso, appuntamento, consuntivo, assegnato, colore, validato_il)
select
  v.titolo,
  c.id,
  v.note || ' · Dati di prova',
  v.durata,
  v.materiali::jsonb,
  c.indirizzo,
  v.importo,
  v.incassato,
  v.completato,
  v.chiuso,
  v.appuntamento,
  case when v.consuntivo is null then null
       else v.consuntivo::jsonb
            || jsonb_build_object('compilatoIl', to_char(current_date + v.giorni, 'YYYY-MM-DD') || 'T16:30:00Z')
  end,
  case when v.giorni is null then null
       else jsonb_build_object('teamId', v.squadra,
                               'data', to_char(current_date + v.giorni, 'YYYY-MM-DD'),
                               'minuti', v.minuti)
  end,
  v.colore,
  case when v.chiuso then (current_date + v.giorni + 1) + time '09:00' else null end
from (values
  ('Condominio Parco dei Pini', 'Rifacimento impermeabilizzazione terrazzo',
   'Rimuovere la vecchia guaina, stendere primer e doppia guaina ardesiata. Chiavi del lastrico dal portiere.',
   6, '["Guaina ardesiata 4 mm", "Primer bituminoso", "Bocchettoni di scarico"]',
   4800, 0, 'blu', null, null, null, false, false, false, null),

  ('Ristorante La Lanterna srl', 'Sostituzione cappa di aspirazione cucina',
   'Smontare la cappa esistente e montare il nuovo motore. Finire entro le 11, poi apre la cucina.',
   4, '["Motore di aspirazione", "Canna fumaria inox 250 mm", "Staffe di fissaggio"]',
   2200, 0, 'verde', 't2', 1, 540, false, false, false, null),

  ('Supermercato Freschezza srl', 'Manutenzione impianto di climatizzazione',
   'Pulizia dei filtri e controllo del gas sulle 4 macchine del reparto vendita.',
   3, '["Filtri G4", "Gas R32", "Detergente per batterie"]',
   950, 0, 'ambra', 't1', 1, 480, false, false, false, null),

  ('Studio Medico Salus', 'Verifica e messa a norma quadro elettrico',
   'Appuntamento concordato con la dottoressa: lo studio resta chiuso solo in quella fascia.',
   2, '["Interruttore differenziale 30 mA", "Morsettiera"]',
   680, 0, 'rosa', 't3', 2, 600, true, false, false, null),

  ('Famiglia Moretti', 'Riparazione perdita in bagno',
   'Perdita sotto il piatto doccia: verificare sifone e sigillature.',
   2, '["Sifone per piatto doccia", "Silicone sanitario"]',
   350, 0, 'viola', 't1', 1, 690, false, false, false, null),

  ('Azienda Agricola Il Casale', 'Riparazione copertura capannone',
   'Sostituire 6 pannelli danneggiati dalla grandine e rifare la lattoneria sul lato nord.',
   6, '["Pannelli sandwich 40 mm", "Viti autofilettanti", "Lattoneria"]',
   6500, 2000, 'blu', null, null, null, false, false, false, null),

  ('Hotel Riviera Blu', 'Tinteggiatura corridoi primo piano',
   'Lavorare un corridoio alla volta per non chiudere le camere. Colore bianco ghiaccio.',
   6, '["Idropittura lavabile", "Nastro di carta", "Teli di protezione"]',
   3200, 0, 'verde', null, null, null, false, false, false, null),

  ('Scuola dell''infanzia Arcobaleno', 'Sostituzione plafoniere aule con LED',
   'Sostituire le plafoniere delle tre aule al piano terra.',
   4, '["Plafoniere LED 60x60", "Cavo FS17 1,5 mm"]',
   1850, 0, 'rosa', 't2', -1, 480, false, true, false,
   '{"oreEffettive": 5, "materialiUsati": ["Plafoniere LED 60x60", "Cavo FS17 1,5 mm", "Scatole di derivazione"], "noteOperaio": "Sostituite 12 plafoniere. Servite 3 scatole di derivazione non previste.", "compilatoDa": "Andrea Romano, Alessio Marino", "rifiutato": false, "motivoRifiuto": ""}'),

  ('Officina F.lli Rinaldi snc', 'Rifacimento pavimentazione area lavaggio',
   'Demolire il vecchio massetto, rifare le pendenze verso la canaletta e stendere la resina.',
   6, '["Massetto", "Resina epossidica", "Canaletta di scolo"]',
   5400, 5400, 'ambra', 't1', -5, 480, false, true, true,
   '{"oreEffettive": 6, "materialiUsati": ["Massetto", "Resina epossidica", "Canaletta di scolo"], "noteOperaio": "Lavoro completato, resina stesa in due mani.", "compilatoDa": "Luca Ferrari, Francesco Ricci", "rifiutato": false, "motivoRifiuto": ""}'),

  ('Palestra Energy Club', 'Nuovi punti luce sala pesi',
   'Aggiungere 8 faretti e i relativi interruttori vicino all''ingresso.',
   3, '["Faretti LED", "Tubo corrugato", "Interruttori"]',
   1200, 0, 'viola', null, null, null, false, false, false, null)
) as v(cliente, titolo, note, durata, materiali, importo, incassato, colore,
       squadra, giorni, minuti, appuntamento, completato, chiuso, consuntivo)
join clienti c on c.nome = v.cliente
where not exists (
  select 1 from lavori l where l.titolo = v.titolo and l.note like '%Dati di prova%'
);

-- ---------------- fatture, incassi e costi dei lavori di prova ----------------
-- Servono le tabelle di flusso_e_fatture.sql: se mancano le creo qui.
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
alter table fatture enable row level security;
drop policy if exists "accesso approvato" on fatture;
create policy "accesso approvato" on fatture
  for all using (e_approvato()) with check (e_approvato());
alter table pagamenti add column if not exists fattura_id uuid references fatture on delete set null;
alter table lavori add column if not exists costi jsonb not null default '{}'::jsonb;

-- Quattro fatture:
--   pavimentazione (chiusa): acconto e saldo, tutti e due pagati -> Incassato
--   capannone: acconto pagato prima di iniziare
--   terrazzo del condominio: acconto al 30% NON pagato e già scaduto -> in rosso
insert into fatture (lavoro_id, numero, data, tipo, imponibile, iva, scadenza, note)
select l.id, to_char(current_date, 'YYYY') || '/' || v.progressivo, current_date + v.giorni,
       v.tipo, v.imponibile, v.iva, current_date + v.scade, 'Dati di prova'
from (values
  ('Rifacimento pavimentazione area lavaggio',  '001', 'Acconto', 2000, 22, -25,   5),
  ('Rifacimento pavimentazione area lavaggio',  '002', 'Saldo',   3400, 22,  -4,  26),
  ('Riparazione copertura capannone',           '003', 'Acconto', 2000, 22, -12,  18),
  ('Rifacimento impermeabilizzazione terrazzo', '004', 'Acconto', 1440, 10, -40, -10)
) as v(titolo, progressivo, tipo, imponibile, iva, giorni, scade)
join lavori l on l.titolo = v.titolo and l.note like '%Dati di prova%'
where not exists (
  select 1 from fatture f where f.lavoro_id = l.id and f.tipo = v.tipo and f.note = 'Dati di prova'
);

-- Gli incassi di prova si rifanno da capo, collegati alle loro fatture
-- (l'importo comprende l'IVA, come i soldi che arrivano davvero)
delete from pagamenti where note = 'Dati di prova';

insert into pagamenti (lavoro_id, fattura_id, tipo, importo, data, modalita, note)
select f.lavoro_id, f.id, f.tipo, round(f.imponibile * (1 + f.iva / 100), 2),
       current_date + v.giorni, 'Bonifico', 'Dati di prova'
from (values ('001', -20), ('002', -2), ('003', -8)) as v(progressivo, giorni)
join fatture f on f.numero = to_char(current_date, 'YYYY') || '/' || v.progressivo
              and f.note = 'Dati di prova';

-- Costi dei materiali, per vedere il margine dei lavori eseguiti
update lavori set costi = '{"materiali": 1350, "altri": 150}'::jsonb
where titolo = 'Rifacimento pavimentazione area lavaggio' and note like '%Dati di prova%';

update lavori set costi = '{"materiali": 620}'::jsonb
where titolo = 'Sostituzione plafoniere aule con LED' and note like '%Dati di prova%';

-- ---------------- 10 materiali ----------------
-- Tre sono volutamente sotto la scorta minima, per vederli in rosso.
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
alter table materiali enable row level security;
drop policy if exists "accesso approvato" on materiali;
create policy "accesso approvato" on materiali
  for all using (e_approvato()) with check (e_approvato());

insert into materiali (nome, categoria, unita, prezzo, scorta, scorta_minima, fornitore, note)
select v.nome, v.categoria, v.unita, v.prezzo, v.scorta, v.minima, v.fornitore, 'Dati di prova'
from (values
  ('Guaina ardesiata 4 mm',            'Impermeabilizzazione', 'rotolo', 58.00,  12,   5, 'Fornitore edile'),
  ('Primer bituminoso 20 l',           'Impermeabilizzazione', 'conf.',  64.00,   3,   4, 'Fornitore edile'),
  ('Cemento Portland 25 kg',           'Edile',                'sacco',   7.50,  40,  20, 'Fornitore edile'),
  ('Resina epossidica per pavimenti',  'Edile',                'kg',     18.00,  25,  10, 'Fornitore edile'),
  ('Cavo FS17 1,5 mm²',                'Elettrico',            'm',       0.45, 300, 200, 'Fornitore elettrico'),
  ('Plafoniera LED 60x60',             'Elettrico',            'pz',     32.00,   6,  10, 'Fornitore elettrico'),
  ('Interruttore differenziale 30 mA', 'Elettrico',            'pz',     38.00,   8,   4, 'Fornitore elettrico'),
  ('Sifone per piatto doccia',         'Idraulico',            'pz',     14.00,   5,   3, 'Fornitore idraulico'),
  ('Silicone sanitario',               'Idraulico',            'pz',      6.20,  18,  10, 'Fornitore idraulico'),
  ('Idropittura lavabile 14 l',        'Vernici',              'conf.',  49.00,   2,   4, 'Colorificio')
) as v(nome, categoria, unita, prezzo, scorta, minima, fornitore)
where not exists (select 1 from materiali m where lower(m.nome) = lower(v.nome));

-- Controllo: quanti record di prova ci sono adesso
select 'dipendenti' as tabella, count(*) from dipendenti where note like 'Dati di prova%'
union all select 'mezzi', count(*) from mezzi where note like 'Dati di prova%'
union all select 'dpi', count(*) from dpi where note like 'Dati di prova%'
union all select 'clienti', count(*) from clienti where note like 'Dati di prova%'
union all select 'lavori', count(*) from lavori where note like '%Dati di prova%'
union all select 'pagamenti', count(*) from pagamenti where note = 'Dati di prova'
union all select 'fatture', count(*) from fatture where note = 'Dati di prova'
union all select 'materiali', count(*) from materiali where note like 'Dati di prova%';

-- ---------------------------------------------------------------
-- Per TOGLIERE i dati di prova (eseguire solo quando non servono più):
--   delete from lavori     where note like '%Dati di prova%';  -- toglie anche fatture e pagamenti
--   delete from materiali  where note like 'Dati di prova%';
--   delete from mezzi      where note like 'Dati di prova%';
--   delete from dipendenti where note like 'Dati di prova%';
--   delete from dpi        where note like 'Dati di prova%';
--   delete from clienti    where note like 'Dati di prova%';
-- ---------------------------------------------------------------
