import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  caricaLavori,
  salvaLavori,
  formattaEuro,
  minutiDaOrario,
  orarioDaMinuti,
} from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import { SQUADRE_BASE } from '../data/squadre'
import InputIndirizzo from '../components/InputIndirizzo'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'

// i lavori salvati prima usavano l'ora piena, ora si conservano i minuti
function orarioAssegnato(assegnato) {
  const minuti = assegnato.minuti ?? assegnato.ora * 60
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export default function SchedaLavoro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lavori, setLavori] = useState(caricaLavori)
  const [clienti] = useState(caricaClienti)
  const [materiale, setMateriale] = useState('')
  const [salvato, setSalvato] = useState(false)
  // spostamento dell'appuntamento: nuova data, nuova ora e causale
  const [spostamento, setSpostamento] = useState(null)
  const { chiedi, dialogo } = useConferma()

  const lavoro = lavori.find((l) => l.id === id)

  function aggiorna(patch) {
    const next = lavori.map((l) => (l.id === id ? { ...l, ...patch } : l))
    setLavori(next)
    salvaLavori(next)
    setSalvato(true)
  }

  function apriSpostamento() {
    setSpostamento({
      data: lavoro.assegnato?.data || new Date().toISOString().slice(0, 10),
      ora: orarioDaMinuti(lavoro.assegnato?.minuti ?? (lavoro.assegnato?.ora ?? 8) * 60),
      causa: '',
      errore: '',
    })
  }

  function confermaSpostamento() {
    if (!spostamento.causa.trim()) {
      setSpostamento({ ...spostamento, errore: 'Indica la causa dello spostamento.' })
      return
    }
    const precedente = {
      data: lavoro.assegnato?.data || null,
      minuti: lavoro.assegnato?.minuti ?? null,
    }
    aggiorna({
      assegnato: {
        ...(lavoro.assegnato || { teamId: null }),
        data: spostamento.data,
        minuti: minutiDaOrario(spostamento.ora),
      },
      spostamenti: [
        ...(lavoro.spostamenti || []),
        {
          da: precedente,
          a: { data: spostamento.data, minuti: minutiDaOrario(spostamento.ora) },
          causa: spostamento.causa.trim(),
          quando: new Date().toISOString(),
        },
      ],
    })
    setSpostamento(null)
  }

  function aggiungiMateriale(e) {
    e.preventDefault()
    if (!materiale.trim()) return
    aggiorna({ materiali: [...(lavoro.materiali || []), materiale.trim()] })
    setMateriale('')
  }

  function rimuoviMateriale(indice) {
    aggiorna({ materiali: lavoro.materiali.filter((_, i) => i !== indice) })
  }

  function elimina() {
    chiedi({
      titolo: 'Eliminare il lavoro?',
      messaggio: `"${lavoro.titolo}" verrà rimosso definitivamente, con la sua pianificazione e il consuntivo.`,
      onConferma: () => {
        salvaLavori(lavori.filter((l) => l.id !== id))
        navigate('/lavori')
      },
    })
  }

  function rilevaPosizione() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => aggiorna({ posizione: { lat: pos.coords.latitude, lon: pos.coords.longitude } }),
      () => {},
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  if (!lavoro) {
    return (
      <>
        <h1 className="page-title">Lavoro non trovato</h1>
        <p className="page-subtitle">
          <Link to="/lavori">Torna all'archivio lavori</Link>
        </p>
      </>
    )
  }

  const cliente = clienti.find((c) => c.id === lavoro.clienteId)
  const squadra = lavoro.assegnato
    ? SQUADRE_BASE.find((s) => s.id === lavoro.assegnato.teamId)
    : null
  const residuo = (lavoro.importo || 0) - (lavoro.incassato || 0)

  return (
    <>
      <div className="pagina-head">
        <div>
          <h1 className="page-title">{lavoro.titolo}</h1>
          <p className="page-subtitle">
            Scheda lavoro {cliente && `· ${cliente.nome}`}
            {salvato && <span className="salvato-tag">Modifiche salvate</span>}
          </p>
        </div>
        <div className="azioni-scheda">
          <Link to="/lavori" className="vai-assegnazione">
            ← Torna all'archivio
          </Link>
          <Link to="/assegnazione-lavori" className="vai-assegnazione">
            Assegnazione Lavori →
          </Link>
        </div>
      </div>

      {lavoro.appuntamento && (
        <div className="card appuntamento-scheda">
          <div className="lista-head">
            <div>
              <span className="job-list-label">📌 Appuntamento fissato</span>
              <p className="appuntamento-quando">
                {lavoro.assegnato?.data
                  ? new Date(lavoro.assegnato.data).toLocaleDateString('it-IT', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })
                  : 'data da definire'}
                {lavoro.assegnato?.minuti != null &&
                  ` alle ${orarioDaMinuti(lavoro.assegnato.minuti)}`}
                {' · '}Giorno e ora non si spostano trascinando il blocco in timeline.
              </p>
            </div>
            {!spostamento && (
              <button type="button" className="btn-sposta" onClick={apriSpostamento}>
                Sposta appuntamento
              </button>
            )}
          </div>

          {spostamento && (
            <div className="sposta-box">
              <div className="sposta-riga">
                <div className="sposta-campo">
                  <label className="job-form-label">Nuovo giorno</label>
                  <input
                    type="date"
                    value={spostamento.data}
                    onChange={(e) => setSpostamento({ ...spostamento, data: e.target.value })}
                  />
                </div>
                <div className="sposta-campo">
                  <label className="job-form-label">Nuova ora</label>
                  <input
                    type="time"
                    step="1800"
                    value={spostamento.ora}
                    onChange={(e) => setSpostamento({ ...spostamento, ora: e.target.value })}
                  />
                </div>
                <div className="sposta-campo sposta-causa">
                  <label className="job-form-label">Causa dello spostamento</label>
                  <input
                    type="text"
                    placeholder="Es. cliente non disponibile, maltempo, mezzo guasto"
                    value={spostamento.causa}
                    onChange={(e) =>
                      setSpostamento({ ...spostamento, causa: e.target.value, errore: '' })
                    }
                  />
                </div>
              </div>
              {spostamento.errore && <p className="messaggio-errore">{spostamento.errore}</p>}
              <div className="sposta-azioni">
                <button type="button" className="btn-sposta" onClick={confermaSpostamento}>
                  Conferma spostamento
                </button>
                <button
                  type="button"
                  className="btn-annulla-sposta"
                  onClick={() => setSpostamento(null)}
                >
                  Annulla
                </button>
              </div>
            </div>
          )}

          {lavoro.spostamenti?.length > 0 && (
            <div className="storico-spostamenti">
              <span className="job-list-label">Spostamenti ({lavoro.spostamenti.length})</span>
              <ul>
                {[...lavoro.spostamenti].reverse().map((s, i) => (
                  <li key={i}>
                    <strong>
                      {s.da.data ? new Date(s.da.data).toLocaleDateString('it-IT') : '—'}
                      {s.da.minuti != null && ' ' + orarioDaMinuti(s.da.minuti)} →{' '}
                      {new Date(s.a.data).toLocaleDateString('it-IT')} {orarioDaMinuti(s.a.minuti)}
                    </strong>
                    <span className="spostamento-causa">{s.causa}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="stat-grid scheda-stat">
        <div className="stat-card">
          <span className="stat-value">{formattaEuro(lavoro.importo)}</span>
          <span className="stat-label">Importo</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-verde">{formattaEuro(lavoro.incassato)}</span>
          <span className="stat-label">Incassato</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-rosso">{formattaEuro(residuo)}</span>
          <span className="stat-label">Da incassare</span>
        </div>
        <div className="stat-card">
          <span className="stat-value">
            {squadra
              ? orarioAssegnato(lavoro.assegnato)
              : lavoro.completato
                ? 'Svolto'
                : '—'}
          </span>
          <span className="stat-label">{squadra ? squadra.nome : 'Non assegnato'}</span>
        </div>
      </div>

      <form className="job-form nuovo-lavoro-form" onSubmit={(e) => e.preventDefault()}>
        <div className="form-griglia">
          <div className="form-colonna">
            <label className="job-form-label">Cliente</label>
            <select
              value={lavoro.clienteId || ''}
              onChange={(e) => aggiorna({ clienteId: e.target.value })}
            >
              <option value="">— nessun cliente —</option>
              {clienti.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nome}
                </option>
              ))}
            </select>

            <label className="job-form-label">Titolo</label>
            <input
              type="text"
              value={lavoro.titolo}
              onChange={(e) => aggiorna({ titolo: e.target.value })}
            />

            <label className="job-form-label">Note</label>
            <textarea
              rows={6}
              placeholder="Cosa bisogna fare"
              value={lavoro.note || ''}
              onChange={(e) => aggiorna({ note: e.target.value })}
            />

            <label className="job-form-label">Durata</label>
            <select
              value={lavoro.durata}
              onChange={(e) => aggiorna({ durata: Number(e.target.value) })}
            >
              <option value={1}>1 ora</option>
              <option value={2}>2 ore</option>
              <option value={3}>3 ore</option>
              <option value={4}>4 ore</option>
              <option value={6}>6 ore</option>
            </select>
          </div>

          <div className="form-colonna">
            <label className="job-form-label">Materiali</label>
            <div className="materiale-riga">
              <input
                type="text"
                placeholder="Aggiungi materiale"
                value={materiale}
                onChange={(e) => setMateriale(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && aggiungiMateriale(e)}
              />
              <button type="button" className="materiale-add" onClick={aggiungiMateriale}>
                +
              </button>
            </div>
            {lavoro.materiali?.length > 0 && (
              <ul className="materiale-lista">
                {lavoro.materiali.map((m, i) => (
                  <li key={m + i}>
                    <span>{m}</span>
                    <button type="button" onClick={() => rimuoviMateriale(i)} aria-label="Rimuovi">
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <label className="job-form-label">Luogo dell'intervento</label>
            <InputIndirizzo
              placeholder="Indirizzo intervento"
              value={lavoro.indirizzo || ''}
              onChange={(v) => aggiorna({ indirizzo: v })}
              onSelezione={(punto, etichetta, automatica) =>
                aggiorna(automatica ? { posizione: punto } : { indirizzo: etichetta, posizione: punto })
              }
              posizione={lavoro.posizione}
            />
            <button type="button" className="gps-btn" onClick={rilevaPosizione}>
              {lavoro.posizione ? 'Aggiorna geolocalizzazione' : 'Geolocalizza il luogo del lavoro'}
            </button>
            {lavoro.posizione && (
              <a
                className="gps-stato gps-ok"
                href={`https://www.google.com/maps?q=${lavoro.posizione.lat},${lavoro.posizione.lon}`}
                target="_blank"
                rel="noreferrer"
              >
                {lavoro.posizione.lat.toFixed(5)}, {lavoro.posizione.lon.toFixed(5)} — apri su mappa
              </a>
            )}

            <label className="job-form-label">Importo concordato (€)</label>
            <input
              type="number"
              min="0"
              step="10"
              value={lavoro.importo || 0}
              onChange={(e) => aggiorna({ importo: Number(e.target.value) || 0 })}
            />

            <label className="job-form-label">Incassato (€)</label>
            <input
              type="number"
              min="0"
              step="10"
              value={lavoro.incassato || 0}
              onChange={(e) => aggiorna({ incassato: Number(e.target.value) || 0 })}
            />

            <label className="job-form-label">Stato</label>
            <label className="check-riga">
              <input
                type="checkbox"
                checked={!!lavoro.completato}
                onChange={(e) => aggiorna({ completato: e.target.checked })}
              />
              Lavoro svolto
            </label>
            {lavoro.assegnato && (
              <button
                type="button"
                className="gps-btn"
                onClick={() => aggiorna({ assegnato: null })}
              >
                Rimuovi dalla pianificazione
              </button>
            )}
          </div>
        </div>

        <button type="button" className="btn-elimina" onClick={elimina}>
          Elimina lavoro
        </button>
      </form>

      {dialogo}
    </>
  )
}
