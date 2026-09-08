import { supabase } from '../supabaseClient'

export const CATEGORIE_DPI = [
  'Testa',
  'Occhi e viso',
  'Udito',
  'Vie respiratorie',
  'Mani',
  'Piedi',
  'Corpo',
  'Anticaduta',
  'Alta visibilità',
]

function daDb(d) {
  return {
    id: d.id,
    nome: d.nome,
    categoria: d.categoria || '',
    norma: d.norma || '',
    durataMesi: d.durata_mesi,
    note: d.note || '',
  }
}

function consegnaDaDb(c) {
  return {
    id: c.id,
    dpiId: c.dpi_id,
    dipendente: c.dipendente,
    taglia: c.taglia || '',
    dataConsegna: c.data_consegna,
    scadenza: c.scadenza,
    note: c.note || '',
  }
}

export async function caricaCatalogoDpi() {
  const { data } = await supabase.from('dpi').select('*').order('nome')
  return (data || []).map(daDb)
}

export async function aggiungiDpi(d) {
  const { data } = await supabase
    .from('dpi')
    .insert({
      nome: d.nome.trim(),
      categoria: d.categoria,
      norma: d.norma || '',
      durata_mesi: Number(d.durataMesi) || 0,
      note: d.note || '',
    })
    .select()
    .single()
  return daDb(data)
}

export async function eliminaDpi(id) {
  await supabase.from('dpi').delete().eq('id', id)
}

export async function caricaConsegne() {
  const { data } = await supabase.from('dpi_consegne').select('*').order('scadenza')
  return (data || []).map(consegnaDaDb)
}

export async function aggiungiConsegna(c) {
  const { data } = await supabase
    .from('dpi_consegne')
    .insert({
      dpi_id: c.dpiId,
      dipendente: c.dipendente,
      taglia: c.taglia || '',
      data_consegna: c.dataConsegna,
      scadenza: c.scadenza || null,
      note: c.note || '',
    })
    .select()
    .single()
  return consegnaDaDb(data)
}

export async function eliminaConsegna(id) {
  await supabase.from('dpi_consegne').delete().eq('id', id)
}

// La scadenza si ricava dalla data di consegna più la validità del dispositivo.
export function calcolaScadenza(dataConsegna, durataMesi) {
  if (!dataConsegna || !durataMesi) return ''
  const d = new Date(dataConsegna)
  d.setMonth(d.getMonth() + Number(durataMesi))
  return d.toISOString().slice(0, 10)
}

const GIORNI_PREAVVISO = 30

export function statoConsegna(consegna) {
  if (!consegna.scadenza) return { testo: 'Senza scadenza', classe: 'badge-da-fare', giorni: null }

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const scadenza = new Date(consegna.scadenza)
  const giorni = Math.round((scadenza - oggi) / 86400000)

  if (giorni < 0) return { testo: 'Scaduto', classe: 'badge-malattia', giorni }
  if (giorni <= GIORNI_PREAVVISO) return { testo: 'In scadenza', classe: 'badge-permesso', giorni }
  return { testo: 'Valido', classe: 'badge-completato', giorni }
}
