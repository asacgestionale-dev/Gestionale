import { useEffect, useState } from 'react'
import { caricaDipendenti } from '../data/dipendenti'
import {
  CATEGORIE_DPI,
  caricaCatalogoDpi,
  aggiungiDpi as salvaDpiSuDb,
  eliminaDpi as eliminaDpiDaDb,
  caricaConsegne,
  aggiungiConsegna,
  eliminaConsegna as eliminaConsegnaDaDb,
  calcolaScadenza,
  statoConsegna,
} from '../data/dpi'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Consuntivazione.css'
import './Dpi.css'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

const DPI_VUOTO = { nome: '', categoria: CATEGORIE_DPI[0], norma: '', durataMesi: 12, note: '' }
const CONSEGNA_VUOTA = { dpiId: '', dipendente: '', taglia: '', dataConsegna: oggiISO(), note: '' }

export default function Dpi() {
  const [catalogo, setCatalogo] = useState([])
  const [consegne, setConsegne] = useState([])
  const [dipendenti, setDipendenti] = useState([])
  const [formDpi, setFormDpi] = useState(DPI_VUOTO)
  const [formConsegna, setFormConsegna] = useState(CONSEGNA_VUOTA)
  const [ricerca, setRicerca] = useState('')
  const [filtro, setFiltro] = useState('Tutte')
  const { chiedi, dialogo } = useConferma()

  async function ricarica() {
    const [cat, cons] = await Promise.all([caricaCatalogoDpi(), caricaConsegne()])
    setCatalogo(cat)
    setConsegne(cons)
  }

  useEffect(() => {
    ricarica()
    caricaDipendenti().then(setDipendenti)
  }, [])

  const nomeDpi = (id) => catalogo.find((d) => d.id === id)?.nome || '—'

  async function aggiungiDpi(e) {
    e.preventDefault()
    if (!formDpi.nome.trim()) return
    await salvaDpiSuDb(formDpi)
    await ricarica()
    setFormDpi(DPI_VUOTO)
  }

  function eliminaDpi(dpi) {
    chiedi({
      titolo: 'Eliminare il dispositivo?',
      messaggio: `"${dpi.nome}" verrà tolto dal catalogo. Le consegne già registrate restano.`,
      onConferma: async () => {
        await eliminaDpiDaDb(dpi.id)
        await ricarica()
      },
    })
  }

  async function registraConsegna(e) {
    e.preventDefault()
    if (!formConsegna.dpiId || !formConsegna.dipendente) return
    const dpi = catalogo.find((d) => d.id === formConsegna.dpiId)
    await aggiungiConsegna({
      ...formConsegna,
      scadenza: calcolaScadenza(formConsegna.dataConsegna, dpi?.durataMesi),
    })
    await ricarica()
    setFormConsegna({ ...CONSEGNA_VUOTA, dataConsegna: formConsegna.dataConsegna })
  }

  function eliminaConsegna(consegna) {
    chiedi({
      titolo: 'Eliminare la consegna?',
      messaggio: `La consegna di "${nomeDpi(consegna.dpiId)}" a ${consegna.dipendente} verrà rimossa.`,
      onConferma: async () => {
        await eliminaConsegnaDaDb(consegna.id)
        await ricarica()
      },
    })
  }

  const q = ricerca.trim().toLowerCase()
  const consegneFiltrate = consegne
    .map((c) => ({ ...c, stato: statoConsegna(c) }))
    .filter((c) => {
      if (filtro !== 'Tutte' && c.stato.testo !== filtro) return false
      if (!q) return true
      return [c.dipendente, nomeDpi(c.dpiId), c.taglia].filter(Boolean).some((v) =>
        v.toLowerCase().includes(q),
      )
    })
    .sort((a, b) => (a.scadenza || '').localeCompare(b.scadenza || ''))

  const conteggi = consegne.reduce(
    (acc, c) => {
      const s = statoConsegna(c).testo
      if (s === 'Scaduto') acc.scaduti += 1
      else if (s === 'In scadenza') acc.inScadenza += 1
      else acc.validi += 1
      return acc
    },
    { scaduti: 0, inScadenza: 0, validi: 0 },
  )

  return (
    <>
      <h1 className="page-title">Anagrafica DPI</h1>
      <p className="page-subtitle">
        Dispositivi di protezione individuale: catalogo, consegne al personale e scadenze.
      </p>

      <div className="stat-grid scheda-stat">
        <div className="stat-card">
          <span className="stat-value">{catalogo.length}</span>
          <span className="stat-label">Dispositivi a catalogo</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-verde">{conteggi.validi}</span>
          <span className="stat-label">Consegne valide</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-ambra">{conteggi.inScadenza}</span>
          <span className="stat-label">In scadenza (30 gg)</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-rosso">{conteggi.scaduti}</span>
          <span className="stat-label">Scaduti</span>
        </div>
      </div>

      <form className="job-form nuovo-lavoro-form" onSubmit={registraConsegna}>
        <label className="job-form-label">Consegna a un dipendente</label>
        <div className="dpi-riga-form">
          <div className="dpi-campo">
            <label className="job-form-label">Dispositivo</label>
            <select
              value={formConsegna.dpiId}
              onChange={(e) => setFormConsegna({ ...formConsegna, dpiId: e.target.value })}
            >
              <option value="">— scegli —</option>
              {catalogo.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="dpi-campo">
            <label className="job-form-label">Dipendente</label>
            <select
              value={formConsegna.dipendente}
              onChange={(e) => setFormConsegna({ ...formConsegna, dipendente: e.target.value })}
            >
              <option value="">— scegli —</option>
              {dipendenti.map((d) => (
                <option key={d.id} value={d.nome}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="dpi-campo dpi-campo-stretto">
            <label className="job-form-label">Taglia</label>
            <input
              type="text"
              placeholder="Es. 43, L"
              value={formConsegna.taglia}
              onChange={(e) => setFormConsegna({ ...formConsegna, taglia: e.target.value })}
            />
          </div>
          <div className="dpi-campo">
            <label className="job-form-label">Data consegna</label>
            <input
              type="date"
              value={formConsegna.dataConsegna}
              onChange={(e) => setFormConsegna({ ...formConsegna, dataConsegna: e.target.value })}
            />
          </div>
          <button type="submit">Registra consegna</button>
        </div>
      </form>

      <div className="card sezione">
        <div className="lista-head">
          <span className="job-list-label">Consegne ({consegneFiltrate.length})</span>
          <div className="upload-riga">
            <select className="campo-ricerca" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
              <option>Tutte</option>
              <option>Valido</option>
              <option>In scadenza</option>
              <option>Scaduto</option>
            </select>
            <input
              type="search"
              className="campo-ricerca"
              placeholder="Cerca dipendente o DPI..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
            />
          </div>
        </div>

        {consegneFiltrate.length === 0 ? (
          <p className="job-list-empty">Nessuna consegna registrata.</p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Dispositivo</th>
                <th>Taglia</th>
                <th>Consegna</th>
                <th>Scadenza</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {consegneFiltrate.map((c) => (
                <tr key={c.id}>
                  <td className="cliente-nome-link">{c.dipendente}</td>
                  <td>{nomeDpi(c.dpiId)}</td>
                  <td>{c.taglia || '—'}</td>
                  <td>{formattaData(c.dataConsegna)}</td>
                  <td>
                    {formattaData(c.scadenza)}
                    {c.stato.giorni != null && c.stato.testo !== 'Valido' && (
                      <span className="riga-sub">
                        {c.stato.giorni < 0
                          ? `da ${Math.abs(c.stato.giorni)} giorni`
                          : `fra ${c.stato.giorni} giorni`}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={'badge ' + c.stato.classe}>{c.stato.testo}</span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={() => eliminaConsegna(c)}
                      aria-label="Elimina consegna"
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

      <form className="job-form nuovo-lavoro-form" onSubmit={aggiungiDpi}>
        <label className="job-form-label">Nuovo dispositivo a catalogo</label>
        <div className="dpi-riga-form">
          <div className="dpi-campo">
            <label className="job-form-label">Denominazione</label>
            <input
              type="text"
              placeholder="Es. Occhiali di protezione"
              value={formDpi.nome}
              onChange={(e) => setFormDpi({ ...formDpi, nome: e.target.value })}
            />
          </div>
          <div className="dpi-campo">
            <label className="job-form-label">Categoria</label>
            <select
              value={formDpi.categoria}
              onChange={(e) => setFormDpi({ ...formDpi, categoria: e.target.value })}
            >
              {CATEGORIE_DPI.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="dpi-campo dpi-campo-stretto">
            <label className="job-form-label">Norma</label>
            <input
              type="text"
              placeholder="EN ..."
              value={formDpi.norma}
              onChange={(e) => setFormDpi({ ...formDpi, norma: e.target.value })}
            />
          </div>
          <div className="dpi-campo dpi-campo-stretto">
            <label className="job-form-label">Validità (mesi)</label>
            <input
              type="number"
              min="0"
              value={formDpi.durataMesi}
              onChange={(e) => setFormDpi({ ...formDpi, durataMesi: e.target.value })}
            />
          </div>
          <button type="submit">Aggiungi</button>
        </div>
      </form>

      <div className="card sezione">
        <span className="job-list-label">Catalogo DPI ({catalogo.length})</span>
        <table className="task-table">
          <thead>
            <tr>
              <th>Dispositivo</th>
              <th>Categoria</th>
              <th>Norma</th>
              <th>Validità</th>
              <th>In uso</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {catalogo.map((d) => (
              <tr key={d.id}>
                <td className="cliente-nome-link">{d.nome}</td>
                <td>
                  <span className="badge badge-in-corso">{d.categoria}</span>
                </td>
                <td>{d.norma || '—'}</td>
                <td>{d.durataMesi ? `${d.durataMesi} mesi` : '—'}</td>
                <td>{consegne.filter((c) => c.dpiId === d.id).length}</td>
                <td>
                  <button
                    type="button"
                    className="riga-elimina"
                    onClick={() => eliminaDpi(d)}
                    aria-label="Elimina dispositivo"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dialogo}
    </>
  )
}
