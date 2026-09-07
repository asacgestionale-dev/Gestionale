export const SQUADRE_BASE = [
  { id: 't1', nome: 'Squadra 1' },
  { id: 't2', nome: 'Squadra 2' },
  { id: 't3', nome: 'Squadra 3' },
  { id: 't4', nome: 'Squadra 4' },
  { id: 't5', nome: 'Squadra 5' },
]

const STORAGE_KEY = 'gestionale-squadre'
const BLOCCHI_KEY = 'gestionale-squadre-bloccate'

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

// Squadre "bloccate" col lucchetto: la loro composizione vale per tutte le giornate
// finché il lucchetto non viene riaperto. { t1: ['Mario', 'Luca'], ... }
export function caricaBlocchi() {
  try {
    return JSON.parse(localStorage.getItem(BLOCCHI_KEY) || '{}')
  } catch {
    return {}
  }
}

export function bloccaSquadra(teamId, membri) {
  try {
    const blocchi = caricaBlocchi()
    blocchi[teamId] = membri
    localStorage.setItem(BLOCCHI_KEY, JSON.stringify(blocchi))
  } catch {
    // storage non disponibile: il blocco non viene memorizzato
  }
}

export function sbloccaSquadra(teamId) {
  try {
    const blocchi = caricaBlocchi()
    delete blocchi[teamId]
    localStorage.setItem(BLOCCHI_KEY, JSON.stringify(blocchi))
  } catch {
    // storage non disponibile: il blocco non viene rimosso
  }
}

export function caricaComposizione(data) {
  let salvata = {}
  try {
    const tutte = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    salvata = tutte[data] || {}
  } catch {
    salvata = {}
  }
  // le squadre col lucchetto chiuso hanno la precedenza sulla composizione del giorno
  const blocchi = caricaBlocchi()
  return { ...composizioneVuota(), ...salvata, ...blocchi }
}

export function salvaComposizione(data, composizione) {
  try {
    const tutte = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    tutte[data] = composizione
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tutte))
    // una squadra bloccata resta allineata alle modifiche fatte mentre è chiusa
    const blocchi = caricaBlocchi()
    let cambiati = false
    for (const teamId of Object.keys(blocchi)) {
      if (composizione[teamId]) {
        blocchi[teamId] = composizione[teamId]
        cambiati = true
      }
    }
    if (cambiati) localStorage.setItem(BLOCCHI_KEY, JSON.stringify(blocchi))
  } catch {
    // storage non disponibile: la composizione resta solo in memoria
  }
}
