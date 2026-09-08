import { supabase } from '../supabaseClient'

export const COLORI = ['blu', 'verde', 'ambra', 'rosa', 'viola']

// Il database usa nomi con underscore, l'interfaccia quelli in uso nelle pagine.
function daDb(l) {
  if (!l) return l
  return {
    id: l.id,
    titolo: l.titolo,
    clienteId: l.cliente_id,
    note: l.note || '',
    durata: Number(l.durata),
    materiali: l.materiali || [],
    indirizzo: l.indirizzo || '',
    posizione: l.posizione,
    importo: Number(l.importo) || 0,
    incassato: Number(l.incassato) || 0,
    completato: l.completato,
    chiuso: l.chiuso,
    appuntamento: l.appuntamento,
    spostamenti: l.spostamenti || [],
    consuntivo: l.consuntivo,
    assegnato: l.assegnato,
    colore: l.colore || 'blu',
    creatoIl: l.creato_il,
    validatoIl: l.validato_il,
  }
}

function versoDb(l) {
  const m = {}
  if ('titolo' in l) m.titolo = l.titolo
  if ('clienteId' in l) m.cliente_id = l.clienteId || null
  if ('note' in l) m.note = l.note
  if ('durata' in l) m.durata = Number(l.durata)
  if ('materiali' in l) m.materiali = l.materiali
  if ('indirizzo' in l) m.indirizzo = l.indirizzo
  if ('posizione' in l) m.posizione = l.posizione
  if ('importo' in l) m.importo = Number(l.importo) || 0
  if ('incassato' in l) m.incassato = Number(l.incassato) || 0
  if ('completato' in l) m.completato = l.completato
  if ('chiuso' in l) m.chiuso = l.chiuso
  if ('appuntamento' in l) m.appuntamento = l.appuntamento
  if ('spostamenti' in l) m.spostamenti = l.spostamenti
  if ('consuntivo' in l) m.consuntivo = l.consuntivo
  if ('assegnato' in l) m.assegnato = l.assegnato
  if ('colore' in l) m.colore = l.colore
  if ('validatoIl' in l) m.validato_il = l.validatoIl
  return m
}

export async function caricaLavori() {
  const { data } = await supabase.from('lavori').select('*').order('creato_il')
  return (data || []).map(daDb)
}

export async function aggiungiLavoro(dati, quantiEsistenti = 0) {
  const riga = versoDb({
    titolo: dati.titolo.trim(),
    durata: dati.durata,
    clienteId: dati.clienteId,
    note: (dati.note || '').trim(),
    materiali: dati.materiali || [],
    indirizzo: (dati.indirizzo || '').trim(),
    posizione: dati.posizione,
    importo: dati.importo,
    incassato: 0,
    completato: false,
    chiuso: false,
    // un appuntamento fissa giorno e ora: la squadra si assegna dopo
    appuntamento: Boolean(dati.appuntamento),
    spostamenti: [],
    assegnato: dati.appuntamento
      ? { teamId: null, minuti: dati.appuntamento.minuti, data: dati.appuntamento.data }
      : null,
    colore: COLORI[quantiEsistenti % COLORI.length],
  })

  const { data } = await supabase.from('lavori').insert(riga).select().single()
  return daDb(data)
}

export async function aggiornaLavoro(id, patch) {
  await supabase.from('lavori').update(versoDb(patch)).eq('id', id)
}

export async function eliminaLavoro(id) {
  await supabase.from('lavori').delete().eq('id', id)
}

export function minutiDaOrario(orario) {
  const [h, m] = orario.split(':').map(Number)
  return h * 60 + m
}

export function orarioDaMinuti(minuti) {
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formattaEuro(valore) {
  return (Number(valore) || 0).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}
