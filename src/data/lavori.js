const STORAGE_KEY = 'gestionale-lavori'

export const COLORI = ['blu', 'verde', 'ambra', 'rosa', 'viola']

const JOBS_INIZIALI = [
  { id: 'j1', titolo: 'Manutenzione linea A', durata: 2, colore: 'blu', assegnato: null },
  { id: 'j2', titolo: 'Sopralluogo cliente', durata: 1, colore: 'verde', assegnato: null },
  { id: 'j3', titolo: 'Installazione impianto', durata: 3, colore: 'ambra', assegnato: null },
]

export function caricaLavori() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // localStorage non disponibile: si riparte dai dati di esempio
  }
  return JOBS_INIZIALI
}

export function salvaLavori(jobs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs))
  } catch {
    // spazio storage pieno o non disponibile: i dati restano solo in memoria
  }
}

export function nuovoLavoro(jobs, dati) {
  return {
    id: 'j' + Date.now(),
    titolo: dati.titolo.trim(),
    durata: Number(dati.durata),
    clienteId: dati.clienteId,
    note: dati.note.trim(),
    materiali: dati.materiali,
    indirizzo: dati.indirizzo.trim(),
    posizione: dati.posizione,
    importo: Number(dati.importo) || 0,
    incassato: 0,
    completato: false,
    creatoIl: new Date().toISOString(),
    colore: COLORI[jobs.length % COLORI.length],
    // un appuntamento fissa giorno e ora: si potrà cambiare squadra ma non l'orario,
    // salvo spostarlo esplicitamente indicandone la causa
    appuntamento: !!dati.appuntamento,
    spostamenti: [],
    // con un appuntamento il lavoro finisce subito in timeline: teamId null finché
    // non gli si assegna una squadra
    assegnato: dati.appuntamento
      ? { teamId: null, minuti: dati.appuntamento.minuti, data: dati.appuntamento.data }
      : null,
  }
}

// minuti dall'inizio giornata a partire da un orario "HH:MM"
export function minutiDaOrario(orario) {
  const [h, m] = orario.split(':').map(Number)
  return h * 60 + m
}

export function orarioDaMinuti(minuti) {
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function formattaEuro(valore) {
  return (Number(valore) || 0).toLocaleString('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  })
}
