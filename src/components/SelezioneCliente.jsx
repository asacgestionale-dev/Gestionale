import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { caricaClienti, salvaClienti } from '../data/clienti'
import InputIndirizzo from './InputIndirizzo'
import './SelezioneCliente.css'

const VUOTO = { nome: '', indirizzo: '', referente: '', telefono: '' }

// Campo cliente con ricerca libera fra quelli in anagrafica e creazione al volo.
export default function SelezioneCliente({ clienti, clienteId, onCambia, onClientiAggiornati }) {
  const selezionato = clienti.find((c) => c.id === clienteId)
  const [testo, setTesto] = useState(selezionato?.nome || '')
  const [aperto, setAperto] = useState(false)
  const [modale, setModale] = useState(false)
  const [nuovo, setNuovo] = useState(VUOTO)
  const contenitore = useRef(null)

  // il testo segue il cliente scelto altrove (es. dopo il salvataggio del lavoro)
  useEffect(() => {
    setTesto(clienti.find((c) => c.id === clienteId)?.nome || '')
  }, [clienteId, clienti])

  useEffect(() => {
    function fuori(e) {
      if (contenitore.current && !contenitore.current.contains(e.target)) setAperto(false)
    }
    document.addEventListener('mousedown', fuori)
    return () => document.removeEventListener('mousedown', fuori)
  }, [])

  const q = testo.trim().toLowerCase()
  const filtrati = q
    ? clienti.filter((c) => c.nome.toLowerCase().includes(q))
    : clienti

  function scegli(c) {
    onCambia(c.id)
    setTesto(c.nome)
    setAperto(false)
  }

  function salvaNuovoCliente(e) {
    e.preventDefault()
    if (!nuovo.nome.trim()) return
    const cliente = { ...nuovo, id: 'c' + Date.now() }
    const lista = [...caricaClienti(), cliente]
    salvaClienti(lista)
    onClientiAggiornati(lista)
    onCambia(cliente.id)
    setTesto(cliente.nome)
    setNuovo(VUOTO)
    setModale(false)
  }

  return (
    <>
      <div className="cliente-riga">
        <div className="cliente-campo" ref={contenitore}>
          <input
            type="text"
            placeholder="Cerca cliente..."
            value={testo}
            onChange={(e) => {
              setTesto(e.target.value)
              setAperto(true)
              if (selezionato && e.target.value !== selezionato.nome) onCambia('')
            }}
            onFocus={() => setAperto(true)}
            autoComplete="off"
          />
          {aperto && (
            <ul className="cliente-suggerimenti">
              {filtrati.length === 0 && (
                <li className="cliente-vuoto">Nessun cliente trovato</li>
              )}
              {filtrati.map((c) => (
                <li key={c.id}>
                  <button type="button" onClick={() => scegli(c)}>
                    <span className="cliente-nome">{c.nome}</span>
                    {c.indirizzo && <span className="cliente-sede">{c.indirizzo}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <button
          type="button"
          className="cliente-aggiungi"
          onClick={() => setModale(true)}
          title="Aggiungi un nuovo cliente in anagrafica"
        >
          +
        </button>
      </div>

      {/* la finestra vive fuori dal form della pagina: i form annidati non sono validi in HTML */}
      {modale &&
        createPortal(
          <div className="modale-sfondo" onClick={() => setModale(false)}>
          <div className="modale" onClick={(e) => e.stopPropagation()}>
            <h2 className="modale-titolo">Nuovo cliente</h2>
            <p className="modale-sotto">Verrà aggiunto anche alle Schede Clienti</p>

            <form className="job-form modale-form" onSubmit={salvaNuovoCliente}>
              <input
                type="text"
                placeholder="Ragione sociale"
                value={nuovo.nome}
                onChange={(e) => setNuovo({ ...nuovo, nome: e.target.value })}
                autoFocus
              />
              <InputIndirizzo
                placeholder="Indirizzo sede"
                value={nuovo.indirizzo}
                onChange={(v) => setNuovo({ ...nuovo, indirizzo: v })}
              />
              <input
                type="text"
                placeholder="Referente"
                value={nuovo.referente}
                onChange={(e) => setNuovo({ ...nuovo, referente: e.target.value })}
              />
              <input
                type="text"
                placeholder="Telefono"
                value={nuovo.telefono}
                onChange={(e) => setNuovo({ ...nuovo, telefono: e.target.value })}
              />

              <div className="modale-azioni">
                <button type="button" className="modale-annulla" onClick={() => setModale(false)}>
                  Annulla
                </button>
                <button type="submit">Salva cliente</button>
              </div>
            </form>
          </div>
          </div>,
          document.body,
        )}
    </>
  )
}
