import { supabase } from '../supabaseClient'
import { giorniTra, applicaPeriodo } from './presenze'

// Ferie e permessi: il conteggio dei giorni residui e le richieste che gli
// operai inviano dal telefono e l'ufficio approva o rifiuta.

export const FERIE_ANNUE_PREDEFINITE = 26

export const TIPI_RICHIESTA = ['Ferie', 'Permesso']

export const IN_ATTESA = 'In attesa'
export const APPROVATA = 'Approvata'
export const RIFIUTATA = 'Rifiutata'

function daDb(r) {
  return {
    id: r.id,
    dipendente: r.dipendente,
    tipo: r.tipo,
    dataInizio: r.data_inizio,
    dataFine: r.data_fine,
    note: r.note || '',
    stato: r.stato,
    motivoRifiuto: r.motivo_rifiuto || '',
    creataIl: r.creata_il,
    decisaIl: r.decisa_il,
    decisaDa: r.decisa_da || '',
  }
}

export async function caricaRichieste(dipendente = null) {
  let query = supabase.from('richieste_ferie').select('*').order('creata_il', { ascending: false })
  if (dipendente) query = query.eq('dipendente', dipendente)
  const { data } = await query
  return (data || []).map(daDb)
}

export async function inviaRichiesta({ dipendente, tipo, dataInizio, dataFine, note }) {
  const { data, error } = await supabase
    .from('richieste_ferie')
    .insert({
      dipendente,
      tipo,
      data_inizio: dataInizio,
      data_fine: dataFine,
      note: (note || '').trim(),
      stato: IN_ATTESA,
    })
    .select()
    .single()

  if (error) return { errore: error.message }
  return { richiesta: daDb(data) }
}

// Approvare significa scrivere il periodo nelle presenze: da lì in poi il
// dipendente risulta in ferie e le squadre lo vedono non disponibile.
export async function approvaRichiesta(richiesta, decisaDa) {
  await applicaPeriodo(richiesta.dipendente, richiesta.tipo, richiesta.dataInizio, richiesta.dataFine)
  await supabase
    .from('richieste_ferie')
    .update({
      stato: APPROVATA,
      decisa_il: new Date().toISOString(),
      decisa_da: decisaDa || '',
      motivo_rifiuto: '',
    })
    .eq('id', richiesta.id)
}

export async function rifiutaRichiesta(richiesta, decisaDa, motivo) {
  await supabase
    .from('richieste_ferie')
    .update({
      stato: RIFIUTATA,
      decisa_il: new Date().toISOString(),
      decisa_da: decisaDa || '',
      motivo_rifiuto: (motivo || '').trim(),
    })
    .eq('id', richiesta.id)
}

export async function eliminaRichiesta(id) {
  await supabase.from('richieste_ferie').delete().eq('id', id)
}

export function giorniRichiesti(richiesta) {
  return giorniTra(richiesta.dataInizio, richiesta.dataFine).length
}

// Giorni già goduti nell'anno, letti dalle presenze registrate.
export async function giorniGoduti(dipendente, anno = new Date().getFullYear()) {
  const { data } = await supabase
    .from('presenze')
    .select('giorno,stato')
    .eq('dipendente', dipendente)
    .gte('giorno', `${anno}-01-01`)
    .lte('giorno', `${anno}-12-31`)

  const conteggio = { Ferie: 0, Permesso: 0, Malattia: 0 }
  for (const r of data || []) {
    if (r.stato in conteggio) conteggio[r.stato] += 1
  }
  return conteggio
}

// Quadro completo delle ferie di una persona: spettanti, godute, richieste in
// attesa e quindi ancora disponibili.
export async function situazioneFerie(dipendente, ferieAnnue, anno = new Date().getFullYear()) {
  const [conteggio, richieste] = await Promise.all([
    giorniGoduti(dipendente, anno),
    caricaRichieste(dipendente),
  ])

  const spettanti = Number(ferieAnnue) || FERIE_ANNUE_PREDEFINITE
  const inAttesa = richieste
    .filter((r) => r.stato === IN_ATTESA && r.tipo === 'Ferie')
    .reduce((t, r) => t + giorniRichiesti(r), 0)

  return {
    spettanti,
    godute: conteggio.Ferie,
    permessi: conteggio.Permesso,
    malattia: conteggio.Malattia,
    inAttesa,
    residue: spettanti - conteggio.Ferie - inAttesa,
    richieste,
  }
}
