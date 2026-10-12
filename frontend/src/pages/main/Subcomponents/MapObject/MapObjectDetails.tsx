import { useEffect, useState } from 'react'
import type { ComponentProps } from 'react'
import { getWaterObject } from '@/pages/main/services/mapObjectService'
import type { WaterObject } from '@/pages/main/types/waterObjects'
import MapObjectEditor from './MapObjectEditor'
import MapObjectView from './MapObjectView'

type Props = Omit<ComponentProps<typeof MapObjectEditor>, 'record' | 'onCancel' | 'focusComment'>

// Keyed by object ID in MapPage, so each selection starts in read-only mode.
export default function MapObjectDetails(props: Props) {
  const [record, setRecord] = useState<WaterObject | null>(null)
  const [editing, setEditing] = useState(false)
  const [focusComment, setFocusComment] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [reload, setReload] = useState(0)
  const { selection } = props
  const id = selection.feature.id ?? selection.feature.properties?.id

  useEffect(() => {
    const controller = new AbortController()
    void getWaterObject(selection.kind, id, controller.signal)
      .then(next => { if (!controller.signal.aborted) setRecord(next) })
      .catch(() => {
        if (!controller.signal.aborted) setError('Kunne ikke hente objektet. Sjekk nettforbindelsen og karttilgangen din.')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [selection.kind, id, reload])

  function refresh() {
    setLoading(true)
    setError(null)
    setSaved(false)
    setReload(current => current + 1)
  }

  if (loading) return <p role="status" className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Henter informasjon …</p>
  if (error || !record) return <div className="space-y-3">
    <p role="alert" className="text-sm text-red-700">{error ?? 'Fant ikke objektet.'}</p>
    <button type="button" onClick={refresh} className="text-sm text-sky-700 underline">Prøv på nytt</button>
  </div>

  if (editing) return <MapObjectEditor {...props} record={record} focusComment={focusComment}
    onCancel={() => setEditing(false)}
    onSaved={(selected, updated) => {
      setRecord(updated)
      setEditing(false)
      setSaved(true)
      props.onSaved(selected, updated)
    }} />

  return <MapObjectView record={record} kind={selection.kind} saved={saved}
    onEdit={() => { setSaved(false); setFocusComment(false); setEditing(true) }}
    onAddComment={() => { setSaved(false); setFocusComment(true); setEditing(true) }} onRefresh={refresh} />
}
