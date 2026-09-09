import { useState } from 'react'
import { TEMI, caricaTema, applicaTema } from '../data/tema'
import { cambiaPassword } from '../data/auth'
import ZoneTimbratura from './ZoneTimbratura'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Impostazioni.css'

export default function Impostazioni({ utente }) {
  const [tema, setTema] = useState(caricaTema)

  const [attuale, setAttuale] = useState('')
  const [nuova, setNuova] = useState('')
  const [ripeti, setRipeti] = useState('')
  const [esito, setEsito] = useState(null)
  const [inCorso, setInCorso] = useState(false)

  function cambiaTema(id) {
    setTema(id)
    applicaTema(id)
  }

  async function salvaPassword(e) {
    e.preventDefault()
    if (nuova.length < 6) {
      setEsito({ errore: 'La nuova password deve avere almeno 6 caratteri.' })
      return
    }
    if (nuova !== ripeti) {
      setEsito({ errore: 'Le due nuove password non coincidono.' })
      return
    }

    setInCorso(true)
    const risposta = await cambiaPassword(attuale, nuova)
    setInCorso(false)

    if (risposta.errore) {
      setEsito({ errore: risposta.errore })
      return
    }
    setEsito({ ok: 'Password cambiata: al prossimo accesso usa quella nuova.' })
    setAttuale('')
    setNuova('')
    setRipeti('')
  }

  return (
    <>
      <h1 className="page-title">Impostazioni</h1>
      <p className="page-subtitle">Configurazione generale del gestionale</p>

      <div className="card sezione-impostazione">
        <div className="impostazione-riga">
          <div>
            <span className="impostazione-titolo">Colori del gestionale</span>
            <p className="impostazione-desc">
              Scegli il tema: il cambio è immediato su tutte le pagine e resta memorizzato.
            </p>
          </div>
        </div>

        <div className="temi-griglia">
          {TEMI.map((t) => (
            <button
              key={t.id}
              type="button"
              className={'tema-card tema-' + t.id + (tema === t.id ? ' selezionato' : '')}
              onClick={() => cambiaTema(t.id)}
            >
              <span className="tema-anteprima">
                <span className="tema-colore c1" />
                <span className="tema-colore c2" />
                <span className="tema-colore c3" />
              </span>
              <span className="tema-nome">{t.nome}</span>
              <span className="tema-desc">{t.desc}</span>
              {tema === t.id && <span className="tema-attivo">In uso</span>}
            </button>
          ))}
        </div>
      </div>

      <ZoneTimbratura amministratore={utente?.ruolo === 'Amministratore'} />

      <div className="card sezione-impostazione">
        <div className="impostazione-riga">
          <div>
            <span className="impostazione-titolo">Password di accesso</span>
            <p className="impostazione-desc">
              Cambia la password del tuo account. Vale subito, su qualsiasi dispositivo.
            </p>
          </div>
        </div>

        <form className="password-form" onSubmit={salvaPassword}>
          <div className="password-campo">
            <label className="job-form-label">Password attuale</label>
            <input
              type="password"
              autoComplete="current-password"
              value={attuale}
              onChange={(e) => setAttuale(e.target.value)}
            />
          </div>
          <div className="password-campo">
            <label className="job-form-label">Nuova password</label>
            <input
              type="password"
              autoComplete="new-password"
              placeholder="Almeno 6 caratteri"
              value={nuova}
              onChange={(e) => setNuova(e.target.value)}
            />
          </div>
          <div className="password-campo">
            <label className="job-form-label">Ripeti la nuova</label>
            <input
              type="password"
              autoComplete="new-password"
              value={ripeti}
              onChange={(e) => setRipeti(e.target.value)}
            />
          </div>
          <button type="submit" disabled={inCorso || !attuale || !nuova}>
            {inCorso ? 'Cambio in corso...' : 'Cambia password'}
          </button>
        </form>

        {esito?.errore && <p className="messaggio-errore">{esito.errore}</p>}
        {esito?.ok && <p className="gps-stato gps-ok">{esito.ok}</p>}
      </div>
    </>
  )
}
