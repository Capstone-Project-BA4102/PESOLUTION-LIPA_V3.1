import { createContext, useContext, type ReactNode } from 'react'
import { fetchPublicSite } from './site'
import { useLiveRefresh } from './useLiveRefresh'
import { useQuery } from './useQuery'
import type { PublicSite } from '@/types/site'

const PublicSiteContext = createContext<{ data: PublicSite | null; loading: boolean; error: string | null } | null>(null)
export function PublicSiteProvider({ children }: { children: ReactNode }) {
  const query = useQuery(fetchPublicSite)
  useLiveRefresh(query.reload, [])
  return <PublicSiteContext.Provider value={{ data: query.data, loading: query.loading, error: query.error }}>{children}</PublicSiteContext.Provider>
}
export function usePublicSite() {
  const value = useContext(PublicSiteContext)
  if (!value) throw new Error('PublicSiteProvider is required.')
  return value
}
