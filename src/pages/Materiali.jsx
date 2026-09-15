import { useEffect, useState } from 'react'
import {
  CATEGORIE_MATERIALI,
  UNITA,
  caricaMateriali,
  aggiungiMateriale,
  aggiornaMateriale,
  eliminaMateriale as eliminaMaterialeDaDb,
  sottoScorta,
  valoreMateriale,
} from '../data/materiali'
import { formattaEuroPreciso } from '../data/fatture'
import { formattaEuro } from '../data/lavori'
import { TestataDb, Riepilogo, PannelloNuovo, Campo, Strumenti, Vuoto } from '../components/Database'
import { useConferma } from '../components/useConferma'
import './NuovoLavoro.css'
import './SchedaCliente.css'

const VUOTO = {
  nome: '',
  categoria: CATEGORIE_MATERIALI[0],
  unita: UNITA[0],
  prezzo: '',
  scorta: '',
  scortaMinima: '',
  fornitore: '',
}

export default function Materiali() {
  const [materiali, setMateriali] = useState([])
  const [aperto, setAperto] = useState(false)
  const [form, setForm] = useState(VUOTO)
  const [errore, setErrore] = useState('')
  const [ricerca, setRicerca] = useState('')
  const [filtro, setFiltro] = useState('Tutti')
  const { chiedi, dialogo } = useConferma()

  async function ricarica() {
    setMateriali(await caricaMateriali())
  }

  useEffect(() => {
    ricarica()
  }, [])

  function aggiorna(campo, valore) {
    setForm((prev) => ({ ...prev, [campo]: valore }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!form.nome.trim()) return setErrore('Il nome del materiale è obbligatorio.')
    const risposta = await aggiungiMateriale(form)
    if (risposta.errore) return setErrore('Materiale non salvato: ' + risposta.errore)
    setErrore('')
    setForm(VUOTO)
    setAperto(false)
    await ricarica()
  }

  // la scorta si corregge direttamente nella tabella, dopo un carico o un prelievo
  async function cambiaScorta(materiale, valore) {
    const scorta = Number(valore) || 0
    if (scorta === materiale.scorta) return
    setMateriali((prev) => prev.map((m) => (m.id === materiale.id ? { ...m, scorta } : m)))
    await aggiornaMateriale(materiale.id, { scorta })
  }

  function elimina(materiale) {
    chiedi({
      titolo: 'Eliminare il materiale?',
      messaggio: `"${materiale.nome}" verrà tolto dal magazzino.`,
      onConferma: async () => {
        await eliminaMaterialeDaDb(materiale.id)
        await ricarica()
      },
    })
  }

  const inCategoria = [...new Set(materiali.map((m) => m.categoria).filter(Boolean))]
  const sotto = materiali.filter(sottoScorta)
  const valore = materiali.reduce((s, m) => s + valoreMateriale(m), 0)

  const q = ricerca.trim().toLowerCase()
  const filtrati = materiali.filter((m) => {
    if (filtro === 'Sotto scorta' && !sottoScorta(m)) return false
    if (filtro !== 'Tutti' && filtro !== 'Sotto scorta' && m.categoria !== filtro) return false
    if (!q) return true
    return [m.nome, m.categoria, m.fornitore].filter(Boolean).some((v) => v.toLowerCase().includes(q))
  })

  return (
    <>
      <TestataDb
        titolo="Materiali"
        sottotitolo="Magazzino: scorte, prezzi e fornitori. La scorta si corregge direttamente in tabella."
        azioni={[{ testo: '+ Nuovo materiale', onClick: () => setAperto((v) => !v), aperto }]}
      />

      <Riepilogo
        voci={[
          { valore: materiali.length, etichetta: 'Articoli a magazzino' },
          {
            valore: sotto.length,
            etichetta: 'Sotto scorta minima',
            tono: sotto.length ? 'rosso' : 'verde',
            nota: sotto.length ? 'da riordinare' : 'scorte in regola',
          },
          { valore: formattaEuro(valore), etichetta: 'Valore del magazzino', nota: 'prezzo × scorta' },
          { valore: inCategoria.length, etichetta: 'Categorie' },
        ]}
      />

      <PannelloNuovo
        aperto={aperto}
        titolo="Nuovo materiale"
        onSubmit={handleSubmit}
        testoInvio="Aggiungi materiale"
        errore={errore}
      >
        <Campo etichetta="Materiale" largo>
          <input
            type="text"
            placeholder="Es. Cemento Portland 25 kg"
            value={form.nome}
            onChange={(e) => aggiorna('nome', e.target.value)}
          />
        </Campo>
        <Campo etichetta="Categoria">
          <select value={form.categoria} onChange={(e) => aggiorna('categoria', e.target.value)}>
            {CATEGORIE_MATERIALI.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="Unità di misura">
          <select value={form.unita} onChange={(e) => aggiorna('unita', e.target.value)}>
            {UNITA.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
          </select>
        </Campo>
        <Campo etichetta="Prezzo unitario (€)">
          <input
            type="number"
            min="0"
            step="0.01"
            value={form.prezzo}
            onChange={(e) => aggiorna('prezzo', e.target.value)}
          />
        </Campo>
        <Campo etichetta="Scorta attuale">
          <input
            type="number"
            min="0"
            step="1"
            value={form.scorta}
            onChange={(e) => aggiorna('scorta', e.target.value)}
          />
        </Campo>
        <Campo etichetta="Scorta minima">
          <input
            type="number"
            min="0"
            step="1"
            value={form.scortaMinima}
            onChange={(e) => aggiorna('scortaMinima', e.target.value)}
          />
        </Campo>
        <Campo etichetta="Fornitore">
          <input
            type="text"
            value={form.fornitore}
            onChange={(e) => aggiorna('fornitore', e.target.value)}
          />
        </Campo>
      </PannelloNuovo>

      <div className="card sezione">
        <Strumenti
          titolo="Articoli"
          mostrati={filtrati.length}
          totali={materiali.length}
          ricerca={ricerca}
          onRicerca={setRicerca}
          segnaposto="Cerca materiale o fornitore..."
        >
          <select className="db-filtro" value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="Tutti">Tutte le categorie</option>
            <option value="Sotto scorta">Sotto scorta</option>
            {CATEGORIE_MATERIALI.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Strumenti>

        {filtrati.length === 0 ? (
          <Vuoto>
            {materiali.length === 0
              ? 'Magazzino vuoto: aggiungi il primo articolo con “+ Nuovo materiale”.'
              : 'Nessun materiale trovato.'}
          </Vuoto>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Materiale</th>
                <th>Categoria</th>
                <th>Scorta</th>
                <th>Minima</th>
                <th>Prezzo</th>
                <th>Valore</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtrati.map((m) => (
                <tr key={m.id}>
                  <td>
                    <span className="cliente-nome-link">{m.nome}</span>
                    {m.fornitore && <span className="riga-sub">{m.fornitore}</span>}
                  </td>
                  <td>
                    <span className="badge badge-in-corso">{m.categoria || '—'}</span>
                  </td>
                  <td>
                    <input
                      key={m.id + ':' + m.scorta}
                      type="number"
                      min="0"
                      step="1"
                      className={'db-cella-input' + (sottoScorta(m) ? ' db-rosso' : '')}
                      defaultValue={m.scorta}
                      onBlur={(e) => cambiaScorta(m, e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
                      aria-label={`Scorta di ${m.nome}`}
                    />{' '}
                    <span className="db-muto">{m.unita}</span>
                  </td>
                  <td className={sottoScorta(m) ? 'db-rosso' : undefined}>
                    {m.scortaMinima ? `${m.scortaMinima} ${m.unita}` : '—'}
                  </td>
                  <td>
                    {formattaEuroPreciso(m.prezzo)}
                    <span className="riga-sub">al {m.unita}</span>
                  </td>
                  <td>{formattaEuro(valoreMateriale(m))}</td>
                  <td className="db-azioni-cella">
                    <button
                      type="button"
                      className="riga-elimina"
                      onClick={() => elimina(m)}
                      aria-label="Elimina materiale"
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
