import { supabase } from '../supabaseClient'

// Autoparco: mezzi aziendali, scadenze di legge e interventi di officina.

export const TIPI_MEZZO = [
  'Furgone',
  'Autocarro',
  'Auto',
  'Pick-up',
  'Escavatore',
  'Piattaforma aerea',
  'Rimorchio',
  'Altro',
]

export const CARBURANTI = ['Gasolio', 'Benzina', 'GPL', 'Metano', 'Elettrico', 'Ibrido']

export const TIPI_INTERVENTO = [
  'Tagliando',
  'Revisione',
  'Gomme',
  'Riparazione',
  'Carrozzeria',
  'Rifornimento',
  'Altro',
]

// Le scadenze controllate su ogni mezzo, con l'etichetta mostrata a video.
export const SCADENZE = [
  { campo: 'assicurazione', etichetta: 'Assicurazione' },
  { campo: 'revisione', etichetta: 'Revisione' },
  { campo: 'bollo', etichetta: 'Bollo' },
  { campo: 'tagliando', etichetta: 'Tagliando' },
]

const GIORNI_PREAVVISO = 30

function daDb(m) {
  return {
    id: m.id,
    targa: m.targa,
    tipo: m.tipo || 'Furgone',
    marca: m.marca || '',
    modello: m.modello || '',
    anno: m.anno,
    carburante: m.carburante || '',
    km: m.km || 0,
    assegnatoA: m.assegnato_a || '',
    assicurazione: m.assicurazione,
    revisione: m.revisione,
    bollo: m.bollo,
    tagliando: m.tagliando,
    inServizio: m.in_servizio !== false,
    note: m.note || '',
  }
}

function versoDb(m) {
  return {
    targa: (m.targa || '').trim().toUpperCase(),
    tipo: m.tipo || 'Furgone',
    marca: (m.marca || '').trim(),
    modello: (m.modello || '').trim(),
    anno: Number(m.anno) || null,
    carburante: m.carburante || '',
    km: Number(m.km) || 0,
    assegnato_a: m.assegnatoA || '',
    assicurazione: m.assicurazione || null,
    revisione: m.revisione || null,
    bollo: m.bollo || null,
    tagliando: m.tagliando || null,
    in_servizio: m.inServizio !== false,
    note: m.note || '',
  }
}

function interventoDaDb(i) {
  return {
    id: i.id,
    mezzoId: i.mezzo_id,
    tipo: i.tipo || 'Riparazione',
    data: i.data,
    km: i.km || 0,
    costo: Number(i.costo) || 0,
    officina: i.officina || '',
    note: i.note || '',
  }
}

export async function caricaMezzi() {
  const { data } = await supabase.from('mezzi').select('*').order('targa')
  return (data || []).map(daDb)
}

export async function aggiungiMezzo(m) {
  const { data, error } = await supabase.from('mezzi').insert(versoDb(m)).select().single()
  if (error) return { errore: error.message }
  return { mezzo: daDb(data) }
}

export async function aggiornaMezzo(id, patch) {
  await supabase.from('mezzi').update(versoDb(patch)).eq('id', id)
}

export async function eliminaMezzo(id) {
  await supabase.from('mezzi').delete().eq('id', id)
}

export async function caricaInterventi() {
  const { data } = await supabase.from('mezzi_interventi').select('*').order('data', { ascending: false })
  return (data || []).map(interventoDaDb)
}

export async function aggiungiIntervento(i) {
  const { data } = await supabase
    .from('mezzi_interventi')
    .insert({
      mezzo_id: i.mezzoId,
      tipo: i.tipo,
      data: i.data,
      km: Number(i.km) || 0,
      costo: Number(i.costo) || 0,
      officina: (i.officina || '').trim(),
      note: i.note || '',
    })
    .select()
    .single()
  return interventoDaDb(data)
}

export async function eliminaIntervento(id) {
  await supabase.from('mezzi_interventi').delete().eq('id', id)
}

// Quanti giorni mancano a una data: negativo se è già passata.
export function giorniA(data) {
  if (!data) return null
  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  return Math.round((new Date(data) - oggi) / 86400000)
}

export function statoScadenza(data) {
  const giorni = giorniA(data)
  if (giorni == null) return { testo: 'Non indicata', classe: 'badge-da-fare', giorni: null }
  if (giorni < 0) return { testo: 'Scaduta', classe: 'badge-malattia', giorni }
  if (giorni <= GIORNI_PREAVVISO) return { testo: 'In scadenza', classe: 'badge-permesso', giorni }
  return { testo: 'In regola', classe: 'badge-completato', giorni }
}

// La scadenza più vicina fra quelle del mezzo: è quella che conta per l'elenco.
export function scadenzaPiuVicina(mezzo) {
  const valide = SCADENZE.map((s) => ({ ...s, data: mezzo[s.campo] })).filter((s) => s.data)
  if (valide.length === 0) return null
  return valide.sort((a, b) => a.data.localeCompare(b.data))[0]
}

export function statoMezzo(mezzo) {
  if (!mezzo.inServizio) return { testo: 'Fuori servizio', classe: 'badge-malattia' }
  const scadute = SCADENZE.filter((s) => {
    const g = giorniA(mezzo[s.campo])
    return g != null && g < 0
  })
  if (scadute.length > 0) {
    return { testo: 'Scadenze da rinnovare', classe: 'badge-malattia' }
  }
  const vicine = SCADENZE.filter((s) => {
    const g = giorniA(mezzo[s.campo])
    return g != null && g <= GIORNI_PREAVVISO
  })
  if (vicine.length > 0) return { testo: 'In scadenza', classe: 'badge-permesso' }
  return { testo: 'In servizio', classe: 'badge-completato' }
}

export function formattaKm(km) {
  return (Number(km) || 0).toLocaleString('it-IT') + ' km'
}
