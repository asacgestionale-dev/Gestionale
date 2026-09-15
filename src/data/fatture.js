import { supabase } from '../supabaseClient'
import { oggiISO } from './squadre'

// Fatture, incassi e conti di ogni lavoro.
// L'importo concordato e l'imponibile delle fatture sono al netto dell'IVA;
// il totale di una fattura e gli incassi (i soldi che arrivano davvero)
// comprendono l'IVA.

export const TIPI_FATTURA = ['Acconto', 'SAL', 'Saldo']
export const ALIQUOTE_IVA = [22, 10, 4, 0]
export const GIORNI_SCADENZA = 30

function daDb(f) {
  return {
    id: f.id,
    lavoroId: f.lavoro_id,
    numero: f.numero || '',
    data: f.data,
    tipo: f.tipo || 'Saldo',
    imponibile: Number(f.imponibile) || 0,
    iva: Number(f.iva) || 0,
    scadenza: f.scadenza,
    note: f.note || '',
  }
}

export async function caricaFatture() {
  const { data } = await supabase.from('fatture').select('*').order('data', { ascending: false })
  return (data || []).map(daDb)
}

export async function aggiungiFattura(f) {
  const { data, error } = await supabase
    .from('fatture')
    .insert({
      lavoro_id: f.lavoroId,
      numero: (f.numero || '').trim(),
      data: f.data,
      tipo: f.tipo,
      imponibile: Number(f.imponibile) || 0,
      iva: Number(f.iva) || 0,
      scadenza: f.scadenza || null,
      note: (f.note || '').trim(),
    })
    .select()
    .single()

  if (error) return { errore: error.message }
  return { fattura: daDb(data) }
}

export async function eliminaFattura(id) {
  await supabase.from('fatture').delete().eq('id', id)
}

const arrotonda = (n) => Math.round(n * 100) / 100

export function formattaEuroPreciso(valore) {
  return (Number(valore) || 0).toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })
}

export function totaleFattura(f) {
  return arrotonda(f.imponibile * (1 + f.iva / 100))
}

export function incassiDellaFattura(pagamenti, f) {
  return (pagamenti[f.lavoroId] || []).filter((p) => p.fattura_id === f.id)
}

export function statoFattura(f, pagamenti) {
  const totale = totaleFattura(f)
  const pagato = arrotonda(
    incassiDellaFattura(pagamenti, f).reduce((s, p) => s + (Number(p.importo) || 0), 0),
  )
  const residuo = Math.max(0, arrotonda(totale - pagato))
  const scaduta = residuo > 0.009 && Boolean(f.scadenza) && f.scadenza < oggiISO()

  if (residuo <= 0.009) return { testo: 'Pagata', classe: 'badge-completato', totale, pagato, residuo, scaduta }
  if (scaduta) return { testo: 'Scaduta', classe: 'badge-malattia', totale, pagato, residuo, scaduta }
  if (pagato > 0) return { testo: 'Pagata in parte', classe: 'badge-permesso', totale, pagato, residuo, scaduta }
  return { testo: 'Da incassare', classe: 'badge-in-corso', totale, pagato, residuo, scaduta }
}

// Numerazione progressiva per anno: 2026/001, 2026/002...
export function prossimoNumeroFattura(fatture, data = oggiISO()) {
  const anno = data.slice(0, 4)
  const numeri = fatture
    .filter((f) => (f.data || '').startsWith(anno))
    .map((f) => parseInt(String(f.numero).split('/').pop(), 10))
    .filter(Number.isFinite)
  const prossimo = (numeri.length ? Math.max(...numeri) : 0) + 1
  return `${anno}/${String(prossimo).padStart(3, '0')}`
}

export function scadenzaPredefinita(data) {
  const d = new Date(data)
  d.setDate(d.getDate() + GIORNI_SCADENZA)
  return d.toISOString().slice(0, 10)
}

// Quante persone hanno eseguito il lavoro, dai nomi scritti nel rapportino.
export function personeDelRapportino(consuntivo) {
  const nomi = String(consuntivo?.compilatoDa || '')
    .split(',')
    .map((n) => n.trim())
    .filter(Boolean)
  return Math.max(1, nomi.length)
}

// Tutti i conti di un lavoro in un colpo solo: fatturato, incassato, costi e
// margine. Senza rapportino la manodopera è stimata dalla durata prevista.
export function economiaLavoro(lavoro, fatture, pagamenti, costoOrario = 0) {
  const importo = Number(lavoro.importo) || 0
  const fattureLavoro = fatture
    .filter((f) => f.lavoroId === lavoro.id)
    .map((f) => ({ fattura: f, ...statoFattura(f, pagamenti) }))
  const incassi = pagamenti[lavoro.id] || []

  const fatturato = arrotonda(fattureLavoro.reduce((s, x) => s + x.fattura.imponibile, 0))
  const totaleFatturato = arrotonda(fattureLavoro.reduce((s, x) => s + x.totale, 0))
  const incassato = arrotonda(incassi.reduce((s, p) => s + (Number(p.importo) || 0), 0))
  const daIncassare = arrotonda(fattureLavoro.reduce((s, x) => s + x.residuo, 0))
  const scaduto = arrotonda(
    fattureLavoro.filter((x) => x.scaduta).reduce((s, x) => s + x.residuo, 0),
  )
  const daFatturare = Math.max(0, arrotonda(importo - fatturato))

  const rapportino = lavoro.consuntivo
  const ore = rapportino ? Number(rapportino.oreEffettive) || 0 : Number(lavoro.durata) || 0
  const persone = rapportino ? personeDelRapportino(rapportino) : 1
  const manodopera = arrotonda(ore * persone * (Number(costoOrario) || 0))
  const materiali = Number(lavoro.costi?.materiali) || 0
  const altri = Number(lavoro.costi?.altri) || 0
  const costi = arrotonda(manodopera + materiali + altri)
  const ricavo = Math.max(importo, fatturato)
  const margine = arrotonda(ricavo - costi)
  const marginePct = ricavo > 0 ? Math.round((margine / ricavo) * 100) : null

  return {
    importo,
    fatturato,
    daFatturare,
    totaleFatturato,
    incassato,
    daIncassare,
    scaduto,
    fatture: fattureLavoro,
    incassi,
    ore,
    persone,
    stimata: !rapportino,
    manodopera,
    materiali,
    altri,
    costi,
    ricavo,
    margine,
    marginePct,
  }
}
