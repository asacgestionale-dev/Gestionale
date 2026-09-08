import { supabase } from '../supabaseClient'
import { nomiDipendenti } from './dipendenti'

export const STATI_PRESENZA = ['Presente', 'Ferie', 'Malattia', 'Permesso']

// Chi non ha una riga per quella giornata risulta presente.
export async function caricaPresenze(giorno) {
  const [{ data }, nomi] = await Promise.all([
    supabase.from('presenze').select('dipendente,stato').eq('giorno', giorno),
    nomiDipendenti(),
  ])

  const mappa = Object.fromEntries(nomi.map((n) => [n, 'Presente']))
  for (const riga of data || []) mappa[riga.dipendente] = riga.stato
  return mappa
}

export async function salvaStato(giorno, dipendente, stato) {
  await supabase
    .from('presenze')
    .upsert({ giorno, dipendente, stato }, { onConflict: 'giorno,dipendente' })
}

// Tutte le giornate registrate, per i conteggi nella scheda dipendente.
export async function caricaTuttePresenze() {
  const { data } = await supabase.from('presenze').select('giorno,dipendente,stato')
  const per = {}
  for (const r of data || []) {
    per[r.giorno] = per[r.giorno] || {}
    per[r.giorno][r.dipendente] = r.stato
  }
  return per
}

export function giorniTra(da, a) {
  const giorni = []
  const cursore = new Date(da)
  const fine = new Date(a)
  while (cursore <= fine) {
    giorni.push(cursore.toISOString().slice(0, 10))
    cursore.setDate(cursore.getDate() + 1)
  }
  return giorni
}

// Applica lo stesso stato su tutto il periodo indicato.
export async function applicaPeriodo(nome, stato, dataInizio, dataFine) {
  const righe = giorniTra(dataInizio, dataFine).map((giorno) => ({
    giorno,
    dipendente: nome,
    stato,
  }))
  await supabase.from('presenze').upsert(righe, { onConflict: 'giorno,dipendente' })
}
