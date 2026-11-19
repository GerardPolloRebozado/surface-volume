import { createContext, useContext } from 'react'

export const MobileNavContext = createContext<() => void>(() => {})

export function useOpenMobileNav(): () => void {
  return useContext(MobileNavContext)
}
