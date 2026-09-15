import { Fragment, useState } from 'react'
import { Link } from 'react-router-dom'
import { formattaEuro } from '../data/lavori'
import {
  TIPI_FATTURA,
  ALIQUOTE_IVA,
  aggiungiFattura,
  eliminaFattura,
  prossimoNumeroFattura,
  scadenzaPredefinita,
  economiaLavoro,
  formattaEuroPreciso as euro,
} from '../data/fatture'
import { MODALITA, aggiungiPagamento, eliminaPagamento } from '../data/pagamenti'
import { Campo, Vuoto } from './Database'
import { useConferma } from './useConferma'
import './EconomiaLavoro.css'

function oggi() {
  return new Date().toISOString().slice(0, 10)
}

function formattaData(iso) {
  return iso ? new Date(iso).toLocaleDateString('it-IT') : '—'
}

// La parte economica di un lavoro: fatture, incassi, costi e margine.
// La usano sia la scheda del lavoro sia Gestione Economica, così i conti
// sono sempre gli stessi.
export default function EconomiaLavoro({
  lavoro,
  fatture,
  pagamenti,
  costoOrario,
  onCambiato,
  onAggiornaLavoro,
}) {
  const e = economiaLavoro(lavoro, fatture, pagamenti, costoOrario)
  const [nuova, setNuova] = useState(null)
  const [incasso, setIncasso] = useState(null)
  const [errore, setErrore] = useState('')
  const { chiedi, dialogo } = useConferma()

  function apriNuova() {
    const data = oggi()
    setErrore('')
    setNuova({
      numero: prossimoNumeroFattura(fatture, data),
      data,
      tipo: lavoro.chiuso ? 'Saldo' : e.fatturato > 0 ? 'SAL' : 'Acconto',
      imponibile: e.daFatturare > 0 ? String(e.daFatturare) : '',
      iva: 22,
      scadenza: scadenzaPredefinita(data),
      note: '',
    })
  }

  async function salvaFattura(ev) {
    ev.preventDefault()
    if (!nuova.numero.trim()) return setErrore('Indica il numero della fattura.')
    if (!(Number(nuova.imponibile) > 0)) return setErrore('L’imponibile deve essere maggiore di zero.')
    const risposta = await aggiungiFattura({ ...nuova, lavoroId: lavoro.id })
    if (risposta.errore) return setErrore('Fattura non salvata: ' + risposta.errore)
    setNuova(null)
    await onCambiato()
  }

  function apriIncasso(x) {
    setIncasso({
      fatturaId: x.fattura.id,
      tipo: x.fattura.tipo,
      importo: String(x.residuo),
      data: oggi(),
      modalita: MODALITA[0],
    })
  }

  async function salvaIncasso(ev) {
    ev.preventDefault()
    const importo = Number(incasso.importo)
    if (!(importo > 0)) return
    await aggiungiPagamento(lavoro.id, {
      tipo: incasso.tipo,
      importo,
      data: incasso.data,
      modalita: incasso.modalita,
      note: '',
      fatturaId: incasso.fatturaId,
    })
    setIncasso(null)
    await onCambiato()
  }

  function togliFattura(x) {
    chiedi({
      titolo: 'Eliminare la fattura?',
      messaggio: `La fattura ${x.fattura.numero} (${euro(x.totale)}) verrà eliminata. Gli incassi già registrati restano, ma senza fattura collegata.`,
      onConferma: async () => {
        await eliminaFattura(x.fattura.id)
        await onCambiato()
      },
    })
  }

  function togliIncasso(p) {
    chiedi({
      titolo: 'Eliminare l’incasso?',
      messaggio: `L’incasso di ${euro(p.importo)} del ${formattaData(p.data)} verrà eliminato.`,
      onConferma: async () => {
        await eliminaPagamento(p.id)
        await onCambiato()
      },
    })
  }

  function aggiornaCosti(patch) {
    onAggiornaLavoro({ costi: { ...(lavoro.costi || {}), ...patch } })
  }

  const numeroFattura = (id) => fatture.find((f) => f.id === id)?.numero
  const totaleNuova = nuova ? (Number(nuova.imponibile) || 0) * (1 + Number(nuova.iva) / 100) : 0
  const tonoMargine =
    e.marginePct == null ? '' : e.margine < 0 ? 'db-rosso' : e.marginePct < 20 ? 'db-ambra' : 'db-verde'

  return (
    <div className="eco">
      <div className="eco-sezione">
        <div className="eco-testa">
          <span className="db-strumenti-titolo">Fatture ({e.fatture.length})</span>
          {!nuova && (
            <button type="button" className="db-btn db-btn-secondario" onClick={apriNuova}>
              + Nuova fattura
            </button>
          )}
        </div>

        {nuova && (
          <form className="eco-form" onSubmit={salvaFattura}>
            <div className="db-form">
              <Campo etichetta="Numero">
                <input
                  type="text"
                  value={nuova.numero}
                  onChange={(ev) => setNuova({ ...nuova, numero: ev.target.value })}
                />
              </Campo>
              <Campo etichetta="Data">
                <input
                  type="date"
                  value={nuova.data}
                  onChange={(ev) =>
                    setNuova({
                      ...nuova,
                      data: ev.target.value,
                      scadenza: scadenzaPredefinita(ev.target.value),
                    })
                  }
                />
              </Campo>
              <Campo etichetta="Tipo">
                <select
                  value={nuova.tipo}
                  onChange={(ev) => setNuova({ ...nuova, tipo: ev.target.value })}
                >
                  {TIPI_FATTURA.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etichetta="Imponibile (€)">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={nuova.imponibile}
                  onChange={(ev) => setNuova({ ...nuova, imponibile: ev.target.value })}
                />
              </Campo>
              <Campo etichetta="IVA">
                <select
                  value={nuova.iva}
                  onChange={(ev) => setNuova({ ...nuova, iva: Number(ev.target.value) })}
                >
                  {ALIQUOTE_IVA.map((a) => (
                    <option key={a} value={a}>
                      {a}%
                    </option>
                  ))}
                </select>
              </Campo>
              <Campo etichetta="Scadenza pagamento">
                <input
                  type="date"
                  value={nuova.scadenza}
                  onChange={(ev) => setNuova({ ...nuova, scadenza: ev.target.value })}
                />
              </Campo>
              <Campo etichetta="Note" largo>
                <input
                  type="text"
                  placeholder="Es. SAL al 50%"
                  value={nuova.note}
                  onChange={(ev) => setNuova({ ...nuova, note: ev.target.value })}
                />
              </Campo>
            </div>
            <p className="eco-nota">
              Totale documento con IVA: <strong>{euro(totaleNuova)}</strong> · resta da fatturare{' '}
              {formattaEuro(e.daFatturare)}
            </p>
            {errore && <p className="messaggio-errore">{errore}</p>}
            <div className="db-form-azioni">
              <button type="button" className="db-btn db-btn-secondario" onClick={() => setNuova(null)}>
                Annulla
              </button>
              <button type="submit" className="db-btn">
                Salva fattura
              </button>
            </div>
          </form>
        )}

        {e.fatture.length === 0 ? (
          <Vuoto>Nessuna fattura emessa per questo lavoro.</Vuoto>
        ) : (
          <table className="task-table eco-tabella">
            <thead>
              <tr>
                <th>Numero</th>
                <th>Data</th>
                <th>Tipo</th>
                <th>Imponibile</th>
                <th>Totale</th>
                <th>Scadenza</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {e.fatture.map((x) => (
                <Fragment key={x.fattura.id}>
                  <tr>
                    <td className="cliente-nome-link">{x.fattura.numero}</td>
                    <td>{formattaData(x.fattura.data)}</td>
                    <td>{x.fattura.tipo}</td>
                    <td>
                      {euro(x.fattura.imponibile)}
                      <span className="riga-sub">IVA {x.fattura.iva}%</span>
                    </td>
                    <td>
                      {euro(x.totale)}
                      {x.pagato > 0 && x.residuo > 0.009 && (
                        <span className="riga-sub">resta {euro(x.residuo)}</span>
                      )}
                    </td>
                    <td className={x.scaduta ? 'db-rosso' : undefined}>
                      {formattaData(x.fattura.scadenza)}
                    </td>
                    <td>
                      <span className={'badge ' + x.classe}>{x.testo}</span>
                    </td>
                    <td className="db-azioni-cella">
                      {x.residuo > 0.009 && (
                        <button type="button" className="btn-apri" onClick={() => apriIncasso(x)}>
                          Incassa
                        </button>
                      )}
                      <button
                        type="button"
                        className="riga-elimina"
                        onClick={() => togliFattura(x)}
                        aria-label="Elimina fattura"
                      >
                        ×
                      </button>
                    </td>
                  </tr>
                  {incasso?.fatturaId === x.fattura.id && (
                    <tr className="db-dettaglio">
                      <td colSpan={8}>
                        <form className="eco-incasso" onSubmit={salvaIncasso}>
                          <Campo etichetta="Importo incassato (€)">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={incasso.importo}
                              onChange={(ev) => setIncasso({ ...incasso, importo: ev.target.value })}
                            />
                          </Campo>
                          <Campo etichetta="Data">
                            <input
                              type="date"
                              value={incasso.data}
                              onChange={(ev) => setIncasso({ ...incasso, data: ev.target.value })}
                            />
                          </Campo>
                          <Campo etichetta="Modalità">
                            <select
                              value={incasso.modalita}
                              onChange={(ev) => setIncasso({ ...incasso, modalita: ev.target.value })}
                            >
                              {MODALITA.map((m) => (
                                <option key={m} value={m}>
                                  {m}
                                </option>
                              ))}
                            </select>
                          </Campo>
                          <button type="submit" className="db-btn">
                            Registra incasso
                          </button>
                          <button
                            type="button"
                            className="db-btn db-btn-secondario"
                            onClick={() => setIncasso(null)}
                          >
                            Annulla
                          </button>
                        </form>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="eco-sezione">
        <span className="db-strumenti-titolo">Incassi ({e.incassi.length})</span>
        {e.incassi.length === 0 ? (
          <Vuoto>Nessun incasso registrato: si registrano dal pulsante “Incassa” sulla fattura.</Vuoto>
        ) : (
          <table className="task-table eco-tabella">
            <thead>
              <tr>
                <th>Data</th>
                <th>Importo</th>
                <th>Modalità</th>
                <th>Fattura</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {e.incassi.map((p) => (
                <tr key={p.id}>
                  <td>{formattaData(p.data)}</td>
                  <td className="db-verde">{euro(p.importo)}</td>
                  <td>{p.modalita}</td>
                  <td>
                    {numeroFattura(p.fattura_id) || <span className="db-muto">senza fattura</span>}
                  </td>
                  <td className="db-azioni-cella">
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={() => togliIncasso(p)}
                      aria-label="Elimina incasso"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="eco-sezione">
        <span className="db-strumenti-titolo">Costi e margine</span>
        <div className="eco-costi">
          <div className="eco-riga-costo">
            <span>Manodopera</span>
            <span className="eco-spiega">
              {e.ore} h × {e.persone} {e.persone === 1 ? 'persona' : 'persone'} ×{' '}
              {formattaEuro(costoOrario)}/h
              {e.stimata ? ' · stima dalla durata prevista' : ' · dal rapportino'}
            </span>
            <span>{euro(e.manodopera)}</span>
          </div>
          <div className="eco-riga-costo">
            <span>Materiali</span>
            <span className="eco-spiega">
              <input
                type="number"
                className="db-cella-input"
                min="0"
                step="1"
                placeholder="0"
                value={lavoro.costi?.materiali ?? ''}
                onChange={(ev) => aggiornaCosti({ materiali: Number(ev.target.value) || 0 })}
              />{' '}
              € spesi per i materiali
            </span>
            <span>{euro(e.materiali)}</span>
          </div>
          <div className="eco-riga-costo">
            <span>Altri costi</span>
            <span className="eco-spiega">
              <input
                type="number"
                className="db-cella-input"
                min="0"
                step="1"
                placeholder="0"
                value={lavoro.costi?.altri ?? ''}
                onChange={(ev) => aggiornaCosti({ altri: Number(ev.target.value) || 0 })}
              />{' '}
              € noli, subappalti, trasferte
            </span>
            <span>{euro(e.altri)}</span>
          </div>
          <div className="eco-riga-costo eco-totale">
            <span>Totale costi</span>
            <span className="eco-spiega">ricavo {formattaEuro(e.ricavo)} (IVA esclusa)</span>
            <span>{euro(e.costi)}</span>
          </div>
          <div className="eco-riga-costo eco-margine">
            <span>Margine</span>
            <span className="eco-spiega">
              {e.marginePct != null ? `${e.marginePct}% del ricavo` : 'nessun importo concordato'}
            </span>
            <span className={tonoMargine}>{euro(e.margine)}</span>
          </div>
        </div>
        <p className="eco-nota">
          Il costo orario ({formattaEuro(costoOrario)}/h) si imposta in{' '}
          <Link to="/impostazioni">Impostazioni</Link>.
        </p>
      </div>

      {dialogo}
    </div>
  )
}
