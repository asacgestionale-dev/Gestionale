import { useState } from 'react'
import {
  RUOLI_UTENTE,
  caricaUtenti,
  approvaUtente,
  revocaUtente,
  cambiaRuolo,
  eliminaUtente,
} from '../data/auth'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Consuntivazione.css'

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

export default function Utenti({ utente }) {
  const [utenti, setUtenti] = useState(caricaUtenti)
  const { chiedi, dialogo } = useConferma()

  function ricarica() {
    setUtenti(caricaUtenti())
  }

  function chiediEliminazione(u, richiesta) {
    chiedi({
      titolo: richiesta ? 'Rifiutare la registrazione?' : 'Eliminare l’account?',
      messaggio: richiesta
        ? `La richiesta di "${u.nome}" (${u.email}) verrà eliminata: dovrà registrarsi di nuovo.`
        : `L'account di "${u.nome}" (${u.email}) verrà eliminato e non potrà più accedere.`,
      testoConferma: richiesta ? 'Rifiuta' : 'Elimina',
      onConferma: () => {
        eliminaUtente(u.id)
        ricarica()
      },
    })
  }

  const inAttesa = utenti.filter((u) => !u.approvato)
  const attivi = utenti.filter((u) => u.approvato)

  return (
    <>
      <h1 className="page-title">Utenti</h1>
      <p className="page-subtitle">
        Le nuove registrazioni restano in attesa: nessuno entra finché non lo approvi.
      </p>

      <div className="stat-grid scheda-stat">
        <div className="stat-card">
          <span className="stat-value stat-ambra">{inAttesa.length}</span>
          <span className="stat-label">In attesa di approvazione</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-verde">{attivi.length}</span>
          <span className="stat-label">Account attivi</span>
        </div>
      </div>

      <div className="card sezione">
        <span className="job-list-label">Richieste in attesa ({inAttesa.length})</span>
        {inAttesa.length === 0 ? (
          <p className="job-list-empty">Nessuna registrazione da approvare.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Email</th>
                <th>Ruolo richiesto</th>
                <th>Registrato il</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inAttesa.map((u) => (
                <tr key={u.id}>
                  <td className="cliente-nome-link">{u.nome}</td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="badge-select badge-in-corso"
                      value={u.ruolo}
                      onChange={(e) => {
                        cambiaRuolo(u.id, e.target.value)
                        ricarica()
                      }}
                    >
                      {RUOLI_UTENTE.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formattaData(u.creatoIl)}</td>
                  <td className="azioni-utente">
                    <button
                      type="button"
                      className="btn-chiudi"
                      onClick={() => {
                        approvaUtente(u.id)
                        ricarica()
                      }}
                    >
                      Approva
                    </button>
                    <button
                      type="button"
                      className="btn-rimanda"
                      onClick={() => chiediEliminazione(u, true)}
                    >
                      Rifiuta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card sezione">
        <span className="job-list-label">Account attivi ({attivi.length})</span>
        <table className="task-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Ruolo</th>
              <th>Registrato il</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {attivi.map((u) => {
              const seStesso = u.id === utente?.id
              return (
                <tr key={u.id}>
                  <td className="cliente-nome-link">
                    {u.nome}
                    {seStesso && <span className="riga-sub">sei tu</span>}
                  </td>
                  <td>{u.email}</td>
                  <td>
                    <select
                      className="badge-select badge-completato"
                      value={u.ruolo}
                      disabled={seStesso}
                      onChange={(e) => {
                        cambiaRuolo(u.id, e.target.value)
                        ricarica()
                      }}
                    >
                      {RUOLI_UTENTE.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>{formattaData(u.creatoIl)}</td>
                  <td className="azioni-utente">
                    {!seStesso && (
                      <>
                        <button
                          type="button"
                          className="btn-rimanda"
                          onClick={() => {
                            revocaUtente(u.id)
                            ricarica()
                          }}
                          title="L'utente non potrà più accedere"
                        >
                          Sospendi
                        </button>
                        <button
                          type="button"
                          className="riga-elimina"
                          onClick={() => chiediEliminazione(u, false)}
                          aria-label="Elimina utente"
                        >
                          ×
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {dialogo}
    </>
  )
}
