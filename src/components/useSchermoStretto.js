import { useEffect, useState } from 'react'

// Vero quando lo schermo è stretto (telefono o tablet in verticale): il menu
// laterale diventa a scomparsa e non è più ridimensionabile.
export const LIMITE_STRETTO = 900

export function useSchermoStretto(limite = LIMITE_STRETTO) {
  const query = `(max-width: ${limite}px)`
  const [stretto, setStretto] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const aggiorna = (e) => setStretto(e.matches)
    mq.addEventListener('change', aggiorna)
    setStretto(mq.matches)
    return () => mq.removeEventListener('change', aggiorna)
  }, [query])

  return stretto
}
