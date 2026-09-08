import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { caricaClienti, aggiungiCliente, eliminaCliente } from '../data/clienti'
import InputIndirizzo from '../components/InputIndirizzo'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'

const VUOTO = { nome: '', indirizzo: '', referente: '', telefono: '' }

export default function Clienti() {
  const navigate = useNavigate()
  const [clienti, setClienti] = useState([])
  const [form, setForm] = useState(VUOTO)
  const [ricerca, setRicerca] = useState('')
  const { chiedi, dialogo } = useConferma()

  async function ricarica() {
    setClienti(await caricaClienti())
  }

  useEffect(() => {
    ricarica()
  }, [])

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim() || !form.indirizzo.trim()) return
    await aggiungiCliente(form)
    await ricarica()
    setForm(VUOTO)
  }

  function elimina(e, cliente) {
    e.stopPropagation() // il click sulla riga apre la scheda: qui serve solo eliminare
    chiedi({
      titolo: 'Eliminare il cliente?',
      messaggio: `"${cliente.nome}" verrà rimosso dall'anagrafica. I lavori collegati restano, ma senza cliente.`,
      onConferma: async () => {
        await eliminaCliente(cliente.id)
        await ricarica()
      },
    })
  }

  const q = ricerca.trim().toLowerCase()
  const filtrati = q
    ? clienti.filter((c) =>
        [c.nome, c.indirizzo, c.referente, c.telefono]
          .filter(Boolean)
          .some((campo) => campo.toLowerCase().includes(q)),
      )
    : clienti

  return (
    <>
      <h1 className="page-title">Schede Clienti</h1>
      <p className="page-subtitle">Anagrafica clienti e indirizzo sede</p>

      <form className="job-form nuovo-lavoro-form" onSubmit={handleSubmit}>
        <label className="job-form-label">Nuovo cliente</label>
        <div className="form-griglia">
          <div className="form-colonna">
            <input
              type="text"
              placeholder="Ragione sociale"
              value={form.nome}
              onChange={(e) => aggiorna('nome', e.target.value)}
            />
            <InputIndirizzo
              placeholder="Indirizzo sede"
              value={form.indirizzo}
              onChange={(v) => aggiorna('indirizzo', v)}
            />
          </div>
          <div className="form-colonna">
            <input
              type="text"
              placeholder="Referente"
              value={form.referente}
              onChange={(e) => aggiorna('referente', e.target.value)}
            />
            <input
              type="text"
              placeholder="Telefono"
              value={form.telefono}
              onChange={(e) => aggiorna('telefono', e.target.value)}
            />
          </div>
        </div>
        <button type="submit">Aggiungi cliente</button>
      </form>

      <div className="card elenco-clienti">
        <div className="lista-head">
          <span className="job-list-label">
            Clienti in anagrafica ({filtrati.length}
            {q && ` di ${clienti.length}`})
          </span>
          <input
            type="search"
            className="campo-ricerca"
            placeholder="Cerca cliente..."
            value={ricerca}
            onChange={(e) => setRicerca(e.target.value)}
          />
        </div>

        {filtrati.length === 0 && (
          <p className="job-list-empty">
            {clienti.length === 0 ? 'Nessun cliente inserito.' : 'Nessun cliente trovato.'}
          </p>
        )}

        {filtrati.length > 0 && (
          <table className="task-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Indirizzo sede</th>
                <th>Referente</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((c) => (
                <tr
                  key={c.id}
                  className="riga-cliente"
                  onClick={() => navigate('/clienti/' + c.id)}
                  title="Apri la scheda cliente"
                >
                  <td className="cliente-nome-link">{c.nome}</td>
                  <td>{c.indirizzo}</td>
                  <td>
                    {c.referente}
                    {c.telefono && <span className="cliente-tel"> · {c.telefono}</span>}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={(e) => elimina(e, c)}
                      aria-label="Elimina cliente"
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
