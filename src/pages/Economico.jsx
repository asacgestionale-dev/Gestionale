import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { caricaLavori, aggiornaLavoro, formattaEuro } from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import {
  TIPI_PAGAMENTO,
  MODALITA,
  caricaPagamenti,
  aggiungiPagamento,
  eliminaPagamento,
  pagamentiDelLavoro,
  totaleIncassato,
  statoPagamento,
} from '../data/pagamenti'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Consuntivazione.css'
import './Economico.css'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

const NUOVO = { tipo: 'Acconto', importo: '', data: oggiISO(), modalita: 'Bonifico', note: '' }

export default function Economico() {
  const navigate = useNavigate()
  const [lavori, setLavori] = useState([])
  const [clienti, setClienti] = useState([])
  const [pagamenti, setPagamenti] = useState({})
  const [apertoId, setApertoId] = useState(null)
  const [form, setForm] = useState(NUOVO)
  const [filtro, setFiltro] = useState('Da incassare')
  const { chiedi, dialogo } = useConferma()

  async function ricarica() {
    const [l, p] = await Promise.all([caricaLavori(), caricaPagamenti()])
    setLavori(l)
    setPagamenti(p)
  }

  useEffect(() => {
    ricarica()
    caricaClienti().then(setClienti)
  }, [])

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.nome || '—'

  // ogni lavoro con importo concordato entra qui in automatico
  const conImporto = lavori.filter((l) => (Number(l.importo) || 0) > 0)

  async function registra(lavoro) {
    const valore = Number(form.importo)
    if (!valore || valore <= 0) return

    await aggiungiPagamento(lavoro.id, { ...form, importo: valore })
    const aggiornati = await caricaPagamenti()
    setPagamenti(aggiornati)

    // l'incassato del lavoro resta allineato ai movimenti registrati
    const incassato = totaleIncassato(aggiornati, lavoro.id)
    setLavori((prev) => prev.map((l) => (l.id === lavoro.id ? { ...l, incassato } : l)))
    await aggiornaLavoro(lavoro.id, { incassato })

    setForm({ ...NUOVO, data: oggiISO() })
  }

  function elimina(lavoro, movimento) {
    chiedi({
      titolo: 'Eliminare il movimento?',
      messaggio: `${movimento.tipo} di ${formattaEuro(movimento.importo)} del ${formattaData(movimento.data)}: l'importo verrà scalato dall'incassato del lavoro.`,
      onConferma: async () => {
        await eliminaPagamento(movimento.id)
        const aggiornati = await caricaPagamenti()
        setPagamenti(aggiornati)

        const incassato = totaleIncassato(aggiornati, lavoro.id)
        setLavori((prev) => prev.map((l) => (l.id === lavoro.id ? { ...l, incassato } : l)))
        await aggiornaLavoro(lavoro.id, { incassato })
      },
    })
  }

  const righe = conImporto
    .map((l) => {
      const incassato = totaleIncassato(pagamenti, l.id)
      return { lavoro: l, incassato, residuo: (l.importo || 0) - incassato, stato: statoPagamento(l, incassato) }
    })
    .filter((r) => {
      if (filtro === 'Tutti') return true
      if (filtro === 'Da incassare') return r.residuo > 0
      return r.stato.testo === filtro
    })

  const totali = conImporto.reduce(
    (acc, l) => {
      const inc = totaleIncassato(pagamenti, l.id)
      acc.concordato += Number(l.importo) || 0
      acc.incassato += inc
      return acc
    },
    { concordato: 0, incassato: 0 },
  )
  const daIncassare = totali.concordato - totali.incassato

  return (
    <>
      <h1 className="page-title">Gestione Economica</h1>
      <p className="page-subtitle">
        Ogni lavoro con importo concordato compare qui: registra acconti e SAL e segui il saldo.
      </p>

      <div className="stat-grid scheda-stat">
        <div className="stat-card">
          <span className="stat-value">{formattaEuro(totali.concordato)}</span>
          <span className="stat-label">Totale concordato</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-verde">{formattaEuro(totali.incassato)}</span>
          <span className="stat-label">Incassato</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-rosso">{formattaEuro(daIncassare)}</span>
          <span className="stat-label">Da incassare</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{conImporto.length}</span>
          <span className="stat-label">Lavori a bilancio</span>
        </div>
      </div>

      <div className="card sezione">
        <div className="lista-head">
          <span className="job-list-label">Lavori ({righe.length})</span>
          <select className="campo-ricerca" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option>Da incassare</option>
            <option>Tutti</option>
            <option>Parziale</option>
            <option>Saldato</option>
          </select>
        </div>

        {righe.length === 0 ? (
          <p className="job-list-empty">
            Nessun lavoro con importo concordato: indicalo creando il lavoro o dalla sua scheda.
          </p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Lavoro</th>
                <th>Cliente</th>
                <th>Concordato</th>
                <th>Incassato</th>
                <th>Residuo</th>
                <th>Avanzamento</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {righe.map(({ lavoro, incassato, residuo, stato }) => (
                <tr key={lavoro.id}>
                  <td className="cliente-nome-link">{lavoro.titolo}</td>
                  <td>{nomeCliente(lavoro.clienteId)}</td>
                  <td>{formattaEuro(lavoro.importo)}</td>
                  <td>{formattaEuro(incassato)}</td>
                  <td className={residuo > 0 ? 'saldo-aperto' : 'saldo-chiuso'}>
                    {residuo > 0 ? formattaEuro(residuo) : '—'}
                  </td>
                  <td>
                    <div className="avanzamento">
                      <div className="avanzamento-barra">
                        <span style={{ width: stato.percentuale + '%' }} />
                      </div>
                      <span className={'badge ' + stato.classe}>{stato.percentuale}%</span>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-apri"
                      onClick={() => {
                        setApertoId(apertoId === lavoro.id ? null : lavoro.id)
                        setForm({ ...NUOVO, data: oggiISO() })
                      }}
                    >
                      {apertoId === lavoro.id ? 'Chiudi' : 'Gestisci'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {apertoId &&
        (() => {
          const lavoro = lavori.find((l) => l.id === apertoId)
          if (!lavoro) return null
          const movimenti = pagamentiDelLavoro(pagamenti, lavoro.id)
          const incassato = totaleIncassato(pagamenti, lavoro.id)
          const residuo = (lavoro.importo || 0) - incassato

          return (
            <div className="card sezione dettaglio-consuntivo">
              <div className="lista-head">
                <span className="job-list-label">
                  {lavoro.titolo} · residuo {formattaEuro(residuo)}
                </span>
                <button
                  type="button"
                  className="vai-assegnazione"
                  onClick={() => navigate('/lavori/' + lavoro.id)}
                >
                  Apri scheda lavoro →
                </button>
              </div>

              <div className="movimento-form">
                <div className="movimento-campo">
                  <label className="job-form-label">Tipo</label>
                  <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                    {TIPI_PAGAMENTO.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="movimento-campo">
                  <label className="job-form-label">Importo (€)</label>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    placeholder={String(residuo > 0 ? residuo : 0)}
                    value={form.importo}
                    onChange={(e) => setForm({ ...form, importo: e.target.value })}
                  />
                </div>
                <div className="movimento-campo">
                  <label className="job-form-label">Data</label>
                  <input
                    type="date"
                    value={form.data}
                    onChange={(e) => setForm({ ...form, data: e.target.value })}
                  />
                </div>
                <div className="movimento-campo">
                  <label className="job-form-label">Modalità</label>
                  <select
                    value={form.modalita}
                    onChange={(e) => setForm({ ...form, modalita: e.target.value })}
                  >
                    {MODALITA.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="movimento-campo movimento-note">
                  <label className="job-form-label">Note</label>
                  <input
                    type="text"
                    placeholder="Riferimento fattura, stato avanzamento..."
                    value={form.note}
                    onChange={(e) => setForm({ ...form, note: e.target.value })}
                  />
                </div>
                <button type="button" className="btn-chiudi" onClick={() => registra(lavoro)}>
                  Registra
                </button>
              </div>

              {movimenti.length === 0 ? (
                <p className="job-list-empty">Nessun movimento registrato per questo lavoro.</p>
              ) : (
                <table className="task-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Data</th>
                      <th>Importo</th>
                      <th>Modalità</th>
                      <th>Note</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {movimenti.map((p) => (
                      <tr key={p.id}>
                        <td>
                          <span className="badge badge-in-corso">{p.tipo}</span>
                        </td>
                        <td>{formattaData(p.data)}</td>
                        <td>{formattaEuro(p.importo)}</td>
                        <td>{p.modalita}</td>
                        <td>{p.note || '—'}</td>
                        <td>
                          <button
                            type="button"
                            className="riga-elimina"
                            onClick={() => elimina(lavoro, p)}
                            aria-label="Elimina movimento"
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
          )
        })()}

      {dialogo}
    </>
  )
}
