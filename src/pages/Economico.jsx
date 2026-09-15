import { Fragment, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { caricaLavori, aggiornaLavoro, formattaEuro } from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import {
  caricaFatture,
  economiaLavoro,
  statoFattura,
  formattaEuroPreciso as euro,
} from '../data/fatture'
import { caricaPagamenti } from '../data/pagamenti'
import { caricaEconomia } from '../data/impostazioni'
import EconomiaLavoro from '../components/EconomiaLavoro'
import { TestataDb, Riepilogo, Strumenti, Vuoto } from '../components/Database'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Consuntivazione.css'
import './Lavori.css'

const VISTE = [
  'Da fatturare',
  'Fatture da incassare',
  'Fatture scadute',
  'Tutte le fatture',
  'Margini',
]

function formattaData(iso) {
  return iso ? new Date(iso).toLocaleDateString('it-IT') : '—'
}

// Gestione Economica: cosa fatturare, cosa incassare e quanto si guadagna.
// Ogni riga si apre sul posto con fatture, incassi e costi del lavoro.
export default function Economico() {
  const [lavori, setLavori] = useState([])
  const [clienti, setClienti] = useState([])
  const [fatture, setFatture] = useState([])
  const [pagamenti, setPagamenti] = useState({})
  const [costoOrario, setCostoOrario] = useState(0)
  const [vista, setVista] = useState(VISTE[0])
  const [ricerca, setRicerca] = useState('')
  const [aperto, setAperto] = useState(null)

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

  async function ricaricaSoldi() {
    const [f, p] = await Promise.all([caricaFatture(), caricaPagamenti()])
    setFatture(f)
    setPagamenti(p)
  }

  function aggiornaLavoroLocale(id, patch) {
    setLavori((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)))
    aggiornaLavoro(id, patch)
  }

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.nome || ''

  const righe = lavori.map((l) => ({
    lavoro: l,
    economia: economiaLavoro(l, fatture, pagamenti, costoOrario),
  }))
  const perId = Object.fromEntries(righe.map((r) => [r.lavoro.id, r]))
  const chiusi = righe.filter((r) => r.lavoro.chiuso)

  const anno = String(new Date().getFullYear())
  const daFatturare = chiusi.reduce((s, r) => s + r.economia.daFatturare, 0)
  const lavoriDaFatturare = chiusi.filter((r) => r.economia.daFatturare > 0.009).length
  const daIncassare = righe.reduce((s, r) => s + r.economia.daIncassare, 0)
  const scaduto = righe.reduce((s, r) => s + r.economia.scaduto, 0)
  const incassatoAnno = Object.values(pagamenti)
    .flat()
    .filter((p) => String(p.data || '').startsWith(anno))
    .reduce((s, p) => s + (Number(p.importo) || 0), 0)
  const conRicavo = chiusi.filter((r) => r.economia.ricavo > 0)
  const margine = conRicavo.reduce((s, r) => s + r.economia.margine, 0)
  const ricavo = conRicavo.reduce((s, r) => s + r.economia.ricavo, 0)
  const marginePct = ricavo > 0 ? Math.round((margine / ricavo) * 100) : null

  const q = ricerca.trim().toLowerCase()
  const corrisponde = (lavoro, extra = '') =>
    !q ||
    [lavoro.titolo, nomeCliente(lavoro.clienteId), extra]
      .filter(Boolean)
      .some((v) => v.toLowerCase().includes(q))

  function interruttore(chiave) {
    setAperto(aperto === chiave ? null : chiave)
  }

  function dettaglio(lavoro, colonne) {
    return (
      <tr className="db-dettaglio">
        <td colSpan={colonne}>
          <div className="eco-dettaglio-testa">
            <span className="job-list-label">
              {lavoro.titolo}
              {nomeCliente(lavoro.clienteId) && ` · ${nomeCliente(lavoro.clienteId)}`}
            </span>
            <Link to={'/lavori/' + lavoro.id} className="vai-assegnazione">
              Apri la scheda del lavoro →
            </Link>
          </div>
          <EconomiaLavoro
            lavoro={lavoro}
            fatture={fatture}
            pagamenti={pagamenti}
            costoOrario={costoOrario}
            onCambiato={ricaricaSoldi}
            onAggiornaLavoro={(patch) => aggiornaLavoroLocale(lavoro.id, patch)}
          />
        </td>
      </tr>
    )
  }

  function cellaLavoro(lavoro) {
    return (
      <td>
        <span className="cliente-nome-link">{lavoro.titolo}</span>
        <span className="riga-sub">{nomeCliente(lavoro.clienteId) || '—'}</span>
      </td>
    )
  }

  let contenuto
  let mostrati = 0

  if (vista === 'Da fatturare') {
    const elenco = chiusi.filter((r) => r.economia.daFatturare > 0.009 && corrisponde(r.lavoro))
    mostrati = elenco.length
    contenuto =
      elenco.length === 0 ? (
        <Vuoto>Niente da fatturare: tutti i lavori chiusi sono già fatturati.</Vuoto>
      ) : (
        <table className="task-table">
          <thead>
            <tr>
              <th>Lavoro</th>
              <th>Chiuso il</th>
              <th>Importo</th>
              <th>Già fatturato</th>
              <th>Da fatturare</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {elenco.map((r) => {
              const chiave = 'l:' + r.lavoro.id
              return (
                <Fragment key={chiave}>
                  <tr
                    className={'db-riga' + (aperto === chiave ? ' db-riga-aperta' : '')}
                    onClick={() => interruttore(chiave)}
                  >
                    {cellaLavoro(r.lavoro)}
                    <td>{formattaData(r.lavoro.validatoIl)}</td>
                    <td>{formattaEuro(r.economia.importo)}</td>
                    <td>{formattaEuro(r.economia.fatturato)}</td>
                    <td className="db-ambra">{formattaEuro(r.economia.daFatturare)}</td>
                    <td className="db-azioni-cella">
                      <span className="btn-apri">{aperto === chiave ? 'Chiudi' : 'Fattura'}</span>
                    </td>
                  </tr>
                  {aperto === chiave && dettaglio(r.lavoro, 6)}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )
  } else if (vista === 'Margini') {
    const elenco = righe
      .filter(
        (r) =>
          (r.lavoro.chiuso || r.lavoro.consuntivo) && r.economia.ricavo > 0 && corrisponde(r.lavoro),
      )
      .sort((a, b) => (a.economia.marginePct ?? 0) - (b.economia.marginePct ?? 0))
    mostrati = elenco.length
    contenuto =
      elenco.length === 0 ? (
        <Vuoto>I margini compaiono quando un lavoro ha il rapportino o è chiuso.</Vuoto>
      ) : (
        <table className="task-table">
          <thead>
            <tr>
              <th>Lavoro</th>
              <th>Ricavo</th>
              <th>Manodopera</th>
              <th>Materiali e altri</th>
              <th>Margine</th>
              <th>%</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {elenco.map((r) => {
              const chiave = 'm:' + r.lavoro.id
              const e = r.economia
              const tono = e.margine < 0 ? 'db-rosso' : e.marginePct < 20 ? 'db-ambra' : 'db-verde'
              return (
                <Fragment key={chiave}>
                  <tr
                    className={'db-riga' + (aperto === chiave ? ' db-riga-aperta' : '')}
                    onClick={() => interruttore(chiave)}
                  >
                    {cellaLavoro(r.lavoro)}
                    <td>{formattaEuro(e.ricavo)}</td>
                    <td>
                      {formattaEuro(e.manodopera)}
                      <span className="riga-sub">
                        {e.ore} h × {e.persone} {e.persone === 1 ? 'persona' : 'persone'}
                      </span>
                    </td>
                    <td>{formattaEuro(e.materiali + e.altri)}</td>
                    <td className={tono}>{formattaEuro(e.margine)}</td>
                    <td className={tono}>{e.marginePct}%</td>
                    <td className="db-azioni-cella">
                      <span className="btn-apri">{aperto === chiave ? 'Chiudi' : 'Costi'}</span>
                    </td>
                  </tr>
                  {aperto === chiave && dettaglio(r.lavoro, 7)}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )
  } else {
    const elenco = fatture
      .map((f) => ({ fattura: f, riga: perId[f.lavoroId], ...statoFattura(f, pagamenti) }))
      .filter((x) => x.riga)
      .filter((x) => {
        if (vista === 'Fatture da incassare') return x.residuo > 0.009
        if (vista === 'Fatture scadute') return x.scaduta
        return true
      })
      .filter((x) => corrisponde(x.riga.lavoro, x.fattura.numero))
    mostrati = elenco.length
    contenuto =
      elenco.length === 0 ? (
        <Vuoto>
          {fatture.length === 0
            ? 'Nessuna fattura emessa: si emettono dalla scheda del lavoro o da “Da fatturare”.'
            : 'Nessuna fattura in questa vista.'}
        </Vuoto>
      ) : (
        <table className="task-table">
          <thead>
            <tr>
              <th>Numero</th>
              <th>Lavoro</th>
              <th>Tipo</th>
              <th>Totale</th>
              <th>Scadenza</th>
              <th>Stato</th>
              <th>Da incassare</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {elenco.map((x) => {
              const chiave = 'f:' + x.fattura.id
              return (
                <Fragment key={chiave}>
                  <tr
                    className={'db-riga' + (aperto === chiave ? ' db-riga-aperta' : '')}
                    onClick={() => interruttore(chiave)}
                  >
                    <td>
                      <span className="cliente-nome-link">{x.fattura.numero}</span>
                      <span className="riga-sub">{formattaData(x.fattura.data)}</span>
                    </td>
                    {cellaLavoro(x.riga.lavoro)}
                    <td>{x.fattura.tipo}</td>
                    <td>{euro(x.totale)}</td>
                    <td className={x.scaduta ? 'db-rosso' : undefined}>
                      {formattaData(x.fattura.scadenza)}
                    </td>
                    <td>
                      <span className={'badge ' + x.classe}>{x.testo}</span>
                    </td>
                    <td className={x.scaduta ? 'db-rosso' : undefined}>
                      {x.residuo > 0.009 ? euro(x.residuo) : '—'}
                    </td>
                    <td className="db-azioni-cella">
                      <span className="btn-apri">
                        {aperto === chiave ? 'Chiudi' : x.residuo > 0.009 ? 'Incassa' : 'Apri'}
                      </span>
                    </td>
                  </tr>
                  {aperto === chiave && dettaglio(x.riga.lavoro, 8)}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      )
  }

  return (
    <>
      <TestataDb
        titolo="Gestione Economica"
        sottotitolo="Cosa fatturare, cosa incassare e quanto guadagni su ogni lavoro. Clicca una riga per gestirla."
      />

      <Riepilogo
        voci={[
          {
            valore: formattaEuro(daFatturare),
            etichetta: 'Da fatturare',
            tono: daFatturare > 0 ? 'ambra' : undefined,
            nota: `${lavoriDaFatturare} ${lavoriDaFatturare === 1 ? 'lavoro chiuso' : 'lavori chiusi'}`,
          },
          { valore: formattaEuro(daIncassare), etichetta: 'Fatturato da incassare' },
          {
            valore: formattaEuro(scaduto),
            etichetta: 'Scaduto',
            tono: scaduto > 0 ? 'rosso' : undefined,
            nota: 'fatture oltre la scadenza',
          },
          { valore: formattaEuro(incassatoAnno), etichetta: `Incassato nel ${anno}`, tono: 'verde' },
          {
            valore: formattaEuro(margine),
            etichetta: 'Margine lavori chiusi',
            tono: margine < 0 ? 'rosso' : 'verde',
            nota: marginePct != null ? `${marginePct}% del ricavo` : 'nessun lavoro chiuso',
          },
        ]}
      />

      <div className="card sezione">
        <Strumenti
          titolo={vista}
          mostrati={mostrati}
          ricerca={ricerca}
          onRicerca={setRicerca}
          segnaposto="Cerca lavoro, cliente, numero..."
        >
          <select
            className="db-filtro"
            value={vista}
            onChange={(e) => {
              setVista(e.target.value)
              setAperto(null)
            }}
          >
            {VISTE.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </Strumenti>

        {contenuto}

        <p className="eco-nota">
          Importi dei lavori e imponibili al netto dell'IVA; totali delle fatture e incassi
          comprendono l'IVA. Manodopera calcolata con {formattaEuro(costoOrario)}/h (
          <Link to="/impostazioni">cambia il costo orario</Link>).
        </p>
      </div>
    </>
  )
}
