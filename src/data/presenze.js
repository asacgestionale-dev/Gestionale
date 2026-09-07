import { DIPENDENTI } from './dipendenti'

const STORAGE_KEY = 'gestionale-presenze'

export const STATI_PRESENZA = ['Presente', 'Ferie', 'Malattia', 'Permesso']

function presenzeVuote() {
  return Object.fromEntries(DIPENDENTI.map((nome) => [nome, 'Presente']))
}

export function caricaPresenze(data) {
  try {
    const tutte = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    return { ...presenzeVuote(), ...(tutte[data] || {}) }
  } catch {
    return presenzeVuote()
  }
}

// Tutte le giornate registrate: { '2026-08-16': { 'Mario Rossi': 'Ferie', ... }, ... }
export function caricaTuttePresenze() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function salvaPresenze(data, presenze) {
  try {
    const tutte = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    tutte[data] = presenze
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tutte))
  } catch {
    // storage non disponibile: le presenze restano solo in memoria
  }
}

// Elenco delle date da 'da' a 'a' comprese, in formato ISO.
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

// Applica lo stesso stato a un dipendente su tutto il periodo indicato.
export function applicaPeriodo(nome, stato, dataInizio, dataFine) {
  try {
    const tutte = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    for (const giorno of giorniTra(dataInizio, dataFine)) {
      tutte[giorno] = { ...(tutte[giorno] || {}), [nome]: stato }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tutte))
  } catch {
    // storage non disponibile: il periodo non viene memorizzato
  }
}
