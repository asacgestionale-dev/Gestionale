import { useCallback, useEffect, useState } from 'react'
import { accedi, registra, esci, utenteCorrente } from '../data/auth'
import Timbratura from './Timbratura'
import LavoriDelGiorno from './LavoriDelGiorno'
import Ferie from './Ferie'
import './Operai.css'

const IconaLavori = () => (
  <svg viewBox="0 0 24 24">
    <path d="M4 7.5h16v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z" />
    <path d="M9 7.5V5.5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    <path d="M4 12h16" />
  </svg>
)

const IconaTimbra = () => (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

const IconaFerie = () => (
  <svg viewBox="0 0 24 24">
    <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
    <path d="M3.5 9.5h17M8 3.5v3M16 3.5v3" />
    <path d="m9 14.5 2 2 4-4" />
  </svg>
)

function AccessoOperai({ onAccesso }) {
  const [modo, setModo] = useState('accesso')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [avviso, setAvviso] = useState(null)
  const [inCorso, setInCorso] = useState(false)

  async function invia(e) {
    e.preventDefault()
    setInCorso(true)
    setAvviso(null)

    if (modo === 'accesso') {
      const risposta = await accedi(email, password)
      setInCorso(false)
      if (risposta.errore) return setAvviso({ errore: risposta.errore })
      return onAccesso(risposta.utente)
    }

    // dal telefono ci si registra sempre come operaio: il ruolo lo decide l'ufficio
    const risposta = await registra({ nome, email, password, ruolo: 'Operaio' })
    setInCorso(false)
    if (risposta.errore) return setAvviso({ errore: risposta.errore })
    if (risposta.inAttesa) {
      return setAvviso({
        ok: risposta.confermaEmail
          ? 'Registrazione inviata: conferma la mail, poi aspetta il via libera dell’ufficio.'
          : 'Registrazione inviata: potrai entrare quando l’ufficio ti approva.',
      })
    }
    onAccesso(risposta.utente)
  }

  return (
    <div className="operai">
      <form className="op-accesso" onSubmit={invia}>
        <h1>Cantieri</h1>
        <p className="op-sotto">
          {modo === 'accesso'
            ? 'Entra per timbrare e vedere i lavori di oggi.'
            : 'Registrati: l’ufficio deve approvarti prima del primo accesso.'}
        </p>

        {modo === 'registrazione' && (
          <div className="op-campo">
            <label>Nome e cognome</label>
            <input
              type="text"
              autoComplete="name"
              placeholder="Come ti chiama l’ufficio"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
            />
          </div>
        )}

        <div className="op-campo">
          <label>Email</label>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="op-campo">
          <label>Password</label>
          <input
            type="password"
            autoComplete={modo === 'accesso' ? 'current-password' : 'new-password'}
            placeholder="Almeno 6 caratteri"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {avviso?.errore && <p className="op-avviso">{avviso.errore}</p>}
        {avviso?.ok && <p className="op-avviso ok">{avviso.ok}</p>}

        <button type="submit" className="op-invia" disabled={inCorso}>
          {inCorso ? 'Attendi…' : modo === 'accesso' ? 'Entra' : 'Registrati'}
        </button>

        <button
          type="button"
          className="op-cambia"
          onClick={() => {
            setModo(modo === 'accesso' ? 'registrazione' : 'accesso')
            setAvviso(null)
          }}
        >
          {modo === 'accesso' ? 'Non hai l’account? Registrati' : 'Hai già l’account? Entra'}
        </button>
      </form>
    </div>
  )
}

export default function AppOperai() {
  const [utente, setUtente] = useState(null)
  const [verifica, setVerifica] = useState(true)
  const [tab, setTab] = useState('lavori')
  const [daFare, setDaFare] = useState(0)

  useEffect(() => {
    utenteCorrente().then((u) => {
      setUtente(u)
      setVerifica(false)
    })
  }, [])

  const contaLavori = useCallback((n) => setDaFare(n), [])

  if (verifica) {
    return (
      <div className="operai">
        <div className="op-caricamento">Caricamento…</div>
      </div>
    )
  }

  if (!utente) return <AccessoOperai onAccesso={setUtente} />

  const oggi = new Date().toLocaleDateString('it-IT', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

  return (
    <div className="operai">
      <header className="op-header">
        <div>
          <div className="op-header-nome">{utente.nome}</div>
          <div className="op-header-sotto">{oggi}</div>
        </div>
        <button
          type="button"
          className="op-esci"
          onClick={async () => {
            await esci()
            setUtente(null)
          }}
        >
          Esci
        </button>
      </header>

      <main className="op-corpo">
        {tab === 'lavori' && (
          <LavoriDelGiorno dipendente={utente.nome} onNumeroLavori={contaLavori} />
        )}
        {tab === 'timbra' && <Timbratura dipendente={utente.nome} />}
        {tab === 'ferie' && <Ferie dipendente={utente.nome} />}
      </main>

      <nav className="op-tabbar">
        <button
          type="button"
          className={tab === 'lavori' ? 'scelto' : ''}
          onClick={() => setTab('lavori')}
        >
          <span>
            <IconaLavori />
            {daFare > 0 && <span className="op-pallino">{daFare}</span>}
          </span>
          Lavori
        </button>
        <button
          type="button"
          className={tab === 'timbra' ? 'scelto' : ''}
          onClick={() => setTab('timbra')}
        >
          <IconaTimbra />
          Timbra
        </button>
        <button
          type="button"
          className={tab === 'ferie' ? 'scelto' : ''}
          onClick={() => setTab('ferie')}
        >
          <IconaFerie />
          Ferie
        </button>
      </nav>
    </div>
  )
}
