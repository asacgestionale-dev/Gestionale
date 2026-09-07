const STORAGE_KEY = 'gestionale-clienti'

const CLIENTI_INIZIALI = [
  {
    id: 'c1',
    nome: 'Rossi Costruzioni Srl',
    indirizzo: 'Via Roma 12, 20100 Milano',
    referente: 'Marco Rossi',
    telefono: '02 1234567',
  },
  {
    id: 'c2',
    nome: 'Condominio Le Betulle',
    indirizzo: 'Viale dei Tigli 8, 20090 Segrate',
    referente: 'Amm. Bianchi',
    telefono: '02 7654321',
  },
  {
    id: 'c3',
    nome: 'Industrie Verdi SpA',
    indirizzo: 'Via dell’Industria 44, 20063 Cernusco',
    referente: 'Laura Verdi',
    telefono: '02 5556677',
  },
]

export function caricaClienti() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage non disponibile: si riparte dai dati di esempio
  }
  return CLIENTI_INIZIALI
}

export function salvaClienti(clienti) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(clienti))
  } catch {
    // storage non disponibile: i dati restano solo in memoria
  }
}
