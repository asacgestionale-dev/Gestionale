import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { SQUADRE_BASE, oggiISO, caricaComposizione } from '../data/squadre'
import { caricaLavori, aggiornaLavoro } from '../data/lavori'
import { BASE, MINUTI_SOSTA, tragittoPerLavoro, formattaTragitto } from '../data/logistica'
import './AssegnazioneLavori.css'
import './NuovoLavoro.css'

const ORA_INIZIO = 7
const ORA_FINE = 20
const ORE = Array.from({ length: ORA_FINE - ORA_INIZIO }, (_, i) => ORA_INIZIO + i)

const MIN_INIZIO = ORA_INIZIO * 60
const MIN_FINE = ORA_FINE * 60
const MIN_TOTALI = MIN_FINE - MIN_INIZIO
const PASSO = 30 // i blocchi si posizionano a scatti di mezz'ora

// I lavori salvati prima usavano l'ora piena: qui si normalizza tutto in minuti.
function minutiInizio(assegnato) {
  if (!assegnato) return null
  return assegnato.minuti ?? assegnato.ora * 60
}

function formattaOrario(minuti) {
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function percento(minuti) {
  return ((minuti - MIN_INIZIO) / MIN_TOTALI) * 100
}

function sovrapposti(inizioA, durA, inizioB, durB) {
  return inizioA < inizioB + durB && inizioB < inizioA + durA
}

function trovaSlotLibero(occupati, durata) {
  for (let m = MIN_INIZIO; m + durata <= MIN_FINE; m += PASSO) {
    const libero = !occupati.some((o) => sovrapposti(o.inizio, o.durata, m, durata))
    if (libero) return m
  }
  return null
}

// Posizione del cursore convertita in minuti, arrotondata al passo di 10.
function minutiDaEvento(e) {
  const rect = e.currentTarget.getBoundingClientRect()
  const frazione = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
  const grezzi = MIN_INIZIO + frazione * MIN_TOTALI
  return Math.round(grezzi / PASSO) * PASSO
}

export default function AssegnazioneLavori() {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [data, setData] = useState(oggiISO)
  const [composizione, setComposizione] = useState({})

  useEffect(() => {
    caricaLavori().then(setJobs)
  }, [])

  // composizione delle squadre della giornata mostrata
  useEffect(() => {
    caricaComposizione(data).then(setComposizione)
  }, [data])

  const TEAMS = SQUADRE_BASE.map((s) => ({ ...s, membri: composizione[s.id] || [] }))

  // i lavori pianificati senza squadra restano in una riga a parte
  const RIGA_SENZA_SQUADRA = { id: null, nome: 'Da assegnare a squadra', membri: [] }
  const RIGHE = [...TEAMS, RIGA_SENZA_SQUADRA]

  // un lavoro appartiene alla giornata mostrata; quelli salvati senza data restano su oggi
  function nellaGiornata(j) {
    if (!j.assegnato) return false
    return (j.assegnato.data || oggiISO()) === data
  }

  function spostaGiorno(passo) {
    const d = new Date(data)
    d.setDate(d.getDate() + passo)
    setData(d.toISOString().slice(0, 10))
  }

  // distanza e tempo di viaggio dalla base, per ogni lavoro con un luogo indicato
  const [tragitti, setTragitti] = useState({})

  // si salvano solo i lavori la cui pianificazione è cambiata, non tutto l'elenco
  const assegnazioniPrecedenti = useRef(null)

  useEffect(() => {
    const attuali = Object.fromEntries(jobs.map((j) => [j.id, j.assegnato]))
    const prima = assegnazioniPrecedenti.current

    if (prima) {
      for (const [id, assegnato] of Object.entries(attuali)) {
        if (JSON.stringify(prima[id]) !== JSON.stringify(assegnato)) {
          aggiornaLavoro(id, { assegnato })
        }
      }
    }
    assegnazioniPrecedenti.current = attuali
  }, [jobs])

  // il calcolo si rifà quando cambia una assegnazione: la catena dei tragitti dipende
  // dall'ordine dei lavori dentro ogni squadra
  const firmaAssegnazioni =
    data +
    '#' +
    jobs
      .map(
        (j) =>
          `${j.id}:${j.assegnato ? j.assegnato.teamId + '@' + minutiInizio(j.assegnato) + '@' + (j.assegnato.data || '') : '-'}`,
      )
      .join('|')

  useEffect(() => {
    let annullato = false

    async function calcola() {
      const risultati = {}

      // lavori non assegnati: sempre come partenza dalla base
      for (const j of jobs.filter((x) => !x.assegnato)) {
        risultati[j.id] = await tragittoPerLavoro(j)
        if (annullato) return
      }

      // per ogni riga i lavori si susseguono: dal secondo si parte dal cantiere precedente
      for (const riga of [...SQUADRE_BASE, RIGA_SENZA_SQUADRA]) {
        const dellaSquadra = jobs
          .filter((j) => j.assegnato && j.assegnato.teamId === riga.id && nellaGiornata(j))
          .sort((a, b) => minutiInizio(a.assegnato) - minutiInizio(b.assegnato))

        // i lavori senza luogo non spezzano la catena: si parte dall'ultimo cantiere noto
        let ultimoConLuogo = null
        for (const lavoro of dellaSquadra) {
          risultati[lavoro.id] = await tragittoPerLavoro(lavoro, ultimoConLuogo)
          if (annullato) return
          if (lavoro.posizione || lavoro.indirizzo) ultimoConLuogo = lavoro
        }
      }

      setTragitti(risultati)
    }

    calcola()
    return () => {
      annullato = true
    }
  }, [firmaAssegnazioni, jobs])

  const nonAssegnati = jobs.filter((j) => !j.assegnato)

  function handleDragStart(e, jobId) {
    e.dataTransfer.setData('text/plain', jobId)
  }

  function handleDropSuSquadra(e, teamId, minuti) {
    e.preventDefault()
    const jobId = e.dataTransfer.getData('text/plain')

    setJobs((prev) => {
      const trascinato = prev.find((j) => j.id === jobId)
      if (!trascinato) return prev

      const durataMin = trascinato.durata * 60
      // un appuntamento tiene fisso l'orario: si può solo cambiare squadra,
      // per spostarlo davvero si passa dalla scheda del lavoro indicando la causa
      const inizio = trascinato.appuntamento
        ? minutiInizio(trascinato.assegnato)
        : Math.min(minuti, MIN_FINE - durataMin)
      const nuovoRange = { inizio, durata: durataMin }

      const conflitti = prev.filter(
        (j) =>
          j.id !== jobId &&
          j.assegnato &&
          j.assegnato.teamId === teamId &&
          nellaGiornata(j) &&
          sovrapposti(minutiInizio(j.assegnato), j.durata * 60, inizio, durataMin),
      )

      const occupati = prev
        .filter(
          (j) =>
            j.id !== jobId &&
            j.assegnato &&
            j.assegnato.teamId === teamId &&
            nellaGiornata(j) &&
            !conflitti.includes(j),
        )
        .map((j) => ({ inizio: minutiInizio(j.assegnato), durata: j.durata * 60 }))
      occupati.push(nuovoRange)

      // i lavori spostati cercano il primo slot libero della riga, senza essere sovrascritti;
      // quelli con appuntamento non si muovono mai da soli
      const nuoviAssegnamenti = {}
      for (const c of conflitti) {
        if (c.appuntamento) continue
        const slotLibero = trovaSlotLibero(occupati, c.durata * 60)
        if (slotLibero !== null) {
          occupati.push({ inizio: slotLibero, durata: c.durata * 60 })
          nuoviAssegnamenti[c.id] = { teamId, minuti: slotLibero, data }
        } else {
          nuoviAssegnamenti[c.id] = null
        }
      }

      return prev.map((j) => {
        if (j.id === jobId) {
          // per un appuntamento resta ferma anche la giornata
          const giorno = j.appuntamento ? j.assegnato?.data || data : data
          return { ...j, assegnato: { teamId, minuti: inizio, data: giorno } }
        }
        if (j.id in nuoviAssegnamenti) return { ...j, assegnato: nuoviAssegnamenti[j.id] }
        return j
      })
    })
  }

  function handleDropSuPannello(e) {
    e.preventDefault()
    const jobId = e.dataTransfer.getData('text/plain')
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, assegnato: null } : j)))
  }

  function rimettiTraDaAssegnare(jobId) {
    setJobs((prev) => prev.map((j) => (j.id === jobId ? { ...j, assegnato: null } : j)))
  }

  return (
    <>
      <h1 className="page-title">Assegnazione Lavori</h1>
      <p className="page-subtitle">
        Trascina un lavoro sulla timeline (07:00 – 20:00, passi da mezz'ora) · In giallo il
        viaggio: il primo lavoro parte da {BASE.indirizzo}, i successivi dal cantiere precedente
        (+{MINUTI_SOSTA} min)
      </p>

      <div className="squadre-date-row">
        <label htmlFor="assegna-data">Giornata</label>
        <button
          type="button"
          className="nav-giorno"
          onClick={() => spostaGiorno(-1)}
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <input
          id="assegna-data"
          type="date"
          value={data}
          onChange={(e) => setData(e.target.value)}
        />
        <button
          type="button"
          className="nav-giorno"
          onClick={() => spostaGiorno(1)}
          aria-label="Giorno successivo"
        >
          ›
        </button>
        <button
          type="button"
          className="btn-oggi"
          onClick={() => setData(oggiISO())}
          disabled={data === oggiISO()}
        >
          Oggi
        </button>
        <span className="etichetta-giorno">
          {new Date(data).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
      </div>

      <div className="assign-layout">
        <aside className="job-panel">
          <div
            className="job-list"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropSuPannello}
          >
            <span className="job-list-label">Da assegnare ({nonAssegnati.length})</span>
            <Link to="/nuovo-lavoro" className="vai-assegnazione">
              + Nuovo lavoro
            </Link>
            {nonAssegnati.length === 0 && (
              <p className="job-list-empty">Nessun lavoro in attesa.</p>
            )}
            {nonAssegnati.map((j) => (
              <div
                key={j.id}
                className={'job-card job-' + j.colore}
                draggable
                onDragStart={(e) => handleDragStart(e, j.id)}
                onDoubleClick={() => navigate('/lavori/' + j.id)}
                title="Doppio click per aprire la scheda del lavoro"
              >
                <div className="job-card-riga">
                  <span>{j.titolo}</span>
                  <span className="job-card-durata">{j.durata}h</span>
                </div>
                {tragitti[j.id] && (
                  <span className="job-card-tragitto">⤳ {formattaTragitto(tragitti[j.id])}</span>
                )}
              </div>
            ))}
          </div>
        </aside>

        <div className="timeline-wrap">
          <div className="timeline-header">
            <div className="team-info-spacer" />
            <div className="timeline-hours">
              {ORE.map((h) => (
                <div key={h} className="hour-label">
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>
          </div>

          {RIGHE.map((team) => {
            const jobsSquadra = jobs.filter(
              (j) => j.assegnato && j.assegnato.teamId === team.id && nellaGiornata(j),
            )
            const senzaSquadra = team.id === null
            return (
              <div
                className={'team-row' + (senzaSquadra ? ' team-row-libera' : '')}
                key={team.id || 'libera'}
              >
                <div className="team-info">
                  <span className="team-name">{team.nome}</span>
                  <span className="team-members">
                    {senzaSquadra
                      ? 'Trascina su una squadra quando è pronta'
                      : team.membri.length
                        ? team.membri.join(', ')
                        : 'Nessuno assegnato'}
                  </span>
                </div>
                <div
                  className="team-timeline"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDropSuSquadra(e, team.id, minutiDaEvento(e))}
                >
                  {ORE.map((h) => (
                    <div
                      key={h}
                      className="timeline-cell"
                      style={{ left: percento(h * 60) + '%', width: (60 / MIN_TOTALI) * 100 + '%' }}
                    />
                  ))}

                  {jobsSquadra.map((j) => {
                    const inizio = minutiInizio(j.assegnato)
                    const durataMin = j.durata * 60
                    const viaggio = tragitti[j.id]?.minuti || 0
                    // la fascia gialla è il viaggio di andata: si ferma all'inizio del lavoro
                    const partenza = Math.max(MIN_INIZIO, inizio - viaggio)
                    return (
                      <div key={j.id}>
                        {viaggio > 0 && (
                          <div
                            className="timeline-viaggio"
                            style={{
                              left: percento(partenza) + '%',
                              width: ((inizio - partenza) / MIN_TOTALI) * 100 + '%',
                            }}
                            data-tooltip={
                              (tragitti[j.id].daLavoro
                                ? `Da "${tragitti[j.id].daLavoro}" (+${MINUTI_SOSTA} min di sosta) — `
                                : 'Dalla base — ') +
                              `partenza ore ${formattaOrario(partenza)} — ` +
                              `${viaggio} min di viaggio (${Math.round(tragitti[j.id].km)} km) — ` +
                              `arrivo ore ${formattaOrario(inizio)}`
                            }
                          />
                        )}
                        <div
                          className={
                            'timeline-job job-' +
                            j.colore +
                            (j.appuntamento ? ' timeline-job-fisso' : '')
                          }
                          draggable
                          onDragStart={(e) => handleDragStart(e, j.id)}
                          onDoubleClick={() => navigate('/lavori/' + j.id)}
                          style={{
                            left: percento(inizio) + '%',
                            width: (durataMin / MIN_TOTALI) * 100 + '%',
                          }}
                          title={
                            `${j.titolo} — ${formattaOrario(inizio)}–${formattaOrario(inizio + durataMin)}` +
                            (tragitti[j.id]
                              ? `\nViaggio: ${formattaTragitto(tragitti[j.id])} (partenza ${formattaOrario(partenza)})`
                              : '') +
                            (j.indirizzo ? `\n${j.indirizzo}` : '') +
                            '\nDoppio click per aprire la scheda'
                          }
                        >
                          {j.appuntamento && (
                            <span className="timeline-job-pin" title="Appuntamento fissato">
                              📌
                            </span>
                          )}
                          <span className="timeline-job-title">{j.titolo}</span>
                          <span className="timeline-job-ora">{formattaOrario(inizio)}</span>
                          <button
                            type="button"
                            className="timeline-job-remove"
                            onClick={() => rimettiTraDaAssegnare(j.id)}
                            aria-label="Rimuovi dalla timeline"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </>
  )
}
