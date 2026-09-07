import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { RUOLI, caricaDipendenti, salvaDipendenti } from '../data/dipendenti'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'

const VUOTO = { nome: '', ruolo: RUOLI[0], telefono: '', email: '', assunzione: '' }

export default function Personale() {
  const navigate = useNavigate()
  const [dipendenti, setDipendenti] = useState(caricaDipendenti)
  const [form, setForm] = useState(VUOTO)
  const [ricerca, setRicerca] = useState('')
  const { chiedi, dialogo } = useConferma()

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return
    const next = [...dipendenti, { ...form, id: 'p' + Date.now(), qualifiche: [], note: '' }]
    setDipendenti(next)
    salvaDipendenti(next)
    setForm(VUOTO)
  }

  function elimina(e, dipendente) {
    e.stopPropagation() // il click sulla riga apre la scheda: qui serve solo eliminare
    chiedi({
      titolo: 'Eliminare il dipendente?',
      messaggio: `"${dipendente.nome}" verrà rimosso dall'organico. Presenze e squadre già registrate restano invariate.`,
      onConferma: () => {
        const next = dipendenti.filter((d) => d.id !== dipendente.id)
        setDipendenti(next)
        salvaDipendenti(next)
      },
    })
  }

  const q = ricerca.trim().toLowerCase()
  const filtrati = q
    ? dipendenti.filter((d) =>
        [d.nome, d.ruolo, d.telefono, d.email]
          .filter(Boolean)
          .some((campo) => campo.toLowerCase().includes(q)),
      )
    : dipendenti

  return (
    <>
      <h1 className="page-title">Gestione Personale</h1>
      <p className="page-subtitle">Anagrafica dipendenti: clicca su una riga per aprire la scheda</p>

      <form className="job-form nuovo-lavoro-form" onSubmit={handleSubmit}>
        <label className="job-form-label">Nuovo dipendente</label>
        <div className="form-griglia">
          <div className="form-colonna">
            <input
              type="text"
              placeholder="Nome e cognome"
              value={form.nome}
              onChange={(e) => aggiorna('nome', e.target.value)}
            />
            <select value={form.ruolo} onChange={(e) => aggiorna('ruolo', e.target.value)}>
              {RUOLI.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Telefono"
              value={form.telefono}
              onChange={(e) => aggiorna('telefono', e.target.value)}
            />
          </div>
          <div className="form-colonna">
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => aggiorna('email', e.target.value)}
            />
            <label className="job-form-label">Data di assunzione</label>
            <input
              type="date"
              value={form.assunzione}
              onChange={(e) => aggiorna('assunzione', e.target.value)}
            />
          </div>
        </div>
        <button type="submit">Aggiungi dipendente</button>
      </form>

      <div className="card elenco-clienti">
        <div className="lista-head">
          <span className="job-list-label">
            Organico ({filtrati.length}
            {q && ` di ${dipendenti.length}`})
          </span>
          <input
            type="search"
            className="campo-ricerca"
            placeholder="Cerca dipendente..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
        </div>

        {filtrati.length === 0 ? (
          <p className="job-list-empty">
            {dipendenti.length === 0 ? 'Nessun dipendente inserito.' : 'Nessun dipendente trovato.'}
          </p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Ruolo</th>
                <th>Contatti</th>
                <th>Assunzione</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((d) => (
                <tr
                  key={d.id}
                  className="riga-cliente"
                  onClick={() => navigate('/personale/' + d.id)}
                  title="Apri la scheda del dipendente"
                >
                  <td className="cliente-nome-link">{d.nome}</td>
                  <td>
                    <span className="badge badge-in-corso">{d.ruolo}</span>
                  </td>
                  <td>
                    {d.telefono}
                    {d.telefono && d.email && ' · '}
                    {d.email}
                    {!d.telefono && !d.email && '—'}
                  </td>
                  <td>
                    {d.assunzione ? new Date(d.assunzione).toLocaleDateString('it-IT') : '—'}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={(e) => elimina(e, d)}
                      aria-label="Elimina dipendente"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {dialogo}
    </>
  )
}
