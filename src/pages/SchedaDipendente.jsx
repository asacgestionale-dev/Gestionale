import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  RUOLI,
  caricaDipendenti,
  aggiornaDipendente,
  eliminaDipendente,
} from '../data/dipendenti'
import { caricaTuttePresenze, STATI_PRESENZA } from '../data/presenze'
import { SQUADRE_BASE, caricaComposizione } from '../data/squadre'
import {
  CATEGORIE,
  caricaDocumenti,
  salvaDocumento,
  eliminaDocumento,
  urlDocumento,
} from '../data/documenti'
import { FERIE_ANNUE_PREDEFINITE, situazioneFerie } from '../data/ferie'
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

export default function SchedaDipendente() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [dipendenti, setDipendenti] = useState([])
  const [documenti, setDocumenti] = useState([])
  const [categoria, setCategoria] = useState(CATEGORIE[0])
  const [caricamento, setCaricamento] = useState(false)
  const [qualifica, setQualifica] = useState('')
  const [salvato, setSalvato] = useState(false)
  const { chiedi, dialogo } = useConferma()

  // i documenti dei dipendenti condividono l'archivio con quelli dei clienti: prefisso per distinguerli
  const chiaveDoc = 'dip:' + id

  // storico presenze e composizioni squadra, per i riepiloghi della scheda
  const [tuttePresenze, setTuttePresenze] = useState({})
  const [composizioni, setComposizioni] = useState({})

  useEffect(() => {
    caricaDocumenti(chiaveDoc).then(setDocumenti)
  }, [chiaveDoc])

  useEffect(() => {
    caricaDipendenti().then(setDipendenti)
    caricaTuttePresenze().then(async (tutte) => {
      setTuttePresenze(tutte)
      const per = {}
      for (const giorno of Object.keys(tutte)) per[giorno] = await caricaComposizione(giorno)
      setComposizioni(per)
    })
  }, [])

  const dipendente = dipendenti.find((d) => d.id === id)

  // quadro ferie: spettanti, godute e richieste ancora in attesa
  const [ferie, setFerie] = useState(null)

  useEffect(() => {
    if (!dipendente) return
    situazioneFerie(dipendente.nome, dipendente.ferie_annue ?? FERIE_ANNUE_PREDEFINITE).then(
      setFerie,
    )
  }, [dipendente?.nome, dipendente?.ferie_annue])

  function aggiorna(patch) {
    setDipendenti((prev) => prev.map((d) => (d.id === id ? { ...d, ...patch } : d)))
    aggiornaDipendente(id, patch)
    setSalvato(true)
  }

  function aggiungiQualifica(e) {
    e.preventDefault()
    if (!qualifica.trim()) return
    aggiorna({ qualifiche: [...(dipendente.qualifiche || []), qualifica.trim()] })
    setQualifica('')
  }

  function rimuoviQualifica(indice) {
    aggiorna({ qualifiche: dipendente.qualifiche.filter((_, i) => i !== indice) })
  }

  function elimina() {
    chiedi({
      titolo: 'Eliminare il dipendente?',
      messaggio: `"${dipendente.nome}" verrà rimosso dall'organico insieme ai documenti allegati.`,
      onConferma: async () => {
        await eliminaDipendente(id)
        navigate('/personale')
      },
    })
  }

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    setCaricamento(true)
    for (const file of files) {
      await salvaDocumento(chiaveDoc, file, categoria)
    }
    setDocumenti(await caricaDocumenti(chiaveDoc))
    setCaricamento(false)
    e.target.value = ''
  }

  function handleElimina(doc) {
    chiedi({
      titolo: 'Eliminare il documento?',
      messaggio: `"${doc.nome}" verrà rimosso dall'archivio e non sarà più recuperabile.`,
      onConferma: async () => {
        await eliminaDocumento(doc.id)
        setDocumenti(await caricaDocumenti(chiaveDoc))
      },
    })
  }

  async function apriDocumento(doc) {
    const url = await urlDocumento(doc.id)
    if (url) window.open(url, '_blank', 'noopener')
  }

  if (!dipendente) {
    return (
      <>
        <h1 className="page-title">Dipendente non trovato</h1>
        <p className="page-subtitle">
          <Link to="/personale">Torna all'organico</Link>
        </p>
      </>
    )
  }

  // conteggio delle giornate per stato, su tutte le date registrate
  const conteggio = Object.fromEntries(STATI_PRESENZA.map((s) => [s, 0]))
  const giornateAssenza = []
  for (const [data, mappa] of Object.entries(tuttePresenze)) {
    const stato = mappa[dipendente.nome]
    if (!stato) continue
    conteggio[stato] = (conteggio[stato] || 0) + 1
    if (stato !== 'Presente') giornateAssenza.push({ data, stato })
  }
  giornateAssenza.sort((a, b) => b.data.localeCompare(a.data))

  // squadre in cui è stato inserito, sulle giornate pianificate
  const giornateSquadra = []
  for (const data of Object.keys(composizioni)) {
    const comp = composizioni[data] || {}
    for (const s of SQUADRE_BASE) {
      const membri = comp[s.id] || []
      const indice = membri.indexOf(dipendente.nome)
      if (indice >= 0) {
        giornateSquadra.push({ data, squadra: s.nome, preposto: indice === 0 })
      }
    }
  }
  giornateSquadra.sort((a, b) => b.data.localeCompare(a.data))

  return (
    <>
      <div className="pagina-head">
        <div>
          <h1 className="page-title">{dipendente.nome}</h1>
          <p className="page-subtitle">
            Scheda dipendente · {dipendente.ruolo}
            {salvato && <span className="salvato-tag">Modifiche salvate</span>}
          </p>
        </div>
        <Link to="/personale" className="vai-assegnazione">
          ← Torna all'organico
        </Link>
      </div>

      <div className="stat-grid scheda-stat">
        <div className="stat-card">
          <span className="stat-value stat-verde">{conteggio.Presente || 0}</span>
          <span className="stat-label">Giorni presente</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{conteggio.Ferie || 0}</span>
          <span className="stat-label">Giorni di ferie</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-rosso">{conteggio.Malattia || 0}</span>
          <span className="stat-label">Giorni di malattia</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">{conteggio.Permesso || 0}</span>
          <span className="stat-label">Permessi</span>
        </div>
      </div>

      <form className="job-form nuovo-lavoro-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-griglia">
          <div className="form-colonna">
            <label className="job-form-label">Nome e cognome</label>
            <input
              type="text"
              value={dipendente.nome}
              onChange={(e) => aggiorna({ nome: e.target.value })}
            />

            <label className="job-form-label">Ruolo</label>
            <select value={dipendente.ruolo} onChange={(e) => aggiorna({ ruolo: e.target.value })}>
              {RUOLI.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label className="job-form-label">Telefono</label>
            <input
              type="text"
              value={dipendente.telefono || ''}
              onChange={(e) => aggiorna({ telefono: e.target.value })}
            />

            <label className="job-form-label">Email</label>
            <input
              type="email"
              value={dipendente.email || ''}
              onChange={(e) => aggiorna({ email: e.target.value })}
            />

            <label className="job-form-label">Data di assunzione</label>
            <input
              type="date"
              value={dipendente.assunzione || ''}
              onChange={(e) => aggiorna({ assunzione: e.target.value })}
            />

            <label className="job-form-label">
              Giorni di ferie all'anno
              {ferie && ` — residui ${ferie.residue}`}
            </label>
            <input
              type="number"
              min="0"
              max="60"
              value={dipendente.ferie_annue ?? FERIE_ANNUE_PREDEFINITE}
              onChange={(e) => aggiorna({ ferie_annue: Number(e.target.value) || 0 })}
            />
            {ferie && (
              <p className="riga-sub">
                Quest'anno: {ferie.godute} godute, {ferie.inAttesa} in attesa di approvazione,{' '}
                {ferie.permessi} giorni di permesso.
              </p>
            )}
          </div>

          <div className="form-colonna">
            <label className="job-form-label">Qualifiche e abilitazioni</label>
            <div className="materiale-riga">
              <input
                type="text"
                placeholder="Es. patentino carrello elevatore"
                value={qualifica}
                onChange={(e) => setQualifica(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aggiungiQualifica(e)}
              />
              <button type="button" className="materiale-add" onClick={aggiungiQualifica}>
                +
              </button>
            </div>
            {dipendente.qualifiche?.length > 0 && (
              <ul className="materiale-lista">
                {dipendente.qualifiche.map((qual, i) => (
                  <li key={qual + i}>
                    <span>{qual}</span>
                    <button type="button" onClick={() => rimuoviQualifica(i)} aria-label="Rimuovi">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="job-form-label">Note</label>
            <textarea
              rows={6}
              placeholder="Annotazioni sul dipendente"
              value={dipendente.note || ''}
              onChange={(e) => aggiorna({ note: e.target.value })}
            />
          </div>
        </div>

        <button type="button" className="btn-elimina" onClick={elimina}>
          Elimina dipendente
        </button>
      </form>

      <div className="card sezione">
        <span className="job-list-label">Squadre di appartenenza ({giornateSquadra.length})</span>
        {giornateSquadra.length === 0 ? (
          <p className="job-list-empty">Non ancora inserito in nessuna squadra.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Giornata</th>
                <th>Squadra</th>
                <th>Ruolo in squadra</th>
              </tr>
            </thead>
            <tbody>
              {giornateSquadra.map((g) => (
                <tr key={g.data + g.squadra}>
                  <td>{formattaData(g.data)}</td>
                  <td>{g.squadra}</td>
                  <td>
                    {g.preposto ? (
                      <span className="badge badge-in-corso">Preposto</span>
                    ) : (
                      <span className="badge badge-da-fare">Componente</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card sezione">
        <span className="job-list-label">Assenze registrate ({giornateAssenza.length})</span>
        {giornateAssenza.length === 0 ? (
          <p className="job-list-empty">Nessuna assenza registrata.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Giornata</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {giornateAssenza.map((g) => (
                <tr key={g.data}>
                  <td>{formattaData(g.data)}</td>
                  <td>
                    <span className={'badge badge-' + g.stato.toLowerCase()}>{g.stato}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
            Nessun documento caricato. Puoi allegare contratti, attestati e certificazioni.
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
