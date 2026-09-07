import { useState } from 'react'
import { createPortal } from 'react-dom'
import './useConferma.css'

// Chiede conferma prima di un'azione irreversibile.
// Uso: const { chiedi, dialogo } = useConferma() — poi {dialogo} nel JSX.
export function useConferma() {
  const [richiesta, setRichiesta] = useState(null)

  function chiedi({ titolo, messaggio, testoConferma = 'Elimina', onConferma }) {
    setRichiesta({ titolo, messaggio, testoConferma, onConferma })
  }

  function conferma() {
    richiesta?.onConferma?.()
    setRichiesta(null)
  }

  const dialogo = richiesta
    ? createPortal(
        <div className="conferma-sfondo" onClick={() => setRichiesta(null)}>
          <div className="conferma-riquadro" onClick={(e) => e.stopPropagation()}>
            <h2 className="conferma-titolo">{richiesta.titolo}</h2>
            <p className="conferma-messaggio">{richiesta.messaggio}</p>
            <div className="conferma-azioni">
              <button
                type="button"
                className="conferma-annulla"
                onClick={() => setRichiesta(null)}
                autoFocus
              >
                Annulla
              </button>
              <button type="button" className="conferma-procedi" onClick={conferma}>
                {richiesta.testoConferma}
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )
    : null

  return { chiedi, dialogo }
}
