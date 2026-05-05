import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { Sentence } from '@/types'

export function AudioStatusBadge({ status }: { status: Sentence['audio_status'] }) {
  if (status === 'ready') {
    return (
      <span className="text-emerald-600 flex items-center gap-1 text-xs">
        <CheckCircle2 className="w-3.5 h-3.5" /> ready
      </span>
    )
  }
  if (status === 'generating') {
    return (
      <span className="text-blue-500 flex items-center gap-1 text-xs">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> generating
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="text-destructive flex items-center gap-1 text-xs">
        <AlertCircle className="w-3.5 h-3.5" /> error
      </span>
    )
  }
  return (
    <span className="text-muted-foreground flex items-center gap-1 text-xs">
      <Clock className="w-3.5 h-3.5" /> pending
    </span>
  )
}
