import { oggiISO } from './squadre'

// Il percorso di un lavoro, uguale in ogni pagina: prima il cantiere, poi i
// soldi. La fase si ricava sempre da qui, mai da caselle spuntate a mano.

export const FASI = [
  { id: 'da-pianificare', titolo: 'Da pianificare', gruppo: 'lavoro', classe: 'badge-da-fare' },
  { id: 'pianificato', titolo: 'Pianificato', gruppo: 'lavoro', classe: 'badge-in-corso' },
  { id: 'eseguito', titolo: 'Eseguito', gruppo: 'lavoro', classe: 'badge-permesso' },
  { id: 'da-validare', titolo: 'Da validare', gruppo: 'lavoro', classe: 'badge-permesso' },
  { id: 'da-fatturare', titolo: 'Da fatturare', gruppo: 'soldi', classe: 'badge-ferie' },
  { id: 'da-incassare', titolo: 'Da incassare', gruppo: 'soldi', classe: 'badge-ferie' },
  { id: 'incassato', titolo: 'Incassato', gruppo: 'soldi', classe: 'badge-completato' },
]

const PER_ID = Object.fromEntries(FASI.map((f, i) => [f.id, { ...f, ordine: i }]))

// Cosa fare per far avanzare il lavoro, fase per fase.
export const PROSSIMA_AZIONE = {
  'da-pianificare': 'Dagli squadra, giorno e ora in Assegnazione Lavori.',
  pianificato: 'La squadra lo esegue nel giorno previsto.',
  eseguito: 'Manca il rapportino: lo manda la squadra dal telefono o lo compili in Consuntivazione.',
  'da-validare': 'Controlla il rapportino e valida la chiusura.',
  'da-fatturare': 'Emetti la fattura per l’importo che resta da fatturare.',
  'da-incassare': 'Registra l’incasso quando arriva il pagamento.',
  incassato: 'Lavoro concluso: niente da fare.',
}

function fase(id, dettaglio = null, avviso = false) {
  return { ...PER_ID[id], dettaglio, avviso }
}

// `economia` è il risultato di economiaLavoro(): serve solo per le fasi dei
// soldi, cioè dopo la chiusura del lavoro.
export function faseLavoro(lavoro, economia = null) {
  if (lavoro.chiuso) {
    const e = economia || { importo: Number(lavoro.importo) || 0, fatturato: 0, daFatturare: 0, daIncassare: 0, scaduto: 0 }
    if (e.importo <= 0 && e.fatturato <= 0) return fase('incassato', 'senza importo')
    if (e.daFatturare > 0.009) return fase('da-fatturare')
    if (e.daIncassare > 0.009) {
      return e.scaduto > 0.009 ? fase('da-incassare', 'fattura scaduta', true) : fase('da-incassare')
    }
    return fase('incassato')
  }

  if (lavoro.consuntivo) {
    return lavoro.consuntivo.rifiutato
      ? fase('da-validare', 'rimandato all’operaio', true)
      : fase('da-validare')
  }

  const a = lavoro.assegnato
  if (a?.teamId && a?.data) {
    if (a.data < oggiISO()) return fase('eseguito', 'manca il rapportino', true)
    return fase('pianificato', lavoro.appuntamento ? 'appuntamento' : null)
  }

  if (lavoro.appuntamento && a?.data) return fase('da-pianificare', 'appuntamento senza squadra', true)
  return fase('da-pianificare')
}

export function faseDaId(id) {
  return PER_ID[id]
}
