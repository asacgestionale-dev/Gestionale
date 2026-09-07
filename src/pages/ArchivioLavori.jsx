import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { caricaLavori, formattaEuro } from '../data/lavori'
import { caricaClienti } from '../data/clienti'
import { SQUADRE_BASE } from '../data/squadre'
import './NuovoLavoro.css'
import './SchedaCliente.css'

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

// i lavori salvati prima usavano l'ora piena, ora si conservano i minuti
function orarioAssegnato(assegnato) {
  const minuti = assegnato.minuti ?? assegnato.ora * 60
  const h = Math.floor(minuti / 60)
  const m = minuti % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function statoLavoro(l) {
  if (l.completato) return { testo: 'Svolto', classe: 'badge-completato' }
  if (l.assegnato) return { testo: 'Assegnato', classe: 'badge-in-corso' }
  return { testo: 'Da assegnare', classe: 'badge-da-fare' }
}

export default function ArchivioLavori() {
  const navigate = useNavigate()
  const [lavori] = useState(caricaLavori)
  const [clienti] = useState(caricaClienti)
  const [ricerca, setRicerca] = useState('')
  const [filtroStato, setFiltroStato] = useState('Tutti')

  const nomeCliente = (id) => clienti.find((c) => c.id === id)?.nome || '—'
  const nomeSquadra = (teamId) => SQUADRE_BASE.find((s) => s.id === teamId)?.nome || '—'

  const q = ricerca.trim().toLowerCase()
  const filtrati = lavori.filter((l) => {
    const stato = statoLavoro(l).testo
    if (filtroStato !== 'Tutti' && stato !== filtroStato) return false
    if (!q) return true
    return [l.titolo, l.note, l.indirizzo, nomeCliente(l.clienteId), ...(l.materiali || [])]
      .filter(Boolean)
      .some((campo) => campo.toLowerCase().includes(q))
  })

  return (
    <>
      <h1 className="page-title">Archivio Lavori</h1>
      <p className="page-subtitle">Tutti i lavori: clicca su una riga per aprire la scheda</p>

      <div className="card sezione">
        <div className="lista-head">
          <span className="job-list-label">
            Lavori ({filtrati.length}
            {filtrati.length !== lavori.length && ` di ${lavori.length}`})
          </span>
          <div className="upload-riga">
            <select value={filtroStato} onChange={(e) => setFiltroStato(e.target.value)}>
              <option>Tutti</option>
              <option>Da assegnare</option>
              <option>Assegnato</option>
              <option>Svolto</option>
            </select>
            <input
              type="search"
              className="campo-ricerca"
              placeholder="Cerca lavoro..."
              value={ricerca}
              onChange={(e) => setRicerca(e.target.value)}
            />
          </div>
        </div>

        {filtrati.length === 0 ? (
          <p className="job-list-empty">
            {lavori.length === 0 ? 'Nessun lavoro registrato.' : 'Nessun lavoro trovato.'}
          </p>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Lavoro</th>
                <th>Cliente</th>
                <th>Data</th>
                <th>Stato</th>
                <th>Squadra</th>
                <th>Importo</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((l) => {
                const stato = statoLavoro(l)
                const residuo = (l.importo || 0) - (l.incassato || 0)
                return (
                  <tr
                    key={l.id}
                    className="riga-cliente"
                    onClick={() => navigate('/lavori/' + l.id)}
                    title="Apri la scheda del lavoro"
                  >
                    <td className="cliente-nome-link">
                      {l.titolo}
                      {l.indirizzo && <span className="riga-sub">{l.indirizzo}</span>}
                    </td>
                    <td>{nomeCliente(l.clienteId)}</td>
                    <td>{formattaData(l.creatoIl)}</td>
                    <td>
                      <span className={'badge ' + stato.classe}>{stato.testo}</span>
                    </td>
                    <td>
                      {l.assegnato
                        ? `${nomeSquadra(l.assegnato.teamId)} · ${orarioAssegnato(l.assegnato)}`
                        : '—'}
                    </td>
                    <td>{formattaEuro(l.importo)}</td>
                    <td className={residuo > 0 ? 'saldo-aperto' : 'saldo-chiuso'}>
                      {residuo > 0 ? formattaEuro(residuo) : 'Saldato'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </>
  )
}
