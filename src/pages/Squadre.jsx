import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { caricaDipendenti } from '../data/dipendenti'
import {
  SQUADRE_BASE,
  oggiISO,
  domaniISO,
  caricaComposizione,
  salvaComposizione,
  caricaBlocchi,
  bloccaSquadra,
  sbloccaSquadra,
} from '../data/squadre'
import { caricaPresenze, caricaTuttePresenze } from '../data/presenze'
import { caricaLavori } from '../data/lavori'
import { TestataDb, Riepilogo } from '../components/Database'
import { useConferma } from '../components/useConferma'
import './Presenze.css'
import './Squadre.css'

function spostaData(iso, passo) {
  const d = new Date(iso)
  d.setDate(d.getDate() + passo)
  return d.toISOString().slice(0, 10)
}

function formattaGiorno(iso, lungo = false) {
  return new Date(iso).toLocaleDateString(
    'it-IT',
    lungo ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short' },
  )
}

function iniziali(nome) {
  return nome
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('')
}

function elencoBreve(nomi) {
  const brevi = nomi.map((n) => n.split(' ')[0])
  return brevi.slice(0, 3).join(', ') + (brevi.length > 3 ? '…' : '')
}

// Squadre del giorno: si formano il giorno prima per il giorno dopo.
// Le persone si trascinano nelle squadre oppure, sul telefono, si tocca una
// persona e poi la squadra in cui metterla.
export default function Squadre() {
  const [data, setData] = useState(domaniISO)
  const [composizione, setComposizione] = useState({})
  const [presenze, setPresenze] = useState({})
  const [blocchi, setBlocchi] = useState({})
  const [dipendenti, setDipendenti] = useState([])
  const [tuttePresenze, setTuttePresenze] = useState({})
  const [lavori, setLavori] = useState([])
  const [selezionato, setSelezionato] = useState(null)
  const [sopra, setSopra] = useState(null)
  const { chiedi, dialogo } = useConferma()

  useEffect(() => {
    caricaDipendenti().then(setDipendenti)
    caricaBlocchi().then(setBlocchi)
    caricaTuttePresenze().then(setTuttePresenze)
    caricaLavori().then(setLavori)
  }, [])

  useEffect(() => {
    caricaComposizione(data).then(setComposizione)
    caricaPresenze(data).then(setPresenze)
    setSelezionato(null)
  }, [data])

  function aggiorna(updater) {
    setComposizione((prev) => {
      const next = updater(prev)
      salvaComposizione(data, next)
      return next
    })
  }

  function rimuoviDaTutte(comp, nome) {
    const next = {}
    for (const s of SQUADRE_BASE) next[s.id] = (comp[s.id] || []).filter((n) => n !== nome)
    return next
  }

  // teamId null toglie la persona da ogni squadra
  function metti(nome, teamId) {
    aggiorna((prev) => {
      const next = rimuoviDaTutte(prev, nome)
      if (teamId) next[teamId] = [...next[teamId], nome]
      return next
    })
    setSelezionato(null)
  }

  // il primo della squadra è il preposto: si porta in cima
  function rendiPreposto(teamId, nome) {
    aggiorna((prev) => ({
      ...prev,
      [teamId]: [nome, ...(prev[teamId] || []).filter((n) => n !== nome)],
    }))
  }

  function handleDragStart(e, nome) {
    e.dataTransfer.setData('text/plain', nome)
    setSelezionato(null)
  }

  function trascinaSopra(e, zona) {
    e.preventDefault()
    if (sopra !== zona) setSopra(zona)
  }

  function lascia(e, teamId) {
    e.preventDefault()
    setSopra(null)
    const nome = e.dataTransfer.getData('text/plain')
    if (nome) metti(nome, teamId)
  }

  function tocca(nome) {
    setSelezionato(selezionato === nome ? null : nome)
  }

  function toccaSquadra(teamId) {
    if (!selezionato) return
    if ((composizione[teamId] || []).includes(selezionato)) {
      setSelezionato(null)
      return
    }
    metti(selezionato, teamId)
  }

  function toccaElenco() {
    if (selezionato && assegnati.has(selezionato)) metti(selezionato, null)
  }

  async function cambiaLucchetto(teamId) {
    if (blocchi[teamId]) {
      await sbloccaSquadra(teamId)
    } else {
      await bloccaSquadra(teamId, composizione[teamId] || [])
    }
    setBlocchi(await caricaBlocchi())
  }

  // la routine di tutti i giorni: stesse squadre del giorno prima, poi si ritocca
  function ricopiaGiornoPrima() {
    const precedente = spostaData(data, -1)
    async function esegui() {
      const comp = await caricaComposizione(precedente)
      const esistenti = new Set(dipendenti.map((d) => d.nome))
      const next = Object.fromEntries(
        SQUADRE_BASE.map((s) => [s.id, (comp[s.id] || []).filter((n) => esistenti.has(n))]),
      )
      setComposizione(next)
      await salvaComposizione(data, next)
    }
    const giaComposte = Object.values(composizione).some((m) => m.length > 0)
    if (!giaComposte) return esegui()
    chiedi({
      titolo: 'Ricopiare le squadre del giorno prima?',
      messaggio: `Le squadre di ${formattaGiorno(data, true)} verranno sostituite da quelle di ${formattaGiorno(precedente, true)}.`,
      testoConferma: 'Ricopia',
      onConferma: esegui,
    })
  }

  // ultimo giorno consecutivo con lo stesso motivo di assenza, per mostrare "fino al ..."
  function fineAssenza(nome, stato) {
    let ultimo = data
    for (let giorno = spostaData(data, 1); tuttePresenze[giorno]?.[nome] === stato; giorno = spostaData(giorno, 1)) {
      ultimo = giorno
    }
    return ultimo === data ? null : formattaGiorno(ultimo)
  }

  const nomi = dipendenti.map((d) => d.nome)
  const ruoloDi = (nome) => dipendenti.find((d) => d.nome === nome)?.ruolo || ''
  const statoDi = (nome) => presenze[nome] || 'Presente'
  const assente = (nome) => statoDi(nome) !== 'Presente'

  function sottotitoloPersona(nome) {
    if (!assente(nome)) return ruoloDi(nome)
    const fine = fineAssenza(nome, statoDi(nome))
    return statoDi(nome) + (fine ? ` fino al ${fine}` : '')
  }

  const assegnati = new Set(Object.values(composizione).flat())
  const liberi = nomi.filter((n) => !assegnati.has(n))
  const disponibiliLiberi = liberi.filter((n) => !assente(n))
  const assentiLiberi = liberi.filter(assente)
  const assentiInSquadra = [...assegnati].filter(assente)
  const presenti = nomi.filter((n) => !assente(n))

  const lavoriDi = (teamId) =>
    lavori.filter((l) => l.assegnato?.teamId === teamId && l.assegnato?.data === data)
  const squadreFormate = SQUADRE_BASE.filter((s) => (composizione[s.id] || []).length > 0).length
  const conLavoriSenzaPersone = SQUADRE_BASE.filter(
    (s) => lavoriDi(s.id).length > 0 && (composizione[s.id] || []).length === 0,
  )

  const voci = [
    {
      valore: presenti.length,
      etichetta: 'Disponibili',
      nota: `su ${nomi.length} in organico`,
    },
    {
      valore: disponibiliLiberi.length,
      etichetta: 'Ancora da assegnare',
      tono: disponibiliLiberi.length ? 'ambra' : 'verde',
      nota: disponibiliLiberi.length ? elencoBreve(disponibiliLiberi) : 'tutti in squadra',
    },
    {
      valore: nomi.length - presenti.length,
      etichetta: 'Assenti',
      tono: assentiInSquadra.length ? 'rosso' : undefined,
      nota: assentiInSquadra.length
        ? `${elencoBreve(assentiInSquadra)} messi in squadra`
        : nomi.length - presenti.length
          ? elencoBreve(nomi.filter(assente))
          : 'nessuno',
    },
    {
      valore: `${squadreFormate} di ${SQUADRE_BASE.length}`,
      etichetta: 'Squadre formate',
      tono: conLavoriSenzaPersone.length ? 'rosso' : undefined,
      nota: conLavoriSenzaPersone.length
        ? `${conLavoriSenzaPersone.map((s) => s.nome).join(', ')} ha lavori ma nessuno`
        : null,
    },
  ]

  function persona(nome) {
    return (
      <div
        key={nome}
        className={
          'persona' +
          (assente(nome) ? ' persona-assente' : '') +
          (selezionato === nome ? ' persona-selezionata' : '')
        }
        draggable
        onDragStart={(e) => handleDragStart(e, nome)}
        onClick={(e) => {
          e.stopPropagation()
          tocca(nome)
        }}
        onKeyDown={(e) => e.key === 'Enter' && tocca(nome)}
        role="button"
        tabIndex={0}
        aria-pressed={selezionato === nome}
      >
        <span className="avatar">{iniziali(nome)}</span>
        <span className="persona-testo">
          <span className="persona-nome">{nome}</span>
          <span className="persona-sotto">{sottotitoloPersona(nome)}</span>
        </span>
      </div>
    )
  }

  return (
    <>
      <TestataDb
        titolo="Squadre"
        sottotitolo="Si formano il giorno prima per il giorno dopo. Trascina le persone nelle squadre, oppure tocca una persona e poi la squadra."
        azioni={[{ testo: 'Ricopia dal giorno prima', onClick: ricopiaGiornoPrima, secondaria: true }]}
      />

      <Riepilogo voci={voci} />

      <div className="card squadre-date-row giorno-barra">
        <button
          type="button"
          className="nav-giorno"
          onClick={() => setData(spostaData(data, -1))}
          aria-label="Giorno precedente"
        >
          ‹
        </button>
        <input
          type="date"
          value={data}
          onChange={(e) => e.target.value && setData(e.target.value)}
          aria-label="Giornata"
        />
        <button
          type="button"
          className="nav-giorno"
          onClick={() => setData(spostaData(data, 1))}
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
        <button
          type="button"
          className="btn-oggi"
          onClick={() => setData(domaniISO())}
          disabled={data === domaniISO()}
        >
          Domani
        </button>
        <span className="etichetta-giorno giorno-nome">{formattaGiorno(data, true)}</span>
      </div>

      <div className="squadre-layout">
        <aside className="squadre-side">
          <div
            className={'elenco-persone' + (sopra === 'elenco' ? ' zona-attiva' : '')}
            onDragOver={(e) => trascinaSopra(e, 'elenco')}
            onDragLeave={() => setSopra(null)}
            onDrop={(e) => lascia(e, null)}
            onClick={toccaElenco}
          >
            <span className="elenco-titolo">Da assegnare ({disponibiliLiberi.length})</span>
            {disponibiliLiberi.length === 0 && (
              <p className="elenco-vuoto">Tutte le persone disponibili sono in squadra.</p>
            )}
            {disponibiliLiberi.map(persona)}

            {assentiLiberi.length > 0 && (
              <>
                <span className="elenco-titolo elenco-titolo-assenti">
                  Assenti ({assentiLiberi.length})
                </span>
                {assentiLiberi.map(persona)}
              </>
            )}
          </div>

          {selezionato && (
            <p className="squadre-suggerimento">
              Tocca la squadra in cui mettere <strong>{selezionato}</strong>
              {assegnati.has(selezionato) && ', oppure questo elenco per toglierlo'}.
            </p>
          )}
        </aside>

        <div className="squadre-grid">
          {SQUADRE_BASE.map((team, i) => {
            const membri = composizione[team.id] || []
            const lavoriSquadra = lavoriDi(team.id)
            const ore = lavoriSquadra.reduce((s, l) => s + (Number(l.durata) || 0), 0)
            const prepostoAssente = membri.length > 0 && assente(membri[0])
            const bloccata = Boolean(blocchi[team.id])

            return (
              <div
                key={team.id}
                className={
                  'squadra squadra-tinta-' +
                  i +
                  (bloccata ? ' squadra-bloccata' : '') +
                  (sopra === team.id ? ' zona-attiva' : '') +
                  (selezionato && !membri.includes(selezionato) ? ' squadra-in-attesa' : '')
                }
                onDragOver={(e) => trascinaSopra(e, team.id)}
                onDragLeave={() => setSopra(null)}
                onDrop={(e) => lascia(e, team.id)}
                onClick={() => toccaSquadra(team.id)}
              >
                <div className="squadra-testa">
                  <div>
                    <span className="squadra-nome">{team.nome}</span>
                    <span className="squadra-conta">
                      {membri.length} {membri.length === 1 ? 'persona' : 'persone'}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={'lucchetto' + (bloccata ? ' lucchetto-chiuso' : '')}
                    onClick={(e) => {
                      e.stopPropagation()
                      cambiaLucchetto(team.id)
                    }}
                    title={
                      bloccata
                        ? 'Squadra fissa: clicca per sbloccarla e modificarla giorno per giorno'
                        : 'Blocca questa squadra: resterà la stessa tutti i giorni'
                    }
                    aria-label={bloccata ? 'Sblocca squadra' : 'Blocca squadra'}
                  >
                    {bloccata ? '🔒 Fissa' : '🔓'}
                  </button>
                </div>

                <div className="squadra-lavori">
                  {lavoriSquadra.length > 0 ? (
                    <Link to="/assegnazione-lavori" onClick={(e) => e.stopPropagation()}>
                      {lavoriSquadra.length} {lavoriSquadra.length === 1 ? 'lavoro' : 'lavori'} ·{' '}
                      {ore} h in agenda →
                    </Link>
                  ) : (
                    <span>Nessun lavoro in agenda</span>
                  )}
                </div>

                {lavoriSquadra.length > 0 && membri.length === 0 && (
                  <p className="squadra-avviso">Ha dei lavori ma nessuna persona.</p>
                )}
                {prepostoAssente && (
                  <p className="squadra-avviso">Il preposto è assente: scegline un altro con ★.</p>
                )}

                <div className="squadra-membri">
                  {membri.length === 0 && (
                    <p className="squadra-vuota">
                      {selezionato ? `Tocca qui per mettere ${selezionato}` : 'Trascina qui le persone'}
                    </p>
                  )}
                  {membri.map((nome, indice) => (
                    <div
                      key={nome}
                      className={
                        'persona persona-in-squadra' +
                        (assente(nome) ? ' persona-assente' : '') +
                        (selezionato === nome ? ' persona-selezionata' : '')
                      }
                      draggable
                      onDragStart={(e) => handleDragStart(e, nome)}
                      onClick={(e) => {
                        e.stopPropagation()
                        tocca(nome)
                      }}
                      role="button"
                      tabIndex={0}
                      aria-pressed={selezionato === nome}
                      onKeyDown={(e) => e.key === 'Enter' && tocca(nome)}
                    >
                      <span className="avatar">{iniziali(nome)}</span>
                      <span className="persona-testo">
                        <span className="persona-nome">
                          {nome}
                          {indice === 0 && <span className="etichetta-preposto">Preposto</span>}
                        </span>
                        <span className="persona-sotto">{sottotitoloPersona(nome)}</span>
                      </span>
                      <span className="persona-azioni">
                        {indice > 0 && (
                          <button
                            type="button"
                            title="Rendi preposto"
                            aria-label={`Rendi ${nome} preposto`}
                            onClick={(e) => {
                              e.stopPropagation()
                              rendiPreposto(team.id, nome)
                            }}
                          >
                            ★
                          </button>
                        )}
                        <button
                          type="button"
                          title="Togli dalla squadra"
                          aria-label={`Togli ${nome} dalla squadra`}
                          onClick={(e) => {
                            e.stopPropagation()
                            metti(nome, null)
                          }}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {dialogo}
    </>
  )
}
