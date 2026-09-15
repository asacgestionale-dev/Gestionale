import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { caricaClienti } from '../data/clienti'
import { caricaLavori, formattaEuro } from '../data/lavori'
import { caricaFatture, economiaLavoro } from '../data/fatture'
import { caricaPagamenti } from '../data/pagamenti'
import { faseLavoro } from '../data/statoLavoro'
import {
  CATEGORIE,
  caricaDocumenti,
  salvaDocumento,
  eliminaDocumento,
  urlDocumento,
} from '../data/documenti'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

function formattaPeso(byte) {
  if (byte < 1024) return byte + ' B'
  if (byte < 1024 * 1024) return Math.round(byte / 1024) + ' KB'
  return (byte / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function SchedaCliente() {
  const { id } = useParams()
  const [clienti, setClienti] = useState([])
  const [lavori, setLavori] = useState([])
  const [documenti, setDocumenti] = useState([])
  const [categoria, setCategoria] = useState(CATEGORIE[0])
  const [caricamento, setCaricamento] = useState(false)
  const [fatture, setFatture] = useState([])
  const [pagamenti, setPagamenti] = useState({})
  const navigate = useNavigate()
  const { chiedi, dialogo } = useConferma()

  useEffect(() => {
    caricaClienti().then(setClienti)
    caricaLavori().then(setLavori)
    caricaFatture().then(setFatture)
    caricaPagamenti().then(setPagamenti)
  }, [])

  useEffect(() => {
    caricaDocumenti(id).then(setDocumenti)
  }, [id])

  const cliente = clienti.find((c) => c.id === id)
  const lavoriCliente = lavori.filter((l) => l.clienteId === id)

  // conti e fase di ogni lavoro, calcolati come nel resto del gestionale
  const righeLavori = lavoriCliente.map((l) => {
    const economia = economiaLavoro(l, fatture, pagamenti, 0)
    return { lavoro: l, economia, fase: faseLavoro(l, economia) }
  })
  const totaleImporti = righeLavori.reduce((s, r) => s + r.economia.importo, 0)
  const totaleIncassato = righeLavori.reduce((s, r) => s + r.economia.incassato, 0)
  const daIncassare = righeLavori.reduce((s, r) => s + r.economia.daIncassare, 0)
  const daFatturare = righeLavori
    .filter((r) => r.lavoro.chiuso)
    .reduce((s, r) => s + r.economia.daFatturare, 0)

  // materiali aggregati con il numero di volte che sono stati usati
  const conteggioMateriali = {}
  for (const l of lavoriCliente) {
    for (const m of l.materiali || []) {
      conteggioMateriali[m] = (conteggioMateriali[m] || 0) + 1
    }
  }
  const materiali = Object.entries(conteggioMateriali).sort((a, b) => b[1] - a[1])

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setCaricamento(true)
    for (const file of files) {
      await salvaDocumento(id, file, categoria)
    }
    setDocumenti(await caricaDocumenti(id))
    setCaricamento(false)
    e.target.value = ''
  }

  function handleElimina(doc) {
    chiedi({
      titolo: 'Eliminare il documento?',
      messaggio: `"${doc.nome}" verrà rimosso dall'archivio e non sarà più recuperabile.`,
      onConferma: async () => {
        await eliminaDocumento(doc.id)
        setDocumenti(await caricaDocumenti(id))
      },
    })
  }

  async function apriDocumento(doc) {
    const url = await urlDocumento(doc.id)
    if (url) window.open(url, '_blank', 'noopener')
  }

  if (!cliente) {
    return (
      <>
        <h1 className="page-title">Cliente non trovato</h1>
        <p className="page-subtitle">
          <Link to="/clienti">Torna all'elenco clienti</Link>
        </p>
      </>
    )
  }

  return (
    <>
      <div className="pagina-head">
        <div>
          <h1 className="page-title">{cliente.nome}</h1>
          <p className="page-subtitle">Scheda cliente</p>
        </div>
        <Link to="/clienti" className="vai-assegnazione">
          ← Torna all'elenco
        </Link>
      </div>

      <div className="card scheda-anagrafica">
        <div className="dato">
          <span className="dato-label">Indirizzo sede</span>
          <span className="dato-valore">{cliente.indirizzo || '—'}</span>
        </div>
        <div className="dato">
          <span className="dato-label">Referente</span>
          <span className="dato-valore">{cliente.referente || '—'}</span>
        </div>
        <div className="dato">
          <span className="dato-label">Telefono</span>
          <span className="dato-valore">{cliente.telefono || '—'}</span>
        </div>
      </div>

      <div className="stat-grid scheda-stat">
        <div className="stat-card">
          <span className="stat-value">{formattaEuro(totaleImporti)}</span>
          <span className="stat-label">Totale lavori</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-verde">{formattaEuro(totaleIncassato)}</span>
          <span className="stat-label">Incassato</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-rosso">{formattaEuro(daIncassare)}</span>
          <span className="stat-label">Da incassare (fatture aperte)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-ambra">{formattaEuro(daFatturare)}</span>
          <span className="stat-label">Da fatturare</span>
        </div>
      </div>

      <div className="card sezione">
        <span className="job-list-label">Cronologia lavori ({lavoriCliente.length})</span>
        {lavoriCliente.length === 0 ? (
          <p className="job-list-empty">Nessun lavoro registrato per questo cliente.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Lavoro</th>
                <th>Data</th>
                <th>Fase</th>
                <th>Importo</th>
                <th>Incassato</th>
              </tr>
            </thead>
            <tbody>
              {righeLavori.map(({ lavoro: l, economia, fase }) => (
                <tr
                  key={l.id}
                  className="db-riga"
                  onClick={() => navigate('/lavori/' + l.id)}
                  title="Apri la scheda del lavoro"
                >
                  <td>
                    <span className="cliente-nome-link">{l.titolo}</span>
                    {l.materiali?.length > 0 && (
                      <span className="riga-sub">Materiali: {l.materiali.join(', ')}</span>
                    )}
                  </td>
                  <td>{formattaData(l.assegnato?.data || l.creatoIl)}</td>
                  <td>
                    <span className={'badge ' + fase.classe}>{fase.titolo}</span>
                    {fase.dettaglio && <span className="riga-sub">{fase.dettaglio}</span>}
                  </td>
                  <td>{formattaEuro(l.importo)}</td>
                  <td>{formattaEuro(economia.incassato)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card sezione">
        <span className="job-list-label">Materiali utilizzati ({materiali.length})</span>
        {materiali.length === 0 ? (
          <p className="job-list-empty">Nessun materiale registrato.</p>
        ) : (
          <div className="materiali-tag">
            {materiali.map(([nome, volte]) => (
              <span key={nome} className="tag-materiale">
                {nome}
                {volte > 1 && <span className="tag-conteggio">×{volte}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="card sezione">
        <div className="lista-head">
          <span className="job-list-label">Documenti ({documenti.length})</span>
          <div className="upload-riga">
            <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIE.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <label className="upload-btn">
              {caricamento ? 'Caricamento...' : 'Carica documenti'}
              <input type="file" multiple onChange={handleUpload} hidden />
            </label>
          </div>
        </div>

        {documenti.length === 0 ? (
          <p className="job-list-empty">
            Nessun documento caricato. Puoi allegare fatture, certificazioni e scansioni.
          </p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Documento</th>
                <th>Categoria</th>
                <th>Dimensione</th>
                <th>Caricato il</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {documenti.map((d) => (
                <tr key={d.id}>
                  <td>
                    <button type="button" className="doc-link" onClick={() => apriDocumento(d)}>
                      {d.nome}
                    </button>
                  </td>
                  <td>
                    <span className="badge badge-in-corso">{d.categoria}</span>
                  </td>
                  <td>{formattaPeso(d.dimensione)}</td>
                  <td>{formattaData(d.caricatoIl)}</td>
                  <td>
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={() => handleElimina(d)}
                      aria-label="Elimina documento"
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
