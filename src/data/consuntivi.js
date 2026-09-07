// Stato del lavoro dopo l'assegnazione: l'operaio compila il consuntivo,
// il responsabile lo verifica e chiude il lavoro.

export const STATI_CONSUNTIVO = {
  DA_CONSUNTIVARE: 'Da consuntivare',
  DA_VALIDARE: 'Da validare',
  DA_CORREGGERE: 'Da correggere',
  CHIUSO: 'Chiuso',
}

export function statoConsuntivo(lavoro) {
  if (lavoro.chiuso) return STATI_CONSUNTIVO.CHIUSO
  if (lavoro.consuntivo?.rifiutato) return STATI_CONSUNTIVO.DA_CORREGGERE
  if (lavoro.consuntivo) return STATI_CONSUNTIVO.DA_VALIDARE
  return STATI_CONSUNTIVO.DA_CONSUNTIVARE
}

// Solo i lavori pianificati su una squadra entrano nella consuntivazione.
export function daConsuntivare(lavori) {
  return lavori.filter((l) => l.assegnato && l.assegnato.teamId)
}

// Il consuntivo nasce già compilato con la squadra del giorno: chi era assegnato
// al lavoro è chi lo ha eseguito, salvo correzioni.
export function consuntivoVuoto(lavoro, membri = []) {
  return {
    oreEffettive: lavoro.durata,
    materialiUsati: [...(lavoro.materiali || [])],
    noteOperaio: '',
    compilatoDa: membri.join(', '),
    compilatoIl: null,
    rifiutato: false,
    motivoRifiuto: '',
  }
}

// Verifiche automatiche su quanto dichiarato dall'operaio: quelle bloccanti
// impediscono la chiusura, le altre sono segnalazioni da valutare.
export function verificheConsuntivo(lavoro) {
  const c = lavoro.consuntivo
  if (!c) return []

  const esiti = []
  const orePreviste = Number(lavoro.durata) || 0
  const oreFatte = Number(c.oreEffettive) || 0

  if (!c.compilatoDa?.trim()) {
    esiti.push({
      bloccante: true,
      testo: 'Manca il nome di chi ha eseguito il lavoro.',
    })
  }

  if (oreFatte <= 0) {
    esiti.push({ bloccante: true, testo: 'Le ore effettive non sono state indicate.' })
  }

  const scarto = oreFatte - orePreviste
  if (orePreviste > 0 && Math.abs(scarto) >= 1) {
    esiti.push({
      bloccante: false,
      testo:
        scarto > 0
          ? `Ore effettive superiori al previsto di ${scarto}h (${orePreviste}h → ${oreFatte}h).`
          : `Ore effettive inferiori al previsto di ${Math.abs(scarto)}h (${orePreviste}h → ${oreFatte}h).`,
    })
  }

  const previsti = lavoro.materiali || []
  const usati = c.materialiUsati || []
  const aggiunti = usati.filter((m) => !previsti.includes(m))
  const nonUsati = previsti.filter((m) => !usati.includes(m))

  if (aggiunti.length > 0) {
    esiti.push({
      bloccante: false,
      testo: 'Materiali non previsti: ' + aggiunti.join(', ') + '.',
    })
  }
  if (nonUsati.length > 0) {
    esiti.push({
      bloccante: false,
      testo: 'Materiali previsti non utilizzati: ' + nonUsati.join(', ') + '.',
    })
  }

  if (usati.length === 0 && previsti.length > 0) {
    esiti.push({ bloccante: true, testo: 'Nessun materiale dichiarato a fronte di quelli previsti.' })
  }

  return esiti
}

export function bloccanti(esiti) {
  return esiti.filter((e) => e.bloccante)
}
