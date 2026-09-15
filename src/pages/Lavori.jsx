import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { caricaLavori, formattaEuro, orarioDaMinuti } from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import { caricaFatture, economiaLavoro } from '../data/fatture'
import { caricaPagamenti } from '../data/pagamenti'
import { caricaEconomia } from '../data/impostazioni'
import { SQUADRE_BASE } from '../data/squadre'
import { FASI, faseLavoro } from '../data/statoLavoro'
import { TestataDb, Riepilogo, Strumenti, Vuoto } from '../components/Database'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Lavori.css'

const CHIAVE_VISTA = 'gestionale-vista-lavori'

function vistaSalvata() {
  try {
    return localStorage.getItem(CHIAVE_VISTA) || 'Tabellone'
  } catch {
    return 'Tabellone'
  }
}

function quando(lavoro) {
  const a = lavoro.assegnato
  if (!a?.data) return null
  const giorno = new Date(a.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  return a.minuti != null ? `${giorno} · ${orarioDaMinuti(a.minuti)}` : giorno
}

// Il tabellone di tutti i lavori: una colonna per fase, dal cantiere
// all'incasso. Ogni carta apre la scheda del lavoro.
export default function Lavori() {
  const navigate = useNavigate()
  const [lavori, setLavori] = useState([])
  const [clienti, setClienti] = useState([])
  const [fatture, setFatture] = useState([])
  const [pagamenti, setPagamenti] = useState({})
  const [costoOrario, setCostoOrario] = useState(0)
  const [vista, setVista] = useState(vistaSalvata)
  const [ricerca, setRicerca] = useState('')

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
    })
  }, [])

  function cambiaVista(v) {
    setVista(v)
    try {
      localStorage.setItem(CHIAVE_VISTA, v)
    } catch {
      // senza memoria del browser la scelta vale per questa visita
    }
  }

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.nome || ''
  const nomeSquadra = (id) => SQUADRE_BASE.find((s) => s.id === id)?.nome || ''

  const righe = useMemo(
    () =>
      lavori.map((l) => {
        const economia = economiaLavoro(l, fatture, pagamenti, costoOrario)
        return { lavoro: l, economia, fase: faseLavoro(l, economia) }
      }),
    [lavori, fatture, pagamenti, costoOrario],
  )

  const q = ricerca.trim().toLowerCase()
  const filtrate = q
    ? righe.filter((r) =>
        [r.lavoro.titolo, nomeCliente(r.lavoro.clienteId), r.lavoro.indirizzo]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q)),
      )
    : righe

  const conta = (id) => righe.filter((r) => r.fase.id === id).length
  const daFatturare = righe
    .filter((r) => r.lavoro.chiuso)
    .reduce((s, r) => s + r.economia.daFatturare, 0)
  const daIncassare = righe.reduce((s, r) => s + r.economia.daIncassare, 0)
  const scaduto = righe.reduce((s, r) => s + r.economia.scaduto, 0)
  const senzaRapportino = conta('eseguito')

  const voci = [
    {
      valore: conta('da-pianificare'),
      etichetta: 'Da pianificare',
      tono: conta('da-pianificare') ? 'ambra' : undefined,
    },
    { valore: conta('pianificato'), etichetta: 'Pianificati' },
    {
      valore: senzaRapportino + conta('da-validare'),
      etichetta: 'Da chiudere',
      nota: senzaRapportino ? `${senzaRapportino} senza rapportino` : 'rapportini da validare',
      tono: senzaRapportino ? 'rosso' : undefined,
    },
    {
      valore: formattaEuro(daFatturare),
      etichetta: 'Da fatturare',
      tono: daFatturare > 0 ? 'ambra' : undefined,
    },
    {
      valore: formattaEuro(daIncassare),
      etichetta: 'Da incassare',
      nota: scaduto > 0 ? `di cui scaduti ${formattaEuro(scaduto)}` : null,
      tono: scaduto > 0 ? 'rosso' : undefined,
    },
  ]

  function totaleColonna(id, carte) {
    if (id === 'da-fatturare') return carte.reduce((s, r) => s + r.economia.daFatturare, 0)
    if (id === 'da-incassare') return carte.reduce((s, r) => s + r.economia.daIncassare, 0)
    if (id === 'incassato') return carte.reduce((s, r) => s + r.economia.incassato, 0)
    return null
  }

  function importoCarta(r) {
    if (r.fase.id === 'da-fatturare') return r.economia.daFatturare
    if (r.fase.id === 'da-incassare') return r.economia.daIncassare
    return r.lavoro.importo
  }

  function rigaCarta(r) {
    const data = quando(r.lavoro)
    if (!data) return 'senza data'
    const squadra = r.lavoro.assegnato?.teamId ? ' · ' + nomeSquadra(r.lavoro.assegnato.teamId) : ''
    return data + squadra
  }

  const ordinate = [...filtrate].sort(
    (a, b) =>
      a.fase.ordine - b.fase.ordine ||
      (a.lavoro.assegnato?.data || '').localeCompare(b.lavoro.assegnato?.data || ''),
  )

  return (
    <>
      <TestataDb
        titolo="Lavori"
        sottotitolo="Ogni lavoro nella sua fase, dal cantiere all'incasso. Clicca per aprire la scheda."
        azioni={[{ testo: '+ Nuovo lavoro', onClick: () => navigate('/nuovo-lavoro') }]}
      />

      <Riepilogo voci={voci} />

      <div className="card sezione">
        <Strumenti
          titolo="Lavori"
          mostrati={filtrate.length}
          totali={righe.length}
          ricerca={ricerca}
          onRicerca={setRicerca}
          segnaposto="Cerca lavoro, cliente, indirizzo..."
        >
          <div className="vista-scelta" role="group" aria-label="Vista">
            {['Tabellone', 'Elenco'].map((v) => (
              <button
                key={v}
                type="button"
                className={vista === v ? 'scelto' : ''}
                onClick={() => cambiaVista(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </Strumenti>

        {righe.length === 0 ? (
          <Vuoto>Nessun lavoro: creane uno con “+ Nuovo lavoro”.</Vuoto>
        ) : vista === 'Tabellone' ? (
          <div className="tabellone">
            {FASI.map((f) => {
              const carte = filtrate.filter((r) => r.fase.id === f.id)
              const totale = totaleColonna(f.id, carte)
              return (
                <div className={'tab-colonna tab-' + f.gruppo} key={f.id}>
                  <div className="tab-testa">
                    <span className="tab-titolo">{f.titolo}</span>
                    <span className="tab-conta">{carte.length}</span>
                  </div>
                  {totale != null && <div className="tab-totale">{formattaEuro(totale)}</div>}
                  <div className="tab-carte">
                    {carte.length === 0 && <p className="tab-vuota">—</p>}
                    {carte.map((r) => (
                      <button
                        type="button"
                        key={r.lavoro.id}
                        className="tab-carta"
                        onClick={() => navigate('/lavori/' + r.lavoro.id)}
                      >
                        <span className="tab-carta-titolo">{r.lavoro.titolo}</span>
                        {nomeCliente(r.lavoro.clienteId) && (
                          <span className="tab-carta-cliente">{nomeCliente(r.lavoro.clienteId)}</span>
                        )}
                        <span className="tab-carta-riga">{rigaCarta(r)}</span>
                        <span className="tab-carta-piede">
                          <span>{formattaEuro(importoCarta(r))}</span>
                          {r.fase.dettaglio && (
                            <span className={'tab-etichetta' + (r.fase.avviso ? ' tab-avviso' : '')}>
                              {r.fase.dettaglio}
                            </span>
                          )}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        ) : filtrate.length === 0 ? (
          <Vuoto>Nessun lavoro trovato.</Vuoto>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Lavoro</th>
                <th>Quando</th>
                <th>Fase</th>
                <th>Importo</th>
                <th>Da incassare</th>
              </tr>
            </thead>
            <tbody>
              {ordinate.map((r) => (
                <tr key={r.lavoro.id} className="db-riga" onClick={() => navigate('/lavori/' + r.lavoro.id)}>
                  <td>
                    <span className="cliente-nome-link">{r.lavoro.titolo}</span>
                    <span className="riga-sub">{nomeCliente(r.lavoro.clienteId) || '—'}</span>
                  </td>
                  <td>{rigaCarta(r)}</td>
                  <td>
                    <span className={'badge ' + r.fase.classe}>{r.fase.titolo}</span>
                    {r.fase.dettaglio && (
                      <span className={'riga-sub' + (r.fase.avviso ? ' db-rosso' : '')}>
                        {r.fase.dettaglio}
                      </span>
                    )}
                  </td>
                  <td>{formattaEuro(r.lavoro.importo)}</td>
                  <td className={r.economia.scaduto > 0 ? 'db-rosso' : undefined}>
                    {r.economia.daIncassare > 0 ? formattaEuro(r.economia.daIncassare) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
