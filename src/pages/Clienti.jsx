import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { caricaClienti, aggiungiCliente, eliminaCliente } from '../data/clienti'
import { caricaLavori, formattaEuro } from '../data/lavori'
import { caricaFatture, economiaLavoro } from '../data/fatture'
import { caricaPagamenti } from '../data/pagamenti'
import { faseLavoro } from '../data/statoLavoro'
import InputIndirizzo from '../components/InputIndirizzo'
import { TestataDb, Riepilogo, PannelloNuovo, Campo, Strumenti, Vuoto } from '../components/Database'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'

const VUOTO = { nome: '', indirizzo: '', referente: '', telefono: '' }
const FILTRI = ['Tutti', 'Con lavori in corso', 'Con importi aperti']

export default function Clienti() {
  const navigate = useNavigate()
  const [clienti, setClienti] = useState([])
  const [lavori, setLavori] = useState([])
  const [fatture, setFatture] = useState([])
  const [pagamenti, setPagamenti] = useState({})
  const [aperto, setAperto] = useState(false)
  const [form, setForm] = useState(VUOTO)
  const [errore, setErrore] = useState('')
  const [ricerca, setRicerca] = useState('')
  const [filtro, setFiltro] = useState('Tutti')
  const { chiedi, dialogo } = useConferma()

  async function ricarica() {
    const [c, l, f, p] = await Promise.all([
      caricaClienti(),
      caricaLavori(),
      caricaFatture(),
      caricaPagamenti(),
    ])
    setClienti(c)
    setLavori(l)
    setFatture(f)
    setPagamenti(p)
  }

  useEffect(() => {
    ricarica()
  }, [])

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return setErrore('La ragione sociale è obbligatoria.')
    if (!form.indirizzo.trim()) return setErrore('L’indirizzo della sede è obbligatorio.')
    await aggiungiCliente(form)
    setErrore('')
    setForm(VUOTO)
    setAperto(false)
    await ricarica()
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

  // situazione di ogni cliente: lavori in corso e soldi ancora da ricevere
  const situazione = Object.fromEntries(
    clienti.map((c) => [c.id, { lavori: 0, inCorso: 0, daFatturare: 0, daIncassare: 0, scaduto: 0 }]),
  )
  for (const l of lavori) {
    const s = situazione[l.clienteId]
    if (!s) continue
    const e = economiaLavoro(l, fatture, pagamenti, 0)
    s.lavori += 1
    if (faseLavoro(l, e).gruppo === 'lavoro') s.inCorso += 1
    if (l.chiuso) s.daFatturare += e.daFatturare
    s.daIncassare += e.daIncassare
    s.scaduto += e.scaduto
  }

  const tutte = Object.values(situazione)
  const totale = (campo) => tutte.reduce((t, s) => t + s[campo], 0)
  const scaduto = totale('scaduto')

  const q = ricerca.trim().toLowerCase()
  const filtrati = clienti.filter((c) => {
    const s = situazione[c.id]
    if (filtro === 'Con lavori in corso' && s.inCorso === 0) return false
    if (filtro === 'Con importi aperti' && s.daFatturare + s.daIncassare <= 0) return false
    if (!q) return true
    return [c.nome, c.indirizzo, c.referente, c.telefono]
      .filter(Boolean)
      .some((campo) => campo.toLowerCase().includes(q))
  })

  return (
    <>
      <TestataDb
        titolo="Schede Clienti"
        sottotitolo="Anagrafica dei clienti: clicca su una riga per aprire la scheda con lavori e documenti."
        azioni={[{ testo: '+ Nuovo cliente', onClick: () => setAperto((v) => !v), aperto }]}
      />

      <Riepilogo
        voci={[
          { valore: clienti.length, etichetta: 'Clienti in anagrafica' },
          {
            valore: tutte.filter((s) => s.inCorso > 0).length,
            etichetta: 'Con lavori in corso',
          },
          {
            valore: formattaEuro(totale('daFatturare')),
            etichetta: 'Da fatturare',
            tono: totale('daFatturare') > 0 ? 'ambra' : undefined,
            nota: 'lavori chiusi',
          },
          {
            valore: formattaEuro(totale('daIncassare')),
            etichetta: 'Da incassare',
            tono: scaduto > 0 ? 'rosso' : undefined,
            nota: scaduto > 0 ? `di cui scaduti ${formattaEuro(scaduto)}` : 'fatture aperte',
          },
        ]}
      />

      <PannelloNuovo
        aperto={aperto}
        titolo="Nuovo cliente"
        onSubmit={handleSubmit}
        testoInvio="Aggiungi cliente"
        errore={errore}
      >
        <Campo etichetta="Ragione sociale" largo>
          <input type="text" value={form.nome} onChange={(e) => aggiorna('nome', e.target.value)} />
        </Campo>
        <Campo etichetta="Indirizzo sede" largo>
          <InputIndirizzo
            placeholder="Via, numero, comune"
            value={form.indirizzo}
            onChange={(v) => aggiorna('indirizzo', v)}
          />
        </Campo>
        <Campo etichetta="Referente">
          <input
            type="text"
            value={form.referente}
            onChange={(e) => aggiorna('referente', e.target.value)}
          />
        </Campo>
        <Campo etichetta="Telefono">
          <input
            type="text"
            value={form.telefono}
            onChange={(e) => aggiorna('telefono', e.target.value)}
          />
        </Campo>
      </PannelloNuovo>

      <div className="card sezione">
        <Strumenti
          titolo="Clienti"
          mostrati={filtrati.length}
          totali={clienti.length}
          ricerca={ricerca}
          onRicerca={setRicerca}
          segnaposto="Cerca cliente, indirizzo, referente..."
        >
          <select className="db-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTRI.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </Strumenti>

        {filtrati.length === 0 ? (
          <Vuoto>
            {clienti.length === 0
              ? 'Nessun cliente inserito: aggiungilo con “+ Nuovo cliente”.'
              : 'Nessun cliente trovato.'}
          </Vuoto>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Referente</th>
                <th>Lavori</th>
                <th>Da fatturare</th>
                <th>Da incassare</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((c) => {
                const s = situazione[c.id]
                return (
                  <tr
                    key={c.id}
                    className="db-riga"
                    onClick={() => navigate('/clienti/' + c.id)}
                    title="Apri la scheda cliente"
                  >
                    <td>
                      <span className="cliente-nome-link">{c.nome}</span>
                      {c.indirizzo && <span className="riga-sub">{c.indirizzo}</span>}
                    </td>
                    <td>
                      {c.referente || '—'}
                      {c.telefono && <span className="riga-sub">{c.telefono}</span>}
                    </td>
                    <td>
                      {s.lavori}
                      {s.inCorso > 0 && <span className="riga-sub">{s.inCorso} in corso</span>}
                    </td>
                    <td className={s.daFatturare > 0 ? 'db-ambra' : 'db-muto'}>
                      {s.daFatturare > 0 ? formattaEuro(s.daFatturare) : '—'}
                    </td>
                    <td className={s.scaduto > 0 ? 'db-rosso' : s.daIncassare > 0 ? undefined : 'db-muto'}>
                      {s.daIncassare > 0 ? formattaEuro(s.daIncassare) : '—'}
                    </td>
                    <td className="db-azioni-cella">
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
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {dialogo}
    </>
  )
}
