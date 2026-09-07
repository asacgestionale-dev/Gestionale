import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { caricaClienti } from '../data/clienti'
import { caricaLavori, salvaLavori, formattaEuro } from '../data/lavori'
import { CATEGORIE, caricaDocumenti, salvaDocumento, eliminaDocumento } from '../data/documenti'
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
  const [clienti] = useState(caricaClienti)
  const [lavori, setLavori] = useState(caricaLavori)
  const [documenti, setDocumenti] = useState([])
  const [categoria, setCategoria] = useState(CATEGORIE[0])
  const [caricamento, setCaricamento] = useState(false)
  const { chiedi, dialogo } = useConferma()

  useEffect(() => {
    caricaDocumenti(id).then(setDocumenti)
  }, [id])

  const cliente = clienti.find((c) => c.id === id)
  const lavoriCliente = lavori.filter((l) => l.clienteId === id)

  const totaleImporti = lavoriCliente.reduce((s, l) => s + (l.importo || 0), 0)
  const totaleIncassato = lavoriCliente.reduce((s, l) => s + (l.incassato || 0), 0)
  const daIncassare = totaleImporti - totaleIncassato

  // materiali aggregati con il numero di volte che sono stati usati
  const conteggioMateriali = {}
  for (const l of lavoriCliente) {
    for (const m of l.materiali || []) {
      conteggioMateriali[m] = (conteggioMateriali[m] || 0) + 1
    }
  }
  const materiali = Object.entries(conteggioMateriali).sort((a, b) => b[1] - a[1])

  function aggiornaLavoro(lavoroId, patch) {
    const next = lavori.map((l) => (l.id === lavoroId ? { ...l, ...patch } : l))
    setLavori(next)
    salvaLavori(next)
  }

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

  function apriDocumento(doc) {
    const url = URL.createObjectURL(doc.file)
    window.open(url, '_blank', 'noopener')
    setTimeout(() => URL.revokeObjectURL(url), 60000)
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
          <span className="stat-label">Da incassare</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{lavoriCliente.length}</span>
          <span className="stat-label">Lavori totali</span>
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
                <th>Stato</th>
                <th>Importo</th>
                <th>Incassato</th>
              </tr>
            </thead>
            <tbody>
              {lavoriCliente.map((l) => (
                <tr key={l.id}>
                  <td>
                    {l.titolo}
                    {l.materiali?.length > 0 && (
                      <span className="riga-sub">Materiali: {l.materiali.join(', ')}</span>
                    )}
                  </td>
                  <td>{formattaData(l.creatoIl)}</td>
                  <td>
                    <label className="check-riga">
                      <input
                        type="checkbox"
                        checked={!!l.completato}
                        onChange={(e) => aggiornaLavoro(l.id, { completato: e.target.checked })}
                      />
                      {l.completato ? 'Svolto' : 'Da fare'}
                    </label>
                  </td>
                  <td>{formattaEuro(l.importo)}</td>
                  <td>
                    <input
                      type="number"
                      className="input-incasso"
                      min="0"
                      step="10"
                      value={l.incassato || 0}
                      onChange={(e) =>
                        aggiornaLavoro(l.id, { incassato: Number(e.target.value) || 0 })
                      }
                    />
                  </td>
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
