import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  caricaLavori,
  aggiornaLavoro,
  eliminaLavoro,
  formattaEuro,
  minutiDaOrario,
  orarioDaMinuti,
} from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import { SQUADRE_BASE } from '../data/squadre'
import { caricaFatture, economiaLavoro } from '../data/fatture'
import { caricaPagamenti } from '../data/pagamenti'
import { caricaEconomia } from '../data/impostazioni'
import { FASI, PROSSIMA_AZIONE, faseLavoro } from '../data/statoLavoro'
import InputIndirizzo from '../components/InputIndirizzo'
import EconomiaLavoro from '../components/EconomiaLavoro'
import { Riepilogo } from '../components/Database'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Lavori.css'

// i lavori salvati prima usavano l'ora piena, ora si conservano i minuti
function orarioAssegnato(assegnato) {
  const minuti = assegnato.minuti ?? assegnato.ora * 60
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function formattaData(iso) {
  return iso ? new Date(iso).toLocaleDateString('it-IT') : '—'
}

function vaiA(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Il pulsante che porta al passo successivo del lavoro.
function AzioneFase({ fase, idLavoro }) {
  switch (fase.id) {
    case 'da-pianificare':
    case 'pianificato':
      return (
        <Link to="/assegnazione-lavori" className="db-btn">
          Apri Assegnazione
        </Link>
      )
    case 'eseguito':
    case 'da-validare':
      return (
        <Link to={`/consuntivazione?lavoro=${idLavoro}`} className="db-btn">
          Apri il rapportino
        </Link>
      )
    case 'da-fatturare':
      return (
        <button type="button" className="db-btn" onClick={() => vaiA('economia')}>
          Emetti fattura
        </button>
      )
    case 'da-incassare':
      return (
        <button type="button" className="db-btn" onClick={() => vaiA('economia')}>
          Registra incasso
        </button>
      )
    default:
      return null
  }
}

export default function SchedaLavoro() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [lavori, setLavori] = useState([])
  const [clienti, setClienti] = useState([])
  const [fatture, setFatture] = useState([])
  const [pagamenti, setPagamenti] = useState({})
  const [costoOrario, setCostoOrario] = useState(0)
  const [materiale, setMateriale] = useState('')
  const [salvato, setSalvato] = useState(false)
  const [caricamento, setCaricamento] = useState(true)
  // spostamento dell'appuntamento: nuova data, nuova ora e causale
  const [spostamento, setSpostamento] = useState(null)
  const { chiedi, dialogo } = useConferma()

  useEffect(() => {
    Promise.all([
      caricaLavori(),
      caricaClienti(),
      caricaFatture(),
      caricaPagamenti(),
      caricaEconomia(),
    ]).then(([l, c, f, p, eco]) => {
      setLavori(l)
      setClienti(c)
      setFatture(f)
      setPagamenti(p)
      setCostoOrario(eco.costoOrario)
      setCaricamento(false)
    })
  }, [])

  async function ricaricaSoldi() {
    const [f, p] = await Promise.all([caricaFatture(), caricaPagamenti()])
    setFatture(f)
    setPagamenti(p)
  }

  const lavoro = lavori.find((l) => l.id === id)

  function aggiorna(patch) {
    setLavori((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    aggiornaLavoro(id, patch)
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
      messaggio: `"${lavoro.titolo}" verrà rimosso definitivamente, con pianificazione, rapportino, fatture e incassi.`,
      onConferma: async () => {
        await eliminaLavoro(id)
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

  if (caricamento) return <p className="page-subtitle">Caricamento…</p>

  if (!lavoro) {
    return (
      <>
        <h1 className="page-title">Lavoro non trovato</h1>
        <p className="page-subtitle">
          <Link to="/lavori">Torna ai lavori</Link>
        </p>
      </>
    )
  }

  const cliente = clienti.find((c) => c.id === lavoro.clienteId)
  const squadra = lavoro.assegnato?.teamId
    ? SQUADRE_BASE.find((s) => s.id === lavoro.assegnato.teamId)
    : null
  const economia = economiaLavoro(lavoro, fatture, pagamenti, costoOrario)
  const fase = faseLavoro(lavoro, economia)
  const c = lavoro.consuntivo

  const pianificazione =
    squadra && lavoro.assegnato?.data
      ? `${squadra.nome} · ${new Date(lavoro.assegnato.data).toLocaleDateString('it-IT', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })} alle ${orarioAssegnato(lavoro.assegnato)}`
      : 'non ancora pianificato'

  const tonoMargine =
    economia.marginePct == null
      ? undefined
      : economia.margine < 0
        ? 'rosso'
        : economia.marginePct < 20
          ? 'ambra'
          : 'verde'

  return (
    <>
      <div className="pagina-head">
        <div>
          <h1 className="page-title">{lavoro.titolo}</h1>
          <p className="page-subtitle">
            {cliente ? cliente.nome : 'Senza cliente'} · {pianificazione}
            {salvato && <span className="salvato-tag">Modifiche salvate</span>}
          </p>
        </div>
        <div className="azioni-scheda">
          <Link to="/lavori" className="vai-assegnazione">
            ← Tutti i lavori
          </Link>
          <Link to="/assegnazione-lavori" className="vai-assegnazione">
            Assegnazione Lavori →
          </Link>
        </div>
      </div>

      <div className="card percorso-card">
        <ol className="percorso">
          {FASI.map((f, i) => (
            <li
              key={f.id}
              className={
                'passo ' +
                (i < fase.ordine ? 'passo-fatto' : i === fase.ordine ? 'passo-attuale' : 'passo-futuro')
              }
            >
              <span className="passo-pallino">{i < fase.ordine ? '✓' : i + 1}</span>
              <span className="passo-nome">{f.titolo}</span>
            </li>
          ))}
        </ol>
        <div className="percorso-azione">
          <span>
            <strong>{fase.titolo}</strong>
            {fase.dettaglio && (
              <span className={fase.avviso ? 'db-rosso' : 'db-muto'}> · {fase.dettaglio}</span>
            )}{' '}
            — {PROSSIMA_AZIONE[fase.id]}
          </span>
          <AzioneFase fase={fase} idLavoro={lavoro.id} />
        </div>
      </div>

      <Riepilogo
        voci={[
          { valore: formattaEuro(economia.importo), etichetta: 'Importo concordato', nota: 'IVA esclusa' },
          {
            valore: formattaEuro(economia.fatturato),
            etichetta: 'Fatturato',
            nota: economia.daFatturare > 0 ? `da fatturare ${formattaEuro(economia.daFatturare)}` : null,
          },
          {
            valore: formattaEuro(economia.incassato),
            etichetta: 'Incassato',
            tono: 'verde',
            nota:
              economia.daIncassare > 0
                ? `da incassare ${formattaEuro(economia.daIncassare)}`
                : null,
          },
          {
            valore: formattaEuro(economia.margine),
            etichetta: economia.stimata ? 'Margine stimato' : 'Margine',
            tono: tonoMargine,
            nota:
              economia.marginePct != null
                ? `${economia.marginePct}% · costi ${formattaEuro(economia.costi)}`
                : null,
          },
        ]}
      />

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

      <form className="job-form nuovo-lavoro-form" onSubmit={(e) => e.preventDefault()}>
        <label className="job-form-label">Dati del lavoro</label>
        <div className="form-griglia">
          <div className="form-colonna">
            <label className="job-form-label">Cliente</label>
            <select
              value={lavoro.clienteId || ''}
              onChange={(e) => aggiorna({ clienteId: e.target.value })}
            >
              <option value="">— nessun cliente —</option>
              {clienti.map((cl) => (
                <option key={cl.id} value={cl.id}>
                  {cl.nome}
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
            <label className="job-form-label">Materiali previsti</label>
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

            <label className="job-form-label">Importo concordato (€, IVA esclusa)</label>
            <input
              type="number"
              min="0"
              step="10"
              value={lavoro.importo || 0}
              onChange={(e) => aggiorna({ importo: Number(e.target.value) || 0 })}
            />

            {lavoro.chiuso ? (
              <p className="gps-stato gps-ok">
                Lavoro chiuso il {formattaData(lavoro.validatoIl)}. Per riaprirlo usa
                Consuntivazione.
              </p>
            ) : (
              lavoro.assegnato && (
                <button
                  type="button"
                  className="gps-btn"
                  onClick={() => aggiorna({ assegnato: null })}
                >
                  Rimuovi dalla pianificazione
                </button>
              )
            )}
          </div>
        </div>

        <button type="button" className="btn-elimina" onClick={elimina}>
          Elimina lavoro
        </button>
      </form>

      {c && (
        <div className="card sezione">
          <div className="lista-head">
            <span className="job-list-label">Rapportino della squadra</span>
            <Link to={`/consuntivazione?lavoro=${lavoro.id}`} className="vai-assegnazione">
              {lavoro.chiuso ? 'Vedi in Consuntivazione →' : 'Valida in Consuntivazione →'}
            </Link>
          </div>
          <div className="rapportino-griglia">
            <div>
              <span className="dato-label">Eseguito da</span>
              <span className="dato-valore">{c.compilatoDa || '—'}</span>
            </div>
            <div>
              <span className="dato-label">Ore</span>
              <span className="dato-valore">
                {c.oreEffettive} h effettive · {lavoro.durata} h previste
              </span>
            </div>
            <div>
              <span className="dato-label">Materiali usati</span>
              <span className="dato-valore">{(c.materialiUsati || []).join(', ') || '—'}</span>
            </div>
            <div>
              <span className="dato-label">Note dell'operaio</span>
              <span className="dato-valore">{c.noteOperaio || '—'}</span>
            </div>
          </div>
          <p className={'gps-stato' + (c.rifiutato ? ' db-rosso' : '')}>
            {lavoro.chiuso
              ? `Validato il ${formattaData(lavoro.validatoIl)}.`
              : c.rifiutato
                ? `Rimandato all'operaio: ${c.motivoRifiuto}`
                : `Inviato il ${formattaData(c.compilatoIl)}, in attesa di validazione.`}
          </p>
        </div>
      )}

      <div className="card sezione" id="economia">
        <span className="job-list-label">Parte economica</span>
        <EconomiaLavoro
          lavoro={lavoro}
          fatture={fatture}
          pagamenti={pagamenti}
          costoOrario={costoOrario}
          onCambiato={ricaricaSoldi}
          onAggiornaLavoro={aggiorna}
        />
      </div>

      {dialogo}
    </>
  )
}
