const STORAGE_KEY = 'gestionale-tema'

export const TEMI = [
  {
    id: 'sobrio',
    nome: 'Professionale',
    desc: 'Blu petrolio e grigi, riposante per lunghe sessioni',
  },
  {
    id: 'elegante',
    nome: 'Elegante',
    desc: 'Grafite profonda e oro brunito, per chi vuole un colpo d’occhio importante',
  },
  {
    id: 'aziendale',
    nome: 'Aziendale',
    desc: 'Nero e magenta, superfici bianche e angoli squadrati: stile gestionale classico',
  },
  {
    id: 'festoso',
    nome: 'Coloratissimo',
    desc: 'Viola, fucsia e turchese: sfumature e tinte accese',
  },
]

export function caricaTema() {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'sobrio'
  } catch {
    return 'sobrio'
  }
}

// Il tema è un attributo sulla radice: tutto il resto sono variabili CSS.
export function applicaTema(id) {
  document.documentElement.setAttribute('data-tema', id)
  try {
    localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // storage non disponibile: il tema vale solo per questa sessione
  }
}
