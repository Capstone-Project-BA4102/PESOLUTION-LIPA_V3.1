import { supabase } from './supabase'
import { backendRequest } from './backend'
import type { PublicSite, SiteContent, SiteRecord } from '@/types/site'

export const DEFAULT_HERO_IMAGE = '/new-city-hall-building.jpg'

export async function fetchPublicSite(): Promise<PublicSite> {
  // Public landing-page stats must load for anonymous visitors too.
  return backendRequest<PublicSite>('/public/site', { authenticated: false })
}
export const fetchSiteContent = () => backendRequest<SiteRecord | null>('/admin/site-content')
export const saveSiteContent = (content: SiteContent) => backendRequest<SiteRecord>('/admin/site-content', { method: 'PUT', body: { content, published: true } })

export async function uploadSiteImage(file: File): Promise<string> {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Use a JPG, PNG, or WebP image.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Website images must be 10 MB or smaller.')
  const extension = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `website/${crypto.randomUUID()}.${extension}`
  const result = await supabase.storage.from('promotional-media').upload(path, file, { contentType: file.type, upsert: false })
  if (result.error) throw result.error
  return supabase.storage.from('promotional-media').getPublicUrl(path).data.publicUrl
}
