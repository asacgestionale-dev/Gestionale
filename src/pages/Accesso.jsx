import { useState } from 'react'
import {
  RUOLI_UTENTE,
  accedi,
  registra,
  apriSessione,
  ciSonoUtenti,
} from '../data/auth'
import './Accesso.css'

export default function Accesso({ onAccesso }) {
  // si parte sempre dal login: chi non ha un account passa alla registrazione dal link
  const [modo, setModo] = useState('accesso')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [conferma, setConferma] = useState('')
  const [ruolo, setRuolo] = useState(RUOLI_UTENTE[2])
  const [errore, setErrore] = useState('')
  const [attesa, setAttesa] = useState(false)
  // registrazione andata a buon fine ma in attesa dell'amministratore
  const [inAttesaApprovazione, setInAttesaApprovazione] = useState(false)

  const primoAccount = !ciSonoUtenti()

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore('')
    setInAttesaApprovazione(false)

    if (modo === 'registrazione') {
      if (!nome.trim()) return setErrore('Indica nome e cognome.')
      if (!email.trim()) return setErrore('Indica una email.')
      if (password.length < 6) return setErrore('La password deve avere almeno 6 caratteri.')
      if (password !== conferma) return setErrore('Le due password non coincidono.')

      setAttesa(true)
      const esito = await registra({ nome, email, password, ruolo })
      setAttesa(false)
      if (esito.errore) return setErrore(esito.errore)

      // solo il primo account (amministratore) entra subito
      if (esito.inAttesa) {
        setInAttesaApprovazione(true)
        setModo('accesso')
        setPassword('')
        setConferma('')
        setNome('')
        return
      }

      apriSessione(esito.utente)
      onAccesso(esito.utente)
      return
    }

    if (!email.trim() || !password) return setErrore('Inserisci email e password.')
    setAttesa(true)
    const esito = await accedi(email, password)
    setAttesa(false)
    if (esito.errore) return setErrore(esito.errore)
    apriSessione(esito.utente)
    onAccesso(esito.utente)
  }

  return (
    <div className="accesso-pagina">
      <div className="accesso-riquadro">
        <div className="accesso-logo">G</div>
        <h1 className="accesso-titolo">Gestionale</h1>
        <p className="accesso-sotto">
          {modo === 'registrazione'
            ? primoAccount
              ? 'Primo avvio: chi si registra ora diventa amministratore'
              : 'Crea il tuo account: l’amministratore dovrà approvarlo'
            : 'Accedi con le tue credenziali'}
        </p>

        <form className="accesso-form" onSubmit={handleSubmit}>
          {modo === 'registrazione' && (
            <>
              <label className="accesso-label">Nome e cognome</label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Mario Rossi"
                autoFocus
              />
            </>
          )}

          <label className="accesso-label">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="nome@azienda.it"
            autoComplete="username"
          />

          <label className="accesso-label">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Almeno 6 caratteri"
            autoComplete={modo === 'registrazione' ? 'new-password' : 'current-password'}
          />

          {modo === 'registrazione' && (
            <>
              <label className="accesso-label">Conferma password</label>
              <input
                type="password"
                value={conferma}
                onChange={(e) => setConferma(e.target.value)}
                autoComplete="new-password"
              />

              {!primoAccount && (
                <>
                  <label className="accesso-label">Ruolo</label>
                  <select value={ruolo} onChange={(e) => setRuolo(e.target.value)}>
                    {RUOLI_UTENTE.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}

          {inAttesaApprovazione && (
            <p className="accesso-attesa">
              Registrazione inviata. Potrai accedere quando l'amministratore avrà approvato il tuo
              account.
            </p>
          )}
          {errore && <p className="accesso-errore">{errore}</p>}

          <button type="submit" disabled={attesa}>
            {attesa
              ? 'Attendi...'
              : modo === 'registrazione'
                ? 'Crea account'
                : 'Accedi'}
          </button>
        </form>

        <button
          type="button"
          className="accesso-cambia"
          onClick={() => {
            setModo(modo === 'accesso' ? 'registrazione' : 'accesso')
            setErrore('')
          }}
        >
          {modo === 'accesso' ? 'Non hai un account? Registrati' : 'Hai già un account? Accedi'}
        </button>

        <p className="accesso-nota">
          Le credenziali restano su questo computer: quando i dati usciranno da qui servirà un
          server per gestirle davvero.
        </p>
      </div>
    </div>
  )
}
