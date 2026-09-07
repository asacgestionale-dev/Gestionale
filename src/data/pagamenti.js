// Gestione economica dei lavori: l'importo concordato arriva dal lavoro,
// qui si registrano acconti, stati avanzamento (SAL) e saldo.

export const TIPI_PAGAMENTO = ['Acconto', 'SAL', 'Saldo']
export const MODALITA = ['Bonifico', 'Contanti', 'Assegno', 'Altro']

const STORAGE_KEY = 'gestionale-pagamenti'

// { idLavoro: [ { id, tipo, importo, data, modalita, note } ] }
export function caricaPagamenti() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
  } catch {
    return {}
  }
}

export function salvaPagamenti(mappa) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mappa))
  } catch {
    // storage non disponibile: i movimenti restano solo in memoria
  }
}

export function pagamentiDelLavoro(mappa, idLavoro) {
  return mappa[idLavoro] || []
}

export function totaleIncassato(mappa, idLavoro) {
  return pagamentiDelLavoro(mappa, idLavoro).reduce((s, p) => s + (Number(p.importo) || 0), 0)
}

// Stato del pagamento rispetto all'importo concordato.
export function statoPagamento(lavoro, incassato) {
  const importo = Number(lavoro.importo) || 0
  if (importo === 0) return { testo: 'Senza importo', classe: 'badge-da-fare', percentuale: 0 }

  const percentuale = Math.min(100, Math.round((incassato / importo) * 100))
  if (incassato <= 0) return { testo: 'Da incassare', classe: 'badge-malattia', percentuale: 0 }
  if (incassato >= importo) return { testo: 'Saldato', classe: 'badge-completato', percentuale: 100 }
  return { testo: 'Parziale', classe: 'badge-permesso', percentuale }
}
