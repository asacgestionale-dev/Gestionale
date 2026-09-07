const STORAGE_KEY = 'gestionale-dipendenti'

export const RUOLI = ['Operaio', 'Tecnico', 'Preposto', 'Capocantiere', 'Impiegato']

const INIZIALI = Array.from({ length: 15 }, (_, i) => ({
  id: 'p' + (i + 1),
  nome: `Dipendente ${i + 1}`,
  ruolo: 'Operaio',
  telefono: '',
  email: '',
  assunzione: '',
  qualifiche: [],
  note: '',
}))

export function caricaDipendenti() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage non disponibile: si riparte dall'organico di esempio
  }
  return INIZIALI
}

export function salvaDipendenti(lista) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista))
  } catch {
    // spazio storage pieno o non disponibile: i dati restano solo in memoria
  }
}

// Squadre e Presenze identificano le persone per nome: qui la lista dei soli nomi.
export const DIPENDENTI = caricaDipendenti().map((d) => d.nome)
