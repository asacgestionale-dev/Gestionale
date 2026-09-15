import { supabase } from '../supabaseClient'

// Anagrafica materiali: il magazzino con scorte e prezzi.

export const CATEGORIE_MATERIALI = [
  'Edile',
  'Idraulico',
  'Elettrico',
  'Ferramenta',
  'Vernici',
  'Impermeabilizzazione',
  'Climatizzazione',
  'Altro',
]

export const UNITA = ['pz', 'm', 'm²', 'm³', 'kg', 'l', 'sacco', 'conf.', 'rotolo']

function daDb(m) {
  return {
    id: m.id,
    nome: m.nome,
    categoria: m.categoria || '',
    unita: m.unita || 'pz',
    prezzo: Number(m.prezzo) || 0,
    scorta: Number(m.scorta) || 0,
    scortaMinima: Number(m.scorta_minima) || 0,
    fornitore: m.fornitore || '',
    note: m.note || '',
  }
}

function versoDb(m) {
  const r = {}
  if ('nome' in m) r.nome = (m.nome || '').trim()
  if ('categoria' in m) r.categoria = m.categoria || ''
  if ('unita' in m) r.unita = m.unita || 'pz'
  if ('prezzo' in m) r.prezzo = Number(m.prezzo) || 0
  if ('scorta' in m) r.scorta = Number(m.scorta) || 0
  if ('scortaMinima' in m) r.scorta_minima = Number(m.scortaMinima) || 0
  if ('fornitore' in m) r.fornitore = (m.fornitore || '').trim()
  if ('note' in m) r.note = m.note || ''
  return r
}

export async function caricaMateriali() {
  const { data } = await supabase.from('materiali').select('*').order('nome')
  return (data || []).map(daDb)
}

export async function aggiungiMateriale(m) {
  const { data, error } = await supabase.from('materiali').insert(versoDb(m)).select().single()
  if (error) return { errore: error.message }
  return { materiale: daDb(data) }
}

export async function aggiornaMateriale(id, patch) {
  await supabase.from('materiali').update(versoDb(patch)).eq('id', id)
}

export async function eliminaMateriale(id) {
  await supabase.from('materiali').delete().eq('id', id)
}

export function sottoScorta(m) {
  return m.scortaMinima > 0 && m.scorta < m.scortaMinima
}

export function valoreMateriale(m) {
  return m.prezzo * m.scorta
}
