import {
  IconFolder,
  IconPackage,
  IconTeam,
  IconWrench,
  IconClock,
  IconGroups,
  IconPlus,
  IconArchive,
  IconCheckList,
  IconEuro,
  IconElmetto,
} from '../components/icons'

// Voci del gestionale, raggruppate come nella barra laterale.
export const SEZIONI = [
  {
    nome: 'PERSONALE',
    voci: [
      {
        to: '/personale',
        titolo: 'Gestione Personale',
        desc: 'Anagrafica dipendenti',
        icon: IconTeam,
      },
      {
        to: '/presenze',
        titolo: 'Timbrature e Presenze',
        desc: 'Ferie, malattie e permessi',
        icon: IconClock,
      },
      {
        to: '/squadre',
        titolo: 'Squadre',
        desc: 'Componi le squadre giornaliere',
        icon: IconGroups,
      },
      {
        to: '/dpi',
        titolo: 'Anagrafica DPI',
        desc: 'Dispositivi di protezione e scadenze',
        icon: IconElmetto,
      },
    ],
  },
  {
    nome: 'LAVORI',
    voci: [
      {
        to: '/clienti',
        titolo: 'Schede Clienti',
        desc: 'Anagrafica e storico clienti',
        icon: IconFolder,
      },
      {
        to: '/nuovo-lavoro',
        titolo: 'Nuovo Lavoro',
        desc: 'Crea un lavoro da assegnare',
        icon: IconPlus,
      },
      {
        to: '/assegnazione-lavori',
        titolo: 'Assegnazione Lavori',
        desc: 'Pianifica e assegna',
        icon: IconWrench,
      },
      {
        to: '/consuntivazione',
        titolo: 'Consuntivazione Lavori',
        desc: 'Verifica e chiudi i lavori svolti',
        icon: IconCheckList,
      },
      {
        to: '/economico',
        titolo: 'Gestione Economica',
        desc: 'Acconti, SAL e stato dei pagamenti',
        icon: IconEuro,
      },
      {
        to: '/lavori',
        titolo: 'Archivio Lavori',
        desc: 'Tutti i lavori e le schede',
        icon: IconArchive,
      },
    ],
  },
  {
    nome: 'MATERIALI',
    voci: [
      {
        to: '/materiali',
        titolo: 'Materiali',
        desc: 'Magazzino e scorte',
        icon: IconPackage,
      },
    ],
  },
]

const STORAGE_KEY = 'gestionale-tile-dashboard'

// Tile mostrati in dashboard al primo avvio.
const PREDEFINITI = [
  '/personale',
  '/presenze',
  '/squadre',
  '/dpi',
  '/nuovo-lavoro',
  '/assegnazione-lavori',
  '/consuntivazione',
  '/economico',
]

export function caricaTileAttivi() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch {
    // storage non disponibile: si usano i tile predefiniti
  }
  return PREDEFINITI
}

export function salvaTileAttivi(attivi) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(attivi))
  } catch {
    // storage non disponibile: la scelta vale solo per questa sessione
  }
}
