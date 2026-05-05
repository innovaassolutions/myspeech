'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Plus } from 'lucide-react'
import { Collection } from '@/types'

const LANGUAGES = [
  'Mandarin Chinese',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Portuguese',
  'Italian',
  'Arabic',
  'Russian',
  'Hindi',
]

type Props = {
  onCreated: (collection: Collection) => void
}

export function NewCollectionDialog({ onCreated }: Props) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [targetLanguage, setTargetLanguage] = useState('Mandarin Chinese')
  const [voiceId, setVoiceId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        target_language: targetLanguage,
        voice_id: voiceId.trim(),
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error ?? 'Something went wrong')
      return
    }

    onCreated(data)
    setOpen(false)
    setName('')
    setVoiceId('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New collection
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New collection</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="e.g. Daily Mandarin"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="language">Target language</Label>
            <select
              id="language"
              value={targetLanguage}
              onChange={e => setTargetLanguage(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              {LANGUAGES.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="voiceId">ElevenLabs voice ID</Label>
            <Input
              id="voiceId"
              placeholder="e.g. pNInz6obpgDQGcFmaJgB"
              value={voiceId}
              onChange={e => setVoiceId(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              Find this in ElevenLabs → Voices → click a voice → copy the ID.
            </p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
