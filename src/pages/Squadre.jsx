import { useState } from 'react'
import { DIPENDENTI } from '../data/dipendenti'
import {
  SQUADRE_BASE,
  domaniISO,
  caricaComposizione,
  salvaComposizione,
  caricaBlocchi,
  bloccaSquadra,
  sbloccaSquadra,
} from '../data/squadre'
import { caricaPresenze, caricaTuttePresenze } from '../data/presenze'
import './Squadre.css'
import './Presenze.css'

export default function Squadre() {
  const [data, setData] = useState(domaniISO)
  const [composizione, setComposizione] = useState(() => caricaComposizione(domaniISO()))
  const [presenze, setPresenze] = useState(() => caricaPresenze(domaniISO()))
  const [blocchi, setBlocchi] = useState(caricaBlocchi)

  function cambiaData(nuovaData) {
    setData(nuovaData)
    setComposizione(caricaComposizione(nuovaData))
    setPresenze(caricaPresenze(nuovaData))
  }

  function aggiorna(updater) {
    setComposizione((prev) => {
      const next = updater(prev)
      salvaComposizione(data, next)
      return next
    })
  }

  function rimuoviDaTutte(comp, nome) {
    const next = {}
    for (const s of SQUADRE_BASE) next[s.id] = comp[s.id].filter((n) => n !== nome)
    return next
  }

  function handleDragStart(e, nome) {
    e.dataTransfer.setData('text/plain', nome)
  }

  function handleDropSuSquadra(e, teamId) {
    e.preventDefault()
    const nome = e.dataTransfer.getData('text/plain')
    aggiorna((prev) => {
      const next = rimuoviDaTutte(prev, nome)
      next[teamId] = [...next[teamId], nome]
      return next
    })
  }

  function handleDropSuPannello(e) {
    e.preventDefault()
    const nome = e.dataTransfer.getData('text/plain')
    aggiorna((prev) => rimuoviDaTutte(prev, nome))
  }

  function rimuoviPersona(teamId, nome) {
    aggiorna((prev) => ({ ...prev, [teamId]: prev[teamId].filter((n) => n !== nome) }))
  }

  function spostaGiorno(passo) {
    const d = new Date(data)
    d.setDate(d.getDate() + passo)
    cambiaData(d.toISOString().slice(0, 10))
  }

  function cambiaLucchetto(teamId) {
    if (blocchi[teamId]) {
      sbloccaSquadra(teamId)
    } else {
      bloccaSquadra(teamId, composizione[teamId])
    }
    setBlocchi(caricaBlocchi())
  }

  const assegnati = new Set(Object.values(composizione).flat())
  const nonAssegnati = DIPENDENTI.filter((n) => !assegnati.has(n))

  // ultimo giorno consecutivo con lo stesso motivo di assenza, per mostrare "fino al ..."
  function fineAssenza(nome, stato) {
    const tutte = caricaTuttePresenze()
    const cursore = new Date(data)
    let ultimo = data
    for (;;) {
      cursore.setDate(cursore.getDate() + 1)
      const giorno = cursore.toISOString().slice(0, 10)
      if (tutte[giorno]?.[nome] !== stato) break
      ultimo = giorno
    }
    return ultimo === data ? null : new Date(ultimo).toLocaleDateString('it-IT')
  }

  return (
    <>
      <h1 className="page-title">Squadre</h1>
      <p className="page-subtitle">
        Componi le squadre per una giornata: si formano il giorno prima, per il giorno dopo.
      </p>

      <div className="squadre-date-row">
        <label htmlFor="squadre-data">Giornata</label>
        <button
          type="button"
          className="nav-giorno"
          onClick={() => spostaGiorno(-1)}
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <input
          id="squadre-data"
          type="date"
          value={data}
          onChange={(e) => cambiaData(e.target.value)}
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
          onClick={() => cambiaData(domaniISO())}
          disabled={data === domaniISO()}
        >
          Domani
        </button>
        <span className="etichetta-giorno">
          {new Date(data).toLocaleDateString('it-IT', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </span>
      </div>

      <div className="squadre-layout">
        <aside className="squadre-side">
          <div
            className="person-list"
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDropSuPannello}
          >
            <span className="person-list-label">Da assegnare ({nonAssegnati.length})</span>
            {nonAssegnati.length === 0 && (
              <p className="person-list-empty">Tutti assegnati a una squadra.</p>
            )}
            {nonAssegnati.map((nome) => {
              const assente = presenze[nome] !== 'Presente'
              return (
                <div
                  key={nome}
                  className={'person-chip' + (assente ? ' person-chip-assente' : '')}
                  draggable
                  onDragStart={(e) => handleDragStart(e, nome)}
                  title={assente ? presenze[nome] : undefined}
                >
                  {nome}
                  {assente && (
                    <span className="person-chip-stato">
                      {presenze[nome]}
                      {fineAssenza(nome, presenze[nome]) &&
                        ` fino al ${fineAssenza(nome, presenze[nome])}`}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        </aside>

        <div className="squadre-grid">
          {SQUADRE_BASE.map((team) => (
            <div
              key={team.id}
              className={'squadra-card' + (blocchi[team.id] ? ' squadra-card-bloccata' : '')}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropSuSquadra(e, team.id)}
            >
              <div className="squadra-card-head">
                <span className="squadra-card-title">{team.nome}</span>
                <button
                  type="button"
                  className={'lucchetto' + (blocchi[team.id] ? ' lucchetto-chiuso' : '')}
                  onClick={() => cambiaLucchetto(team.id)}
                  title={
                    blocchi[team.id]
                      ? 'Squadra fissa: clicca per sbloccarla e modificarla giorno per giorno'
                      : 'Blocca questa squadra: resterà la stessa tutti i giorni'
                  }
                  aria-label={blocchi[team.id] ? 'Sblocca squadra' : 'Blocca squadra'}
                >
                  {blocchi[team.id] ? '🔒' : '🔓'}
                </button>
              </div>
              {blocchi[team.id] && <span className="squadra-fissa-nota">Squadra fissa</span>}
              <div className="squadra-drop-zone">
                {composizione[team.id].length === 0 && (
                  <p className="squadra-empty">Trascina qui una persona</p>
                )}
                {composizione[team.id].map((nome, indice) => {
                  const assente = presenze[nome] !== 'Presente'
                  return (
                    <div
                      key={nome}
                      className={'squadra-member' + (assente ? ' squadra-member-assente' : '')}
                      draggable
                      onDragStart={(e) => handleDragStart(e, nome)}
                      title={assente ? presenze[nome] : undefined}
                    >
                      <span className="squadra-member-nome">
                        {nome}
                        {indice === 0 && <span className="squadra-member-preposto">Preposto</span>}
                        {assente && (
                          <span className="person-chip-stato">
                            {presenze[nome]}
                            {fineAssenza(nome, presenze[nome]) &&
                              ` fino al ${fineAssenza(nome, presenze[nome])}`}
                          </span>
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => rimuoviPersona(team.id, nome)}
                        aria-label="Rimuovi dalla squadra"
                      >
                        ×
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
