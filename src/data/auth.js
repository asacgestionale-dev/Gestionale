// Accesso al gestionale. Le credenziali restano su questo browser:
// la password non viene mai salvata in chiaro, se ne conserva solo un digest.

const UTENTI_KEY = 'gestionale-utenti'
const SESSIONE_KEY = 'gestionale-sessione'

export const RUOLI_UTENTE = ['Amministratore', 'Responsabile', 'Operaio']

export function caricaUtenti() {
  try {
    return JSON.parse(localStorage.getItem(UTENTI_KEY) || '[]')
  } catch {
    return []
  }
}

export function salvaUtenti(utenti) {
  try {
    localStorage.setItem(UTENTI_KEY, JSON.stringify(utenti))
  } catch {
    // storage non disponibile: la registrazione vale solo per questa sessione
  }
}

// Digest della password: sufficiente per un'app locale, non sostituisce
// l'autenticazione di un server quando i dati usciranno da questo PC.
async function digest(password) {
  const dati = new TextEncoder().encode('gestionale::' + password)
  const hash = await crypto.subtle.digest('SHA-256', dati)
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export async function registra({ nome, email, password, ruolo }) {
  const utenti = caricaUtenti()
  const emailPulita = email.trim().toLowerCase()

  if (utenti.some((u) => u.email === emailPulita)) {
    return { errore: 'Esiste già un account con questa email.' }
  }

  const primo = utenti.length === 0
  const utente = {
    id: 'u' + Date.now(),
    nome: nome.trim(),
    email: emailPulita,
    // il primo registrato è l'amministratore che configura il gestionale: entra subito.
    // tutti gli altri restano in attesa che l'amministratore approvi l'account
    ruolo: primo ? 'Amministratore' : ruolo,
    approvato: primo,
    passwordHash: await digest(password),
    creatoIl: new Date().toISOString(),
  }

  salvaUtenti([...utenti, utente])
  return { utente, inAttesa: !primo }
}

export async function accedi(email, password) {
  const utenti = caricaUtenti()
  const utente = utenti.find((u) => u.email === email.trim().toLowerCase())
  if (!utente) return { errore: 'Nessun account registrato con questa email.' }

  const hash = await digest(password)
  if (hash !== utente.passwordHash) return { errore: 'Password non corretta.' }

  if (!utente.approvato) {
    return {
      errore:
        "Registrazione in attesa: l'amministratore deve approvare il tuo account prima del primo accesso.",
    }
  }

  return { utente }
}

export function approvaUtente(id) {
  salvaUtenti(caricaUtenti().map((u) => (u.id === id ? { ...u, approvato: true } : u)))
}

export function revocaUtente(id) {
  salvaUtenti(caricaUtenti().map((u) => (u.id === id ? { ...u, approvato: false } : u)))
}

export function cambiaRuolo(id, ruolo) {
  salvaUtenti(caricaUtenti().map((u) => (u.id === id ? { ...u, ruolo } : u)))
}

export function eliminaUtente(id) {
  salvaUtenti(caricaUtenti().filter((u) => u.id !== id))
}

export function apriSessione(utente) {
  try {
    localStorage.setItem(SESSIONE_KEY, JSON.stringify({ id: utente.id, email: utente.email }))
  } catch {
    // storage non disponibile: la sessione dura finché resta aperta la pagina
  }
}

export function chiudiSessione() {
  try {
    localStorage.removeItem(SESSIONE_KEY)
  } catch {
    // niente da fare
  }
}

export function utenteCorrente() {
  try {
    const sessione = JSON.parse(localStorage.getItem(SESSIONE_KEY) || 'null')
    if (!sessione) return null
    const utente = caricaUtenti().find((u) => u.id === sessione.id)
    // un accesso revocato dall'amministratore decade anche a sessione aperta
    return utente?.approvato ? utente : null
  } catch {
    return null
  }
}

export function ciSonoUtenti() {
  return caricaUtenti().length > 0
}
