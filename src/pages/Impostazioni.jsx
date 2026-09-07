import { useState } from 'react'
import { TEMI, caricaTema, applicaTema } from '../data/tema'
import './Impostazioni.css'

export default function Impostazioni() {
  const [tema, setTema] = useState(caricaTema)

  function cambiaTema(id) {
    setTema(id)
    applicaTema(id)
  }

  return (
    <>
      <h1 className="page-title">Impostazioni</h1>
      <p className="page-subtitle">Configurazione generale del gestionale</p>

      <div className="card sezione-impostazione">
        <div className="impostazione-riga">
          <div>
            <span className="impostazione-titolo">Colori del gestionale</span>
            <p className="impostazione-desc">
              Scegli il tema: il cambio è immediato su tutte le pagine e resta memorizzato.
            </p>
          </div>
        </div>

        <div className="temi-griglia">
          {TEMI.map((t) => (
            <button
              key={t.id}
              type="button"
              className={'tema-card tema-' + t.id + (tema === t.id ? ' selezionato' : '')}
              onClick={() => cambiaTema(t.id)}
            >
              <span className="tema-anteprima">
                <span className="tema-colore c1" />
                <span className="tema-colore c2" />
                <span className="tema-colore c3" />
              </span>
              <span className="tema-nome">{t.nome}</span>
              <span className="tema-desc">{t.desc}</span>
              {tema === t.id && <span className="tema-attivo">In uso</span>}
            </button>
          ))}
        </div>
      </div>
    </>
  )
}
