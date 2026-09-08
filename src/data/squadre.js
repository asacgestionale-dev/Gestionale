import { supabase } from '../supabaseClient'

export const SQUADRE_BASE = [
  { id: 't1', nome: 'Squadra 1' },
  { id: 't2', nome: 'Squadra 2' },
  { id: 't3', nome: 'Squadra 3' },
  { id: 't4', nome: 'Squadra 4' },
  { id: 't5', nome: 'Squadra 5' },
]

export function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

export function domaniISO() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

function composizioneVuota() {
  return Object.fromEntries(SQUADRE_BASE.map((s) => [s.id, []]))
}

// Squadre fisse: valgono per ogni giornata finché il lucchetto resta chiuso.
export async function caricaBlocchi() {
  const { data } = await supabase.from('squadre_bloccate').select('*')
  return Object.fromEntries((data || []).map((b) => [b.squadra_id, b.membri || []]))
}

export async function bloccaSquadra(teamId, membri) {
  await supabase
    .from('squadre_bloccate')
    .upsert({ squadra_id: teamId, membri }, { onConflict: 'squadra_id' })
}

export async function sbloccaSquadra(teamId) {
  await supabase.from('squadre_bloccate').delete().eq('squadra_id', teamId)
}

export async function caricaComposizione(giorno) {
  const [{ data }, blocchi] = await Promise.all([
    supabase.from('squadre').select('squadra_id,membri').eq('giorno', giorno),
    caricaBlocchi(),
  ])

  const salvata = Object.fromEntries((data || []).map((r) => [r.squadra_id, r.membri || []]))
  // le squadre col lucchetto chiuso hanno la precedenza sulla composizione del giorno
  return { ...composizioneVuota(), ...salvata, ...blocchi }
}

export async function salvaComposizione(giorno, composizione) {
  const righe = SQUADRE_BASE.map((s) => ({
    giorno,
    squadra_id: s.id,
    membri: composizione[s.id] || [],
  }))
  await supabase.from('squadre').upsert(righe, { onConflict: 'giorno,squadra_id' })

  // una squadra bloccata resta allineata alle modifiche fatte mentre è chiusa
  const blocchi = await caricaBlocchi()
  const daAggiornare = Object.keys(blocchi)
    .filter((teamId) => composizione[teamId])
    .map((teamId) => ({ squadra_id: teamId, membri: composizione[teamId] }))

  if (daAggiornare.length > 0) {
    await supabase.from('squadre_bloccate').upsert(daAggiornare, { onConflict: 'squadra_id' })
  }
}
