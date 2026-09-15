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

// Tutti i lavori in una tabella, ognuno con la sua fase: dal cantiere
// all'incasso. Ogni riga apre la scheda del lavoro.
export default function Lavori() {
  const navigate = useNavigate()
  const [lavori, setLavori] = useState([])
  const [clienti, setClienti] = useState([])
  const [fatture, setFatture] = useState([])
  const [pagamenti, setPagamenti] = useState({})
  const [costoOrario, setCostoOrario] = useState(0)
  const [fase, setFase] = useState('Tutte')
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

  const conta = (id) => righe.filter((r) => r.fase.id === id).length

  const q = ricerca.trim().toLowerCase()
  const filtrate = righe.filter((r) => {
    if (fase !== 'Tutte' && r.fase.id !== fase) return false
    if (!q) return true
    return [r.lavoro.titolo, nomeCliente(r.lavoro.clienteId), r.lavoro.indirizzo]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))
  })

  // prima le fasi più indietro, e dentro ogni fase in ordine di data
  const ordinate = [...filtrate].sort(
    (a, b) =>
      a.fase.ordine - b.fase.ordine ||
      (a.lavoro.assegnato?.data || '').localeCompare(b.lavoro.assegnato?.data || ''),
  )

  function quando(lavoro) {
    const a = lavoro.assegnato
    if (!a?.data) return 'senza data'
    const giorno = new Date(a.data).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
    const ora = a.minuti != null ? ` · ${orarioDaMinuti(a.minuti)}` : ''
    const squadra = a.teamId ? ` · ${nomeSquadra(a.teamId)}` : ''
    return giorno + ora + squadra
  }

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

  return (
    <>
      <TestataDb
        titolo="Lavori"
        sottotitolo="Tutti i lavori con la loro fase, dal cantiere all'incasso. Clicca una riga per aprire la scheda."
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
          <select className="db-filtro" value={fase} onChange={(e) => setFase(e.target.value)}>
            <option value="Tutte">Tutte le fasi</option>
            {FASI.map((f) => (
              <option key={f.id} value={f.id}>
                {f.titolo} ({conta(f.id)})
              </option>
            ))}
          </select>
        </Strumenti>

        {righe.length === 0 ? (
          <Vuoto>Nessun lavoro: creane uno con “+ Nuovo lavoro”.</Vuoto>
        ) : filtrate.length === 0 ? (
          <Vuoto>Nessun lavoro in questa fase.</Vuoto>
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
                <tr
                  key={r.lavoro.id}
                  className="db-riga"
                  onClick={() => navigate('/lavori/' + r.lavoro.id)}
                  title="Apri la scheda del lavoro"
                >
                  <td>
                    <span className="cliente-nome-link">{r.lavoro.titolo}</span>
                    <span className="riga-sub">{nomeCliente(r.lavoro.clienteId) || '—'}</span>
                  </td>
                  <td>{quando(r.lavoro)}</td>
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
