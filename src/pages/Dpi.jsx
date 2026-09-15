import { useEffect, useState } from 'react'
import { caricaDipendenti } from '../data/dipendenti'
import {
  CATEGORIE_DPI,
  caricaCatalogoDpi,
  aggiungiDpi as salvaDpiSuDb,
  eliminaDpi as eliminaDpiDaDb,
  caricaConsegne,
  aggiungiConsegna,
  eliminaConsegna as eliminaConsegnaDaDb,
  calcolaScadenza,
  statoConsegna,
} from '../data/dpi'
import { TestataDb, Riepilogo, PannelloNuovo, Campo, Strumenti, Vuoto } from '../components/Database'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'
import './Dpi.css'

function oggiISO() {
  return new Date().toISOString().slice(0, 10)
}

function formattaData(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('it-IT')
}

const DPI_VUOTO = { nome: '', categoria: CATEGORIE_DPI[0], norma: '', durataMesi: 12, note: '' }
const CONSEGNA_VUOTA = { dpiId: '', dipendente: '', taglia: '', dataConsegna: oggiISO(), note: '' }
const FILTRI = ['Tutte', 'Valido', 'In scadenza', 'Scaduto']

export default function Dpi() {
  const [catalogo, setCatalogo] = useState([])
  const [consegne, setConsegne] = useState([])
  const [dipendenti, setDipendenti] = useState([])
  const [pannello, setPannello] = useState(null) // 'consegna' | 'dispositivo' | null
  const [formDpi, setFormDpi] = useState(DPI_VUOTO)
  const [formConsegna, setFormConsegna] = useState(CONSEGNA_VUOTA)
  const [errore, setErrore] = useState('')
  const [ricerca, setRicerca] = useState('')
  const [filtro, setFiltro] = useState('Tutte')
  const { chiedi, dialogo } = useConferma()

  async function ricarica() {
    const [cat, cons] = await Promise.all([caricaCatalogoDpi(), caricaConsegne()])
    setCatalogo(cat)
    setConsegne(cons)
  }

  useEffect(() => {
    ricarica()
    caricaDipendenti().then(setDipendenti)
  }, [])

  const nomeDpi = (id) => catalogo.find((d) => d.id === id)?.nome || '—'

  function commuta(quale) {
    setErrore('')
    setPannello(pannello === quale ? null : quale)
  }

  async function aggiungiDpi(e) {
    e.preventDefault()
    if (!formDpi.nome.trim()) return setErrore('Indica il nome del dispositivo.')
    await salvaDpiSuDb(formDpi)
    setFormDpi(DPI_VUOTO)
    setPannello(null)
    await ricarica()
  }

  function eliminaDpi(dpi) {
    chiedi({
      titolo: 'Eliminare il dispositivo?',
      messaggio: `"${dpi.nome}" verrà tolto dal catalogo. Le consegne già registrate restano.`,
      onConferma: async () => {
        await eliminaDpiDaDb(dpi.id)
        await ricarica()
      },
    })
  }

  async function registraConsegna(e) {
    e.preventDefault()
    if (!formConsegna.dpiId || !formConsegna.dipendente) {
      return setErrore('Scegli il dispositivo e il dipendente.')
    }
    const dpi = catalogo.find((d) => d.id === formConsegna.dpiId)
    await aggiungiConsegna({
      ...formConsegna,
      scadenza: calcolaScadenza(formConsegna.dataConsegna, dpi?.durataMesi),
    })
    setFormConsegna({ ...CONSEGNA_VUOTA, dataConsegna: formConsegna.dataConsegna })
    setPannello(null)
    await ricarica()
  }

  function eliminaConsegna(consegna) {
    chiedi({
      titolo: 'Eliminare la consegna?',
      messaggio: `La consegna di "${nomeDpi(consegna.dpiId)}" a ${consegna.dipendente} verrà rimossa.`,
      onConferma: async () => {
        await eliminaConsegnaDaDb(consegna.id)
        await ricarica()
      },
    })
  }

  const q = ricerca.trim().toLowerCase()
  const consegneFiltrate = consegne
    .map((c) => ({ ...c, stato: statoConsegna(c) }))
    .filter((c) => {
      if (filtro !== 'Tutte' && c.stato.testo !== filtro) return false
      if (!q) return true
      return [c.dipendente, nomeDpi(c.dpiId), c.taglia]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    })
    .sort((a, b) => (a.scadenza || '').localeCompare(b.scadenza || ''))

  const conteggi = consegne.reduce(
    (acc, c) => {
      const s = statoConsegna(c).testo
      if (s === 'Scaduto') acc.scaduti += 1
      else if (s === 'In scadenza') acc.inScadenza += 1
      else acc.validi += 1
      return acc
    },
    { scaduti: 0, inScadenza: 0, validi: 0 },
  )

  return (
    <>
      <TestataDb
        titolo="Anagrafica DPI"
        sottotitolo="Dispositivi di protezione: catalogo, consegne al personale e scadenze."
        azioni={[
          {
            testo: '+ Nuova consegna',
            onClick: () => commuta('consegna'),
            aperto: pannello === 'consegna',
          },
          {
            testo: '+ Nuovo dispositivo',
            onClick: () => commuta('dispositivo'),
            aperto: pannello === 'dispositivo',
            secondaria: true,
          },
        ]}
      />

      <Riepilogo
        voci={[
          { valore: catalogo.length, etichetta: 'Dispositivi a catalogo' },
          { valore: conteggi.validi, etichetta: 'Consegne valide', tono: 'verde' },
          {
            valore: conteggi.inScadenza,
            etichetta: 'In scadenza (30 gg)',
            tono: conteggi.inScadenza ? 'ambra' : undefined,
          },
          {
            valore: conteggi.scaduti,
            etichetta: 'Scaduti',
            tono: conteggi.scaduti ? 'rosso' : undefined,
          },
        ]}
      />

      <PannelloNuovo
        aperto={pannello === 'consegna'}
        titolo="Consegna a un dipendente"
        onSubmit={registraConsegna}
        testoInvio="Registra consegna"
        errore={errore}
      >
        <Campo etichetta="Dispositivo" largo>
          <select
            value={formConsegna.dpiId}
            onChange={(e) => setFormConsegna({ ...formConsegna, dpiId: e.target.value })}
          >
            <option value="">— scegli —</option>
            {catalogo.map((d) => (
              <option key={d.id} value={d.id}>
                {d.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="Dipendente">
          <select
            value={formConsegna.dipendente}
            onChange={(e) => setFormConsegna({ ...formConsegna, dipendente: e.target.value })}
          >
            <option value="">— scegli —</option>
            {dipendenti.map((d) => (
              <option key={d.id} value={d.nome}>
                {d.nome}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="Taglia">
          <input
            type="text"
            placeholder="Es. 43, L"
            value={formConsegna.taglia}
            onChange={(e) => setFormConsegna({ ...formConsegna, taglia: e.target.value })}
          />
        </Campo>
        <Campo etichetta="Data consegna">
          <input
            type="date"
            value={formConsegna.dataConsegna}
            onChange={(e) => setFormConsegna({ ...formConsegna, dataConsegna: e.target.value })}
          />
        </Campo>
      </PannelloNuovo>

      <PannelloNuovo
        aperto={pannello === 'dispositivo'}
        titolo="Nuovo dispositivo a catalogo"
        onSubmit={aggiungiDpi}
        testoInvio="Aggiungi al catalogo"
        errore={errore}
      >
        <Campo etichetta="Denominazione" largo>
          <input
            type="text"
            placeholder="Es. Occhiali di protezione"
            value={formDpi.nome}
            onChange={(e) => setFormDpi({ ...formDpi, nome: e.target.value })}
          />
        </Campo>
        <Campo etichetta="Categoria">
          <select
            value={formDpi.categoria}
            onChange={(e) => setFormDpi({ ...formDpi, categoria: e.target.value })}
          >
            {CATEGORIE_DPI.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="Norma">
          <input
            type="text"
            placeholder="EN ..."
            value={formDpi.norma}
            onChange={(e) => setFormDpi({ ...formDpi, norma: e.target.value })}
          />
        </Campo>
        <Campo etichetta="Validità (mesi)">
          <input
            type="number"
            min="0"
            value={formDpi.durataMesi}
            onChange={(e) => setFormDpi({ ...formDpi, durataMesi: e.target.value })}
          />
        </Campo>
      </PannelloNuovo>

      <div className="card sezione">
        <Strumenti
          titolo="Consegne"
          mostrati={consegneFiltrate.length}
          totali={consegne.length}
          ricerca={ricerca}
          onRicerca={setRicerca}
          segnaposto="Cerca dipendente o DPI..."
        >
          <select className="db-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            {FILTRI.map((f) => (
              <option key={f} value={f}>
                {f === 'Tutte' ? 'Tutte le consegne' : f}
              </option>
            ))}
          </select>
        </Strumenti>

        {consegneFiltrate.length === 0 ? (
          <Vuoto>
            {consegne.length === 0
              ? 'Nessuna consegna registrata: usa “+ Nuova consegna”.'
              : 'Nessuna consegna trovata.'}
          </Vuoto>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Dipendente</th>
                <th>Dispositivo</th>
                <th>Taglia</th>
                <th>Consegna</th>
                <th>Scadenza</th>
                <th>Stato</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {consegneFiltrate.map((c) => (
                <tr key={c.id}>
                  <td className="cliente-nome-link">{c.dipendente}</td>
                  <td>{nomeDpi(c.dpiId)}</td>
                  <td>{c.taglia || '—'}</td>
                  <td>{formattaData(c.dataConsegna)}</td>
                  <td>
                    {formattaData(c.scadenza)}
                    {c.stato.giorni != null && c.stato.testo !== 'Valido' && (
                      <span className="riga-sub">
                        {c.stato.giorni < 0
                          ? `da ${Math.abs(c.stato.giorni)} giorni`
                          : `fra ${c.stato.giorni} giorni`}
                      </span>
                    )}
                  </td>
                  <td>
                    <span className={'badge ' + c.stato.classe}>{c.stato.testo}</span>
                  </td>
                  <td className="db-azioni-cella">
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={() => eliminaConsegna(c)}
                      aria-label="Elimina consegna"
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

      <div className="card sezione">
        <Strumenti titolo="Catalogo DPI" mostrati={catalogo.length} />
        {catalogo.length === 0 ? (
          <Vuoto>Catalogo vuoto: aggiungi i dispositivi con “+ Nuovo dispositivo”.</Vuoto>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Categoria</th>
                <th>Norma</th>
                <th>Validità</th>
                <th>In uso</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {catalogo.map((d) => (
                <tr key={d.id}>
                  <td className="cliente-nome-link">{d.nome}</td>
                  <td>
                    <span className="badge badge-in-corso">{d.categoria}</span>
                  </td>
                  <td>{d.norma || '—'}</td>
                  <td>{d.durataMesi ? `${d.durataMesi} mesi` : '—'}</td>
                  <td>{consegne.filter((c) => c.dpiId === d.id).length}</td>
                  <td className="db-azioni-cella">
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={() => eliminaDpi(d)}
                      aria-label="Elimina dispositivo"
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

      {dialogo}
    </>
  )
}
