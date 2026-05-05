'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { AudioStatusBadge } from '@/components/AudioStatusBadge'
import { usePlayerStore } from '@/store/player'
import { Collection, Sentence } from '@/types'
import {
  ArrowLeft, Play, Shuffle, Trash2, Languages, Mic2, Loader2
} from 'lucide-react'
import Link from 'next/link'

export default function CollectionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [collection, setCollection] = useState<Collection | null>(null)
  const [sentences, setSentences] = useState<Sentence[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [newText, setNewText] = useState('')
  const [loading, setLoading] = useState(true)
  const [addingStatus, setAddingStatus] = useState<'idle' | 'saving' | 'translating' | 'audio'>('idle')
  const [audioProgress, setAudioProgress] = useState(0)

  const { loadQueue, toggleShuffle, isShuffled } = usePlayerStore()

  // Load collection + sentences
  useEffect(() => {
    Promise.all([
      fetch(`/api/collections`).then(r => r.json()),
      fetch(`/api/sentences?collection_id=${id}`).then(r => r.json()),
    ]).then(([cols, sents]) => {
      const col = Array.isArray(cols) ? cols.find((c: Collection) => c.id === id) : null
      setCollection(col ?? null)
      setSentences(Array.isArray(sents) ? sents : [])
      setLoading(false)
    })
  }, [id])

  function toggleSelect(sentenceId: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(sentenceId) ? next.delete(sentenceId) : next.add(sentenceId)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === sentences.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sentences.map(s => s.id)))
    }
  }

  // Add sentences → translate → generate audio in sequence
  async function handleAdd() {
    const lines = newText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return

    setAddingStatus('saving')

    // 1. Save sentences
    const saveRes = await fetch('/api/sentences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection_id: id, sentences: lines }),
    })
    const saved: Sentence[] = await saveRes.json()
    setSentences(prev => [...prev, ...saved])
    setNewText('')

    // 2. Translate
    setAddingStatus('translating')
    await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentence_ids: saved.map(s => s.id),
        target_language: collection?.target_language,
      }),
    })

    // Update local state: mark target_text as populated
    setSentences(prev =>
      prev.map(s =>
        saved.find(ns => ns.id === s.id)
          ? { ...s, audio_status: 'pending' }
          : s
      )
    )

    // 3. Generate audio one by one
    setAddingStatus('audio')
    setAudioProgress(0)

    for (let i = 0; i < saved.length; i++) {
      const sentence = saved[i]

      setSentences(prev =>
        prev.map(s => s.id === sentence.id ? { ...s, audio_status: 'generating' } : s)
      )

      const audioRes = await fetch('/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentence_id: sentence.id }),
      })
      const audioData = await audioRes.json()

      setSentences(prev =>
        prev.map(s =>
          s.id === sentence.id
            ? {
                ...s,
                audio_url: audioData.audio_url ?? null,
                audio_status: audioRes.ok ? 'ready' : 'error',
              }
            : s
        )
      )

      setAudioProgress(Math.round(((i + 1) / saved.length) * 100))
    }

    setAddingStatus('idle')
    setAudioProgress(0)
  }

  async function deleteSentence(sentenceId: string) {
    await fetch('/api/sentences', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: sentenceId }),
    })
    setSentences(prev => prev.filter(s => s.id !== sentenceId))
    setSelected(prev => { const n = new Set(prev); n.delete(sentenceId); return n })
  }

  function playSelected(shuffle = false) {
    const queue = selected.size > 0
      ? sentences.filter(s => selected.has(s.id) && s.audio_status === 'ready')
      : sentences.filter(s => s.audio_status === 'ready')

    if (!queue.length) return
    if (shuffle) toggleShuffle()
    loadQueue(queue)
    router.push('/practice')
  }

  const readyCount = sentences.filter(s => s.audio_status === 'ready').length
  const isProcessing = addingStatus !== 'idle'

  const statusLabel = {
    saving: 'Saving sentences...',
    translating: `Translating to ${collection?.target_language}...`,
    audio: `Generating audio... ${audioProgress}%`,
    idle: '',
  }[addingStatus]

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-muted-foreground">
        Loading...
      </div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-sm text-muted-foreground">
        Collection not found.
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/collections">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl font-semibold">{collection.name}</h1>
          <p className="text-sm text-muted-foreground">{collection.target_language}</p>
        </div>
      </div>

      {/* Add sentences */}
      <div className="space-y-2">
        <Textarea
          placeholder={`Type or paste sentences, one per line.\n\nThis meeting could have been an email.\nI usually have coffee in the morning.\nCan I get a table for two?`}
          className="min-h-[120px] text-sm"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          disabled={isProcessing}
        />

        {isProcessing && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {statusLabel}
            </div>
            {addingStatus === 'audio' && (
              <Progress value={audioProgress} className="h-1.5" />
            )}
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleAdd}
            disabled={!newText.trim() || isProcessing}
            size="sm"
          >
            <Mic2 className="w-4 h-4 mr-2" />
            Add &amp; generate audio
          </Button>
        </div>
      </div>

      <Separator />

      {/* Sentence list toolbar */}
      {sentences.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {selected.size === sentences.length ? 'Deselect all' : 'Select all'}
            </button>
            {selected.size > 0 && (
              <span className="text-xs text-muted-foreground">
                {selected.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => playSelected(true)}
              disabled={readyCount === 0}
            >
              <Shuffle className="w-3.5 h-3.5 mr-1.5" />
              Shuffle
            </Button>
            <Button
              size="sm"
              onClick={() => playSelected(false)}
              disabled={readyCount === 0}
            >
              <Play className="w-3.5 h-3.5 mr-1.5" />
              Play {selected.size > 0 ? `${selected.size}` : 'all'}
            </Button>
          </div>
        </div>
      )}

      {/* Sentences */}
      <div className="space-y-1">
        {sentences.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Languages className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Add sentences above to get started.</p>
          </div>
        )}

        {sentences.map((sentence, i) => (
          <div
            key={sentence.id}
            className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/50 transition-colors cursor-pointer ${
              selected.has(sentence.id) ? 'bg-muted/50' : ''
            }`}
            onClick={() => toggleSelect(sentence.id)}
          >
            {/* Checkbox */}
            <div className={`w-4 h-4 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${
              selected.has(sentence.id)
                ? 'bg-primary border-primary'
                : 'border-input'
            }`}>
              {selected.has(sentence.id) && (
                <svg className="w-2.5 h-2.5 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Number */}
            <span className="text-xs text-muted-foreground w-6 text-right flex-shrink-0">
              {i + 1}
            </span>

            {/* Sentence text */}
            <span className="flex-1 text-sm">{sentence.source_text}</span>

            {/* Status */}
            <div className="flex-shrink-0">
              <AudioStatusBadge status={sentence.audio_status} />
            </div>

            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={e => { e.stopPropagation(); deleteSentence(sentence.id) }}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Stats footer */}
      {sentences.length > 0 && (
        <div className="text-xs text-muted-foreground text-right">
          {readyCount} of {sentences.length} sentences ready
        </div>
      )}
    </div>
  )
}
