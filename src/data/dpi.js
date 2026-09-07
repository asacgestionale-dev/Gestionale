// Anagrafica dei dispositivi di protezione individuale e loro consegna al personale.

export const CATEGORIE_DPI = [
  'Testa',
  'Occhi e viso',
  'Udito',
  'Vie respiratorie',
  'Mani',
  'Piedi',
  'Corpo',
  'Anticaduta',
  'Alta visibilità',
]

const CATALOGO_KEY = 'gestionale-dpi'
const CONSEGNE_KEY = 'gestionale-dpi-consegne'

const CATALOGO_INIZIALE = [
  { id: 'd1', nome: 'Elmetto di protezione', categoria: 'Testa', norma: 'EN 397', durataMesi: 60, note: '' },
  { id: 'd2', nome: 'Scarpe antinfortunistiche S3', categoria: 'Piedi', norma: 'EN ISO 20345', durataMesi: 12, note: '' },
  { id: 'd3', nome: 'Guanti da lavoro', categoria: 'Mani', norma: 'EN 388', durataMesi: 6, note: '' },
  { id: 'd4', nome: 'Gilet alta visibilità', categoria: 'Alta visibilità', norma: 'EN ISO 20471', durataMesi: 24, note: '' },
  { id: 'd5', nome: 'Imbracatura anticaduta', categoria: 'Anticaduta', norma: 'EN 361', durataMesi: 12, note: 'Verifica periodica obbligatoria' },
]

export function caricaCatalogoDpi() {
  try {
    const raw = localStorage.getItem(CATALOGO_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // storage non disponibile: si parte dal catalogo di base
  }
  return CATALOGO_INIZIALE
}

export function salvaCatalogoDpi(lista) {
  try {
    localStorage.setItem(CATALOGO_KEY, JSON.stringify(lista))
  } catch {
    // storage non disponibile: il catalogo resta in memoria
  }
}

export function caricaConsegne() {
  try {
    return JSON.parse(localStorage.getItem(CONSEGNE_KEY) || '[]')
  } catch {
    return []
  }
}

export function salvaConsegne(lista) {
  try {
    localStorage.setItem(CONSEGNE_KEY, JSON.stringify(lista))
  } catch {
    // storage non disponibile: le consegne restano in memoria
  }
}

// La scadenza si ricava dalla data di consegna più la validità del dispositivo.
export function calcolaScadenza(dataConsegna, durataMesi) {
  if (!dataConsegna || !durataMesi) return ''
  const d = new Date(dataConsegna)
  d.setMonth(d.getMonth() + Number(durataMesi))
  return d.toISOString().slice(0, 10)
}

const GIORNI_PREAVVISO = 30

export function statoConsegna(consegna) {
  if (!consegna.scadenza) return { testo: 'Senza scadenza', classe: 'badge-da-fare', giorni: null }

  const oggi = new Date()
  oggi.setHours(0, 0, 0, 0)
  const scadenza = new Date(consegna.scadenza)
  const giorni = Math.round((scadenza - oggi) / 86400000)

  if (giorni < 0) return { testo: 'Scaduto', classe: 'badge-malattia', giorni }
  if (giorni <= GIORNI_PREAVVISO) return { testo: 'In scadenza', classe: 'badge-permesso', giorni }
  return { testo: 'Valido', classe: 'badge-completato', giorni }
}
