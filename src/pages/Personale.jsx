import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  RUOLI,
  caricaDipendenti,
  aggiungiDipendente,
  eliminaDipendente,
} from '../data/dipendenti'
import { caricaPresenze } from '../data/presenze'
import { oggiISO } from '../data/squadre'
import { TestataDb, Riepilogo, PannelloNuovo, Campo, Strumenti, Vuoto } from '../components/Database'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'

const VUOTO = { nome: '', ruolo: RUOLI[0], telefono: '', email: '', assunzione: '' }

function formattaData(iso) {
  return iso ? new Date(iso).toLocaleDateString('it-IT') : '—'
}

export default function Personale() {
  const navigate = useNavigate()
  const [dipendenti, setDipendenti] = useState([])
  const [presenzeOggi, setPresenzeOggi] = useState({})
  const [aperto, setAperto] = useState(false)
  const [form, setForm] = useState(VUOTO)
  const [errore, setErrore] = useState('')
  const [ricerca, setRicerca] = useState('')
  const [ruolo, setRuolo] = useState('Tutti')
  const { chiedi, dialogo } = useConferma()

  async function ricarica() {
    const [d, p] = await Promise.all([caricaDipendenti(), caricaPresenze(oggiISO())])
    setDipendenti(d)
    setPresenzeOggi(p)
  }

  useEffect(() => {
    ricarica()
  }, [])

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return setErrore('Il nome è obbligatorio.')
    await aggiungiDipendente(form)
    setErrore('')
    setForm(VUOTO)
    setAperto(false)
    await ricarica()
  }

  function elimina(e, dipendente) {
    e.stopPropagation() // il click sulla riga apre la scheda: qui serve solo eliminare
    chiedi({
      titolo: 'Eliminare il dipendente?',
      messaggio: `"${dipendente.nome}" verrà rimosso dall'organico. Presenze e squadre già registrate restano invariate.`,
      onConferma: async () => {
        await eliminaDipendente(dipendente.id)
        await ricarica()
      },
    })
  }

  const statoOggi = (nome) => presenzeOggi[nome] || 'Presente'
  const assenti = dipendenti.filter((d) => statoOggi(d.nome) !== 'Presente')
  const nomiAssenti = assenti.map((d) => d.nome.split(' ')[0])
  const quanti = (...ruoli) => dipendenti.filter((d) => ruoli.includes(d.ruolo)).length

  const q = ricerca.trim().toLowerCase()
  const filtrati = dipendenti.filter((d) => {
    if (ruolo !== 'Tutti' && d.ruolo !== ruolo) return false
    if (!q) return true
    return [d.nome, d.ruolo, d.telefono, d.email, ...(d.qualifiche || [])]
      .filter(Boolean)
      .some((campo) => String(campo).toLowerCase().includes(q))
  })

  return (
    <>
      <TestataDb
        titolo="Gestione Personale"
        sottotitolo="Anagrafica dei dipendenti: clicca su una riga per aprire la scheda."
        azioni={[{ testo: '+ Nuovo dipendente', onClick: () => setAperto((v) => !v), aperto }]}
      />

      <Riepilogo
        voci={[
          { valore: dipendenti.length, etichetta: 'In organico' },
          { valore: quanti('Operaio'), etichetta: 'Operai' },
          { valore: quanti('Preposto', 'Capocantiere'), etichetta: 'Preposti e capicantiere' },
          {
            valore: assenti.length,
            etichetta: 'Assenti oggi',
            tono: assenti.length ? 'ambra' : 'verde',
            nota: assenti.length
              ? nomiAssenti.slice(0, 3).join(', ') + (nomiAssenti.length > 3 ? '…' : '')
              : 'tutti presenti',
          },
        ]}
      />

      <PannelloNuovo
        aperto={aperto}
        titolo="Nuovo dipendente"
        onSubmit={handleSubmit}
        testoInvio="Aggiungi dipendente"
        errore={errore}
      >
        <Campo etichetta="Nome e cognome" largo>
          <input type="text" value={form.nome} onChange={(e) => aggiorna('nome', e.target.value)} />
        </Campo>
        <Campo etichetta="Ruolo">
          <select value={form.ruolo} onChange={(e) => aggiorna('ruolo', e.target.value)}>
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="Telefono">
          <input
            type="text"
            value={form.telefono}
            onChange={(e) => aggiorna('telefono', e.target.value)}
          />
        </Campo>
        <Campo etichetta="Email">
          <input type="email" value={form.email} onChange={(e) => aggiorna('email', e.target.value)} />
        </Campo>
        <Campo etichetta="Data di assunzione">
          <input
            type="date"
            value={form.assunzione}
            onChange={(e) => aggiorna('assunzione', e.target.value)}
          />
        </Campo>
      </PannelloNuovo>

      <div className="card sezione">
        <Strumenti
          titolo="Organico"
          mostrati={filtrati.length}
          totali={dipendenti.length}
          ricerca={ricerca}
          onRicerca={setRicerca}
          segnaposto="Cerca nome, ruolo, qualifica..."
        >
          <select className="db-filtro" value={ruolo} onChange={(e) => setRuolo(e.target.value)}>
            <option value="Tutti">Tutti i ruoli</option>
            {RUOLI.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </Strumenti>

        {filtrati.length === 0 ? (
          <Vuoto>
            {dipendenti.length === 0
              ? 'Nessun dipendente inserito: aggiungilo con “+ Nuovo dipendente”.'
              : 'Nessun dipendente trovato.'}
          </Vuoto>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Ruolo</th>
                <th>Telefono</th>
                <th>Assunzione</th>
                <th>Oggi</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((d) => (
                <tr
                  key={d.id}
                  className="db-riga"
                  onClick={() => navigate('/personale/' + d.id)}
                  title="Apri la scheda del dipendente"
                >
                  <td>
                    <span className="cliente-nome-link">{d.nome}</span>
                    {d.email && <span className="riga-sub">{d.email}</span>}
                  </td>
                  <td>
                    <span className="badge badge-in-corso">{d.ruolo}</span>
                  </td>
                  <td>{d.telefono || '—'}</td>
                  <td>{formattaData(d.assunzione)}</td>
                  <td>
                    <span className={'badge badge-' + statoOggi(d.nome).toLowerCase()}>
                      {statoOggi(d.nome)}
                    </span>
                  </td>
                  <td className="db-azioni-cella">
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
