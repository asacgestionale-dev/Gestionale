import { Fragment, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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
import { TestataDb, Riepilogo, Strumenti, Vuoto } from '../components/Database'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Consuntivazione.css'

const CLASSE_STATO = {
  [STATI_CONSUNTIVO.DA_CONSUNTIVARE]: 'badge-da-fare',
  [STATI_CONSUNTIVO.DA_VALIDARE]: 'badge-in-corso',
  [STATI_CONSUNTIVO.DA_CORREGGERE]: 'badge-malattia',
  [STATI_CONSUNTIVO.CHIUSO]: 'badge-completato',
}

const FILTRI = [
  'Aperti',
  'Tutti',
  STATI_CONSUNTIVO.DA_CONSUNTIVARE,
  STATI_CONSUNTIVO.DA_VALIDARE,
  STATI_CONSUNTIVO.DA_CORREGGERE,
  STATI_CONSUNTIVO.CHIUSO,
]

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

export default function Consuntivazione() {
  const navigate = useNavigate()
  const [lavori, setLavori] = useState([])
  const [clienti, setClienti] = useState([])
  const [composizioni, setComposizioni] = useState({})
  // dalla scheda del lavoro si arriva qui con ?lavoro=<id>: il rapportino è già aperto
  const [parametri] = useSearchParams()
  const [apertoId, setApertoId] = useState(() => parametri.get('lavoro'))
  const [chiusoOra, setChiusoOra] = useState(null)
  const [filtro, setFiltro] = useState('Aperti')
  const [ricerca, setRicerca] = useState('')
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
    setChiusoOra(lavoro)
  }

  function rimandaIndietro(lavoro) {
    if (!motivo.trim()) return
    aggiornaConsuntivo(lavoro, { rifiutato: true, motivoRifiuto: motivo.trim() })
    setMotivo('')
  }

  function riapri(lavoro) {
    aggiorna(lavoro.id, { chiuso: false, validatoIl: null })
  }

  function apri(id) {
    setApertoId(apertoId === id ? null : id)
    setMotivo('')
    setMateriale('')
  }

  function aggiungiMaterialeUsato(lavoro, c) {
    if (!materiale.trim()) return
    aggiornaConsuntivo(lavoro, { materialiUsati: [...c.materialiUsati, materiale.trim()] })
    setMateriale('')
  }

  // arrivano qui i lavori dal giorno in cui erano pianificati: quelli futuri
  // sono ancora "pianificati" e restano nella pagina Lavori
  const tutti = daConsuntivare(lavori).filter(
    (l) => l.consuntivo || l.chiuso || (l.assegnato?.data || oggiISO()) <= oggiISO(),
  )

  const q = ricerca.trim().toLowerCase()
  const elenco = tutti.filter((l) => {
    const stato = statoConsuntivo(l)
    if (filtro === 'Aperti' && stato === STATI_CONSUNTIVO.CHIUSO) return false
    if (filtro !== 'Aperti' && filtro !== 'Tutti' && stato !== filtro) return false
    if (!q) return true
    return [l.titolo, nomeCliente(l.clienteId), nomeSquadra(l.assegnato?.teamId), ...membriDelLavoro(l)]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  })

  const quanti = (stato) => tutti.filter((l) => statoConsuntivo(l) === stato).length
  const mancanti = quanti(STATI_CONSUNTIVO.DA_CONSUNTIVARE)
  const daValidare = quanti(STATI_CONSUNTIVO.DA_VALIDARE)
  const daCorreggere = quanti(STATI_CONSUNTIVO.DA_CORREGGERE)

  const voci = [
    {
      valore: mancanti,
      etichetta: 'Manca rapportino',
      tono: mancanti ? 'rosso' : undefined,
      nota: 'lavori eseguiti senza dichiarazione',
    },
    { valore: daValidare, etichetta: 'Da validare', tono: daValidare ? 'ambra' : undefined },
    {
      valore: daCorreggere,
      etichetta: 'Rimandati all’operaio',
      nota: 'in attesa di correzione',
    },
    { valore: quanti(STATI_CONSUNTIVO.CHIUSO), etichetta: 'Chiusi', tono: 'verde' },
  ]

  function dettaglio(lavoro) {
    const membri = membriDelLavoro(lavoro)
    const c = lavoro.consuntivo || consuntivoVuoto(lavoro, membri)
    const esiti = lavoro.consuntivo ? verificheConsuntivo(lavoro) : []
    const problemi = bloccanti(esiti)

    return (
      <div className="dettaglio-consuntivo">
        <div className="lista-head">
          <span className="job-list-label">Rapportino · {lavoro.titolo}</span>
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
              onChange={(e) => aggiornaConsuntivo(lavoro, { oreEffettive: Number(e.target.value) })}
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
                    aggiungiMaterialeUsato(lavoro, c)
                  }}
                />
                <button
                  type="button"
                  className="materiale-add"
                  onClick={() => aggiungiMaterialeUsato(lavoro, c)}
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
              <button type="button" className="gps-btn" onClick={() => inviaPerValidazione(lavoro)}>
                {lavoro.consuntivo?.compilatoIl ? 'Aggiorna dichiarazione' : 'Invia per validazione'}
              </button>
            )}
            {c.compilatoIl && <p className="gps-stato">Dichiarato il {formattaData(c.compilatoIl)}</p>}
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
                  <li key={i} className={v.bloccante ? 'verifica-bloccante' : 'verifica-avviso'}>
                    {v.bloccante ? '✕' : '!'} {v.testo}
                  </li>
                ))}
              </ul>
            )}

            {c.rifiutato && (
              <p className="verifica-bloccante">Rimandato all'operaio: {c.motivoRifiuto}</p>
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
            <p className="verifica-ok">Lavoro chiuso e validato il {formattaData(lavoro.validatoIl)}.</p>
            <button type="button" className="btn-rimanda" onClick={() => riapri(lavoro)}>
              Riapri lavoro
            </button>
          </div>
        )}
      </div>
    )
  }

  // un rapportino aperto dalla scheda ma fuori dal filtro scelto resta visibile sotto
  const apertoFuoriElenco =
    apertoId && !elenco.some((l) => l.id === apertoId)
      ? lavori.find((l) => l.id === apertoId)
      : null

  return (
    <>
      <TestataDb
        titolo="Consuntivazione Lavori"
        sottotitolo="Qui arrivano i lavori eseguiti: l’operaio dichiara ore e materiali, tu controlli e chiudi. Clicca una riga per aprire il rapportino."
        azioni={[{ testo: 'Tutti i lavori', onClick: () => navigate('/lavori'), secondaria: true }]}
      />

      <Riepilogo voci={voci} />

      {chiusoOra && (
        <div className="card sezione avviso-chiuso">
          <span>
            <strong>{chiusoOra.titolo}</strong> è chiuso: ora passa a <strong>Da fatturare</strong>.
          </span>
          <Link to={'/lavori/' + chiusoOra.id} className="vai-assegnazione">
            Emetti la fattura →
          </Link>
        </div>
      )}

      <div className="card sezione">
        <Strumenti
          titolo="Lavori da chiudere"
          mostrati={elenco.length}
          totali={tutti.length}
          ricerca={ricerca}
          onRicerca={setRicerca}
          segnaposto="Cerca lavoro, cliente, squadra..."
        >
          <select className="db-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTRI.map((f) => (
              <option key={f} value={f}>
                {f === 'Aperti' ? 'Ancora aperti' : f}
              </option>
            ))}
          </select>
        </Strumenti>

        {elenco.length === 0 ? (
          <Vuoto>
            {tutti.length === 0
              ? 'Nessun lavoro da chiudere: arrivano qui dal giorno in cui sono pianificati.'
              : 'Nessun lavoro in questa vista.'}
          </Vuoto>
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
                const aperto = apertoId === l.id
                return (
                  <Fragment key={l.id}>
                    <tr
                      className={'db-riga' + (aperto ? ' db-riga-aperta' : '')}
                      onClick={() => apri(l.id)}
                    >
                      <td>
                        <span className="cliente-nome-link">{l.titolo}</span>
                        <span className="riga-sub">
                          {formattaData(l.assegnato?.data)}
                          {l.indirizzo && ` · ${l.indirizzo}`}
                        </span>
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
                      <td className="db-azioni-cella">
                        <span className="btn-apri">{aperto ? 'Chiudi' : 'Apri'}</span>
                      </td>
                    </tr>
                    {aperto && (
                      <tr className="db-dettaglio">
                        <td colSpan={6}>{dettaglio(l)}</td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {apertoFuoriElenco && <div className="card sezione">{dettaglio(apertoFuoriElenco)}</div>}
    </>
  )
}
