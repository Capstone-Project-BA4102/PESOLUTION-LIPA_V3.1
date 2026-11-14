import { useCallback, useState } from 'react'
import { ExternalLink, Save } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Button, ButtonLink } from '@/components/ui/Button'
import { LoadingBlock, ErrorBlock } from '@/components/shared/QueryState'
import { OfficeContentEditor, SITE_CONTENT_FORM_ID } from '@/components/admin/OfficeContentEditor'
import { usePT } from '@/lib/portalCopy'
import { fetchSiteContent } from '@/lib/site'
import { useQuery } from '@/lib/useQuery'

export default function AdminWebsitePage() {
  const pt = usePT()
  const fetcher = useCallback(() => fetchSiteContent(), [])
  const { data, loading, error, reload } = useQuery(fetcher, [])
  const [saving, setSaving] = useState(false)
  return <div className="space-y-6">
    <PageHeader title="Settings" actions={<>
      <ButtonLink to="/" target="_blank" variant="neutral" icon={<ExternalLink className="h-4 w-4" />}>
        Open Website
      </ButtonLink>
      {data && <Button type="submit" form={SITE_CONTENT_FORM_ID} disabled={saving} icon={<Save className="h-4 w-4" />}>
        {saving ? 'Saving...' : 'Save Changes'}
      </Button>}
    </>} />
    {loading ? <LoadingBlock /> : error ? <ErrorBlock message={error} onRetry={reload} /> : data
      ? <OfficeContentEditor record={data} onSavingChange={setSaving} />
      : <ErrorBlock message={pt('Office content has not been initialized. Complete the database setup first.')} />}
  </div>
}
