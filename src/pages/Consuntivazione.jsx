import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { caricaLavori, aggiornaLavoro, formattaEuro } from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import { SQUADRE_BASE, oggiISO, caricaComposizione } from '../data/squadre'
import {
  STATI_CONSUNTIVO,
  statoConsuntivo,
  daConsuntivare,
  consuntivoVuoto,
  verificheConsuntivo,
  bloccanti,
} from '../data/consuntivi'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Consuntivazione.css'

const CLASSE_STATO = {
  [STATI_CONSUNTIVO.DA_CONSUNTIVARE]: 'badge-da-fare',
  [STATI_CONSUNTIVO.DA_VALIDARE]: 'badge-in-corso',
  [STATI_CONSUNTIVO.DA_CORREGGERE]: 'badge-malattia',
  [STATI_CONSUNTIVO.CHIUSO]: 'badge-completato',
}

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

export default function Consuntivazione() {
  const navigate = useNavigate()
  const [lavori, setLavori] = useState([])
  const [clienti, setClienti] = useState([])
  const [composizioni, setComposizioni] = useState({})
  const [apertoId, setApertoId] = useState(null)
  const [filtro, setFiltro] = useState('Aperti')
  const [materiale, setMateriale] = useState('')
  const [motivo, setMotivo] = useState('')

  useEffect(() => {
    caricaClienti().then(setClienti)
    caricaLavori().then(async (elenco) => {
      setLavori(elenco)
      // composizione delle squadre nei giorni in cui i lavori erano pianificati
      const giorni = [
        ...new Set(
          elenco.filter((l) => l.assegnato?.teamId).map((l) => l.assegnato.data || oggiISO()),
        ),
      ]
      const per = {}
      for (const g of giorni) per[g] = await caricaComposizione(g)
      setComposizioni(per)
    })
  }, [])

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.nome || '—'
  const nomeSquadra = (id) => SQUADRE_BASE.find((s) => s.id === id)?.nome || '—'

  // squadra del giorno in cui il lavoro è stato pianificato: sono loro ad averlo eseguito
  function membriDelLavoro(lavoro) {
    if (!lavoro.assegnato?.teamId) return []
    const giorno = lavoro.assegnato.data || oggiISO()
    return composizioni[giorno]?.[lavoro.assegnato.teamId] || []
  }

  function aggiorna(id, patch) {
    setLavori((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    aggiornaLavoro(id, patch)
  }

  function aggiornaConsuntivo(lavoro, patch) {
    const base = lavoro.consuntivo || consuntivoVuoto(lavoro, membriDelLavoro(lavoro))
    aggiorna(lavoro.id, { consuntivo: { ...base, ...patch } })
  }

  function inviaPerValidazione(lavoro) {
    aggiornaConsuntivo(lavoro, {
      compilatoIl: new Date().toISOString(),
      rifiutato: false,
      motivoRifiuto: '',
    })
  }

  function chiudiLavoro(lavoro) {
    aggiorna(lavoro.id, {
      chiuso: true,
      completato: true,
      validatoIl: new Date().toISOString(),
    })
    setApertoId(null)
  }

  function rimandaIndietro(lavoro) {
    if (!motivo.trim()) return
    aggiornaConsuntivo(lavoro, { rifiutato: true, motivoRifiuto: motivo.trim() })
    setMotivo('')
  }

  function riapri(lavoro) {
    aggiorna(lavoro.id, { chiuso: false, validatoIl: null })
  }

  const tutti = daConsuntivare(lavori)
  const elenco = tutti.filter((l) => {
    const stato = statoConsuntivo(l)
    if (filtro === 'Tutti') return true
    if (filtro === 'Aperti') return stato !== STATI_CONSUNTIVO.CHIUSO
    return stato === filtro
  })

  const conteggi = {
    daValidare: tutti.filter((l) => statoConsuntivo(l) === STATI_CONSUNTIVO.DA_VALIDARE).length,
    daConsuntivare: tutti.filter((l) => statoConsuntivo(l) === STATI_CONSUNTIVO.DA_CONSUNTIVARE)
      .length,
    daCorreggere: tutti.filter((l) => statoConsuntivo(l) === STATI_CONSUNTIVO.DA_CORREGGERE).length,
    chiusi: tutti.filter((l) => l.chiuso).length,
  }

  return (
    <>
      <h1 className="page-title">Consuntivazione Lavori</h1>
      <p className="page-subtitle">
        I lavori assegnati arrivano qui: l'operaio dichiara ore e materiali, tu verifichi e chiudi.
      </p>

      <div className="stat-grid scheda-stat">
        <div className="stat-card">
          <span className="stat-value">{conteggi.daConsuntivare}</span>
          <span className="stat-label">Da consuntivare</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-ambra">{conteggi.daValidare}</span>
          <span className="stat-label">Da validare</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-rosso">{conteggi.daCorreggere}</span>
          <span className="stat-label">Da correggere</span>
        </div>
        <div className="stat-card">
          <span className="stat-value stat-verde">{conteggi.chiusi}</span>
          <span className="stat-label">Chiusi</span>
        </div>
      </div>

      <div className="card sezione">
        <div className="lista-head">
          <span className="job-list-label">Lavori ({elenco.length})</span>
          <select
            className="campo-ricerca"
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
          >
            <option>Aperti</option>
            <option>Tutti</option>
            <option>{STATI_CONSUNTIVO.DA_CONSUNTIVARE}</option>
            <option>{STATI_CONSUNTIVO.DA_VALIDARE}</option>
            <option>{STATI_CONSUNTIVO.DA_CORREGGERE}</option>
            <option>{STATI_CONSUNTIVO.CHIUSO}</option>
          </select>
        </div>

        {elenco.length === 0 ? (
          <p className="job-list-empty">
            Nessun lavoro da consuntivare: assegna prima i lavori a una squadra.
          </p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Lavoro</th>
                <th>Cliente</th>
                <th>Squadra</th>
                <th>Ore prev./eff.</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {elenco.map((l) => {
                const stato = statoConsuntivo(l)
                const c = l.consuntivo
                return (
                  <tr key={l.id}>
                    <td>
                      <span className="cliente-nome-link">{l.titolo}</span>
                      {l.indirizzo && <span className="riga-sub">{l.indirizzo}</span>}
                    </td>
                    <td>{nomeCliente(l.clienteId)}</td>
                    <td>
                      {nomeSquadra(l.assegnato?.teamId)}
                      {membriDelLavoro(l).length > 0 && (
                        <span className="riga-sub">{membriDelLavoro(l).join(', ')}</span>
                      )}
                    </td>
                    <td>
                      {l.durata}h / {c ? `${c.oreEffettive}h` : '—'}
                    </td>
                    <td>
                      <span className={'badge ' + CLASSE_STATO[stato]}>{stato}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-apri"
                        onClick={() => setApertoId(apertoId === l.id ? null : l.id)}
                      >
                        {apertoId === l.id ? 'Chiudi' : 'Apri'}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {apertoId &&
        (() => {
          const lavoro = lavori.find((l) => l.id === apertoId)
          if (!lavoro) return null
          const membri = membriDelLavoro(lavoro)
          const c = lavoro.consuntivo || consuntivoVuoto(lavoro, membri)
          const esiti = lavoro.consuntivo ? verificheConsuntivo(lavoro) : []
          const problemi = bloccanti(esiti)
          const residuo = (lavoro.importo || 0) - (lavoro.incassato || 0)

          return (
            <div className="card sezione dettaglio-consuntivo">
              <div className="lista-head">
                <span className="job-list-label">Consuntivo · {lavoro.titolo}</span>
                <button
                  type="button"
                  className="vai-assegnazione"
                  onClick={() => navigate('/lavori/' + lavoro.id)}
                >
                  Apri scheda lavoro →
                </button>
              </div>

              <div className="confronto">
                <div className="confronto-col">
                  <span className="confronto-titolo">Previsto</span>
                  <p className="confronto-riga">
                    Squadra: {nomeSquadra(lavoro.assegnato?.teamId)}
                    {membri.length > 0 && <span className="riga-sub">{membri.join(', ')}</span>}
                  </p>
                  <p className="confronto-riga">Ore: {lavoro.durata}h</p>
                  <p className="confronto-riga">
                    Materiali: {(lavoro.materiali || []).join(', ') || '—'}
                  </p>
                  <p className="confronto-riga">Importo: {formattaEuro(lavoro.importo)}</p>
                  <p className="confronto-riga">Da incassare: {formattaEuro(residuo)}</p>
                </div>

                <div className="confronto-col">
                  <span className="confronto-titolo">Dichiarato dall'operaio</span>

                  <label className="job-form-label">Eseguito da</label>
                  <input
                    type="text"
                    className="campo-consuntivo"
                    placeholder="Nome operaio"
                    value={c.compilatoDa}
                    disabled={lavoro.chiuso}
                    onChange={(e) => aggiornaConsuntivo(lavoro, { compilatoDa: e.target.value })}
                  />

                  <label className="job-form-label">Ore effettive</label>
                  <input
                    type="number"
                    className="campo-consuntivo"
                    min="0"
                    step="0.5"
                    value={c.oreEffettive}
                    disabled={lavoro.chiuso}
                    onChange={(e) =>
                      aggiornaConsuntivo(lavoro, { oreEffettive: Number(e.target.value) })
                    }
                  />

                  <label className="job-form-label">Materiali utilizzati</label>
                  {!lavoro.chiuso && (
                    <div className="materiale-riga">
                      <input
                        type="text"
                        className="campo-consuntivo"
                        placeholder="Aggiungi materiale usato"
                        value={materiale}
                        onChange={(e) => setMateriale(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter') return
                          e.preventDefault()
                          if (!materiale.trim()) return
                          aggiornaConsuntivo(lavoro, {
                            materialiUsati: [...c.materialiUsati, materiale.trim()],
                          })
                          setMateriale('')
                        }}
                      />
                      <button
                        type="button"
                        className="materiale-add"
                        onClick={() => {
                          if (!materiale.trim()) return
                          aggiornaConsuntivo(lavoro, {
                            materialiUsati: [...c.materialiUsati, materiale.trim()],
                          })
                          setMateriale('')
                        }}
                      >
                        +
                      </button>
                    </div>
                  )}
                  <ul className="materiale-lista">
                    {c.materialiUsati.length === 0 && (
                      <li className="materiale-vuoto">Nessun materiale dichiarato</li>
                    )}
                    {c.materialiUsati.map((m, i) => (
                      <li key={m + i}>
                        <span>{m}</span>
                        {!lavoro.chiuso && (
                          <button
                            type="button"
                            onClick={() =>
                              aggiornaConsuntivo(lavoro, {
                                materialiUsati: c.materialiUsati.filter((_, k) => k !== i),
                              })
                            }
                            aria-label="Rimuovi"
                          >
                            ×
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>

                  <label className="job-form-label">Note dell'operaio</label>
                  <textarea
                    className="campo-consuntivo"
                    rows={3}
                    placeholder="Problemi riscontrati, lavorazioni extra..."
                    value={c.noteOperaio}
                    disabled={lavoro.chiuso}
                    onChange={(e) => aggiornaConsuntivo(lavoro, { noteOperaio: e.target.value })}
                  />

                  {!lavoro.chiuso && (
                    <button
                      type="button"
                      className="gps-btn"
                      onClick={() => inviaPerValidazione(lavoro)}
                    >
                      {lavoro.consuntivo?.compilatoIl
                        ? 'Aggiorna dichiarazione'
                        : 'Invia per validazione'}
                    </button>
                  )}
                  {c.compilatoIl && (
                    <p className="gps-stato">Dichiarato il {formattaData(c.compilatoIl)}</p>
                  )}
                </div>
              </div>

              {/* controlli automatici su quanto dichiarato */}
              {lavoro.consuntivo && !lavoro.chiuso && (
                <div className="verifiche">
                  <span className="job-list-label">Controlli</span>
                  {esiti.length === 0 ? (
                    <p className="verifica-ok">
                      Nessuno scostamento rilevato: il consuntivo corrisponde al preventivo.
                    </p>
                  ) : (
                    <ul className="verifica-lista">
                      {esiti.map((v, i) => (
                        <li
                          key={i}
                          className={v.bloccante ? 'verifica-bloccante' : 'verifica-avviso'}
                        >
                          {v.bloccante ? '✕' : '!'} {v.testo}
                        </li>
                      ))}
                    </ul>
                  )}

                  {c.rifiutato && (
                    <p className="verifica-bloccante">
                      Rimandato all'operaio: {c.motivoRifiuto}
                    </p>
                  )}

                  <div className="azioni-validazione">
                    <button
                      type="button"
                      className="btn-chiudi"
                      disabled={problemi.length > 0 || !c.compilatoIl}
                      onClick={() => chiudiLavoro(lavoro)}
                      title={
                        problemi.length > 0
                          ? 'Risolvi prima i controlli bloccanti'
                          : !c.compilatoIl
                            ? 'Il consuntivo non è ancora stato inviato'
                            : 'Valida e chiudi il lavoro'
                      }
                    >
                      Valida e chiudi
                    </button>
                    <input
                      type="text"
                      className="campo-consuntivo motivo-input"
                      placeholder="Motivo per rimandare all'operaio"
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                    />
                    <button
                      type="button"
                      className="btn-rimanda"
                      disabled={!motivo.trim()}
                      onClick={() => rimandaIndietro(lavoro)}
                    >
                      Rimanda indietro
                    </button>
                  </div>
                </div>
              )}

              {lavoro.chiuso && (
                <div className="verifiche">
                  <p className="verifica-ok">
                    Lavoro chiuso e validato il {formattaData(lavoro.validatoIl)}.
                  </p>
                  <button type="button" className="btn-rimanda" onClick={() => riapri(lavoro)}>
                    Riapri lavoro
                  </button>
                </div>
              )}
            </div>
          )
        })()}
    </>
  )
}
