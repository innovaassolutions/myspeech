'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Progress } from '@/components/ui/progress'
import { AudioStatusBadge } from '@/components/AudioStatusBadge'
import { usePlayerStore } from '@/store/player'
import { Collection, Sentence } from '@/types'
import {
  ArrowLeft, Play, Shuffle, Trash2, Languages, Mic2, Loader2, RotateCcw
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
  const [retrying, setRetrying] = useState<Set<string>>(new Set())

  const { loadQueue, toggleShuffle } = usePlayerStore()

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

  async function generateAudioForSentence(sentenceId: string): Promise<{ audio_url?: string; ok: boolean }> {
    const res = await fetch('/api/generate-audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence_id: sentenceId }),
    })
    const data = await res.json()
    return { audio_url: data.audio_url, ok: res.ok }
  }

  // Retry a single failed/pending sentence
  async function retrySentence(e: React.MouseEvent, sentence: Sentence) {
    e.stopPropagation()
    setRetrying(prev => new Set(prev).add(sentence.id))

    setSentences(prev =>
      prev.map(s => s.id === sentence.id ? { ...s, audio_status: 'generating' } : s)
    )

    // If no translation yet, translate first
    if (!sentence.target_text) {
      await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence_ids: [sentence.id],
          target_language: collection?.target_language,
        }),
      })
    }

    const { audio_url, ok } = await generateAudioForSentence(sentence.id)

    setSentences(prev =>
      prev.map(s =>
        s.id === sentence.id
          ? { ...s, audio_url: audio_url ?? null, audio_status: ok ? 'ready' : 'error' }
          : s
      )
    )

    setRetrying(prev => { const n = new Set(prev); n.delete(sentence.id); return n })
  }

  // Retry all failed or stuck sentences
  async function retryAll() {
    const failed = sentences.filter(
      s => s.audio_status === 'error' || (s.audio_status === 'pending' && !s.audio_url)
    )
    if (!failed.length) return

    for (const sentence of failed) {
      setRetrying(prev => new Set(prev).add(sentence.id))
      setSentences(prev =>
        prev.map(s => s.id === sentence.id ? { ...s, audio_status: 'generating' } : s)
      )

      if (!sentence.target_text) {
        await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence_ids: [sentence.id],
            target_language: collection?.target_language,
          }),
        })
      }

      const { audio_url, ok } = await generateAudioForSentence(sentence.id)
      setSentences(prev =>
        prev.map(s =>
          s.id === sentence.id
            ? { ...s, audio_url: audio_url ?? null, audio_status: ok ? 'ready' : 'error' }
            : s
        )
      )
      setRetrying(prev => { const n = new Set(prev); n.delete(sentence.id); return n })
    }
  }

  async function handleAdd() {
    const lines = newText.split('\n').map(l => l.trim()).filter(Boolean)
    if (!lines.length) return

    setAddingStatus('saving')

    const saveRes = await fetch('/api/sentences', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ collection_id: id, sentences: lines }),
    })
    const saved: Sentence[] = await saveRes.json()
    setSentences(prev => [...prev, ...saved])
    setNewText('')

    setAddingStatus('translating')
    await fetch('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sentence_ids: saved.map(s => s.id),
        target_language: collection?.target_language,
      }),
    })

    setSentences(prev =>
      prev.map(s => saved.find(ns => ns.id === s.id) ? { ...s, audio_status: 'pending' } : s)
    )

    setAddingStatus('audio')
    setAudioProgress(0)

    for (let i = 0; i < saved.length; i++) {
      const sentence = saved[i]
      setSentences(prev =>
        prev.map(s => s.id === sentence.id ? { ...s, audio_status: 'generating' } : s)
      )

      const { audio_url, ok } = await generateAudioForSentence(sentence.id)
      setSentences(prev =>
        prev.map(s =>
          s.id === sentence.id
            ? { ...s, audio_url: audio_url ?? null, audio_status: ok ? 'ready' : 'error' }
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
  const failedCount = sentences.filter(
    s => s.audio_status === 'error' || (s.audio_status === 'pending' && !s.audio_url)
  ).length
  const isProcessing = addingStatus !== 'idle'

  const statusLabel = {
    saving: 'Saving sentences...',
    translating: `Translating to ${collection?.target_language}...`,
    audio: `Generating audio... ${audioProgress}%`,
    idle: '',
  }[addingStatus]

  async function retranslateAll() {
    if (!sentences.length || isProcessing) return
    setAddingStatus('translating')

    // Batch into groups of 20 to avoid Vercel function timeouts
    const ids = sentences.map(s => s.id)
    const BATCH = 20
    for (let i = 0; i < ids.length; i += BATCH) {
      await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence_ids: ids.slice(i, i + BATCH),
          target_language: collection?.target_language,
        }),
      })
    }

    // Reload to get updated phonetic_text
    const res = await fetch(`/api/sentences?collection_id=${id}`)
    const updated = await res.json()
    if (Array.isArray(updated)) setSentences(updated)
    setAddingStatus('idle')
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-muted-foreground">Loading...</div>
    )
  }

  if (!collection) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-10 text-muted-foreground">Collection not found.</div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 md:py-12 space-y-8">

      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/collections">
          <Button variant="ghost" size="icon" className="h-9 w-9 flex-shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-semibold">{collection.name}</h1>
          <p className="text-base text-muted-foreground">{collection.target_language}</p>
        </div>
        {sentences.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={retranslateAll}
            disabled={isProcessing}
            title="Re-translate all sentences to refresh phonetic text"
          >
            {addingStatus === 'translating'
              ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
              : <RotateCcw className="w-4 h-4 mr-2" />
            }
            Re-translate
          </Button>
        )}
      </div>

      {/* Add sentences */}
      <div className="space-y-3">
        <Textarea
          placeholder={`Type or paste sentences, one per line.\n\nThis meeting could have been an email.\nI usually have coffee in the morning.\nCan I get a table for two?`}
          className="min-h-[140px] text-base leading-relaxed"
          value={newText}
          onChange={e => setNewText(e.target.value)}
          disabled={isProcessing}
        />

        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
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
          >
            <Mic2 className="w-4 h-4 mr-2" />
            Add &amp; generate audio
          </Button>
        </div>
      </div>

      <Separator />

      {/* Toolbar */}
      {sentences.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {selected.size === sentences.length ? 'Deselect all' : 'Select all'}
            </button>
            {selected.size > 0 && (
              <span className="text-sm text-muted-foreground">{selected.size} selected</span>
            )}
            {failedCount > 0 && (
              <button
                onClick={retryAll}
                className="flex items-center gap-1.5 text-sm text-amber-600 hover:text-amber-700 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry {failedCount} failed
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => playSelected(true)}
              disabled={readyCount === 0}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Shuffle
            </Button>
            <Button
              onClick={() => playSelected(false)}
              disabled={readyCount === 0}
            >
              <Play className="w-4 h-4 mr-2" />
              Play {selected.size > 0 ? selected.size : 'all'}
            </Button>
          </div>
        </div>
      )}

      {/* Sentence list */}
      <div className="space-y-1.5">
        {sentences.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <Languages className="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p>Add sentences above to get started.</p>
          </div>
        )}

        {sentences.map((sentence, i) => (
          <div
            key={sentence.id}
            className={`group flex items-center gap-4 rounded-xl px-4 py-4 hover:bg-muted/50 transition-colors cursor-pointer ${
              selected.has(sentence.id) ? 'bg-muted/50' : ''
            }`}
            onClick={() => toggleSelect(sentence.id)}
          >
            {/* Checkbox */}
            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
              selected.has(sentence.id)
                ? 'bg-primary border-primary'
                : 'border-input'
            }`}>
              {selected.has(sentence.id) && (
                <svg className="w-3 h-3 text-primary-foreground" viewBox="0 0 12 12" fill="none">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>

            {/* Number */}
            <span className="text-sm text-muted-foreground w-7 text-right flex-shrink-0 tabular-nums">
              {i + 1}
            </span>

            {/* Sentence text */}
            <span className="flex-1 text-base leading-snug">{sentence.source_text}</span>

            {/* Status + retry */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <AudioStatusBadge status={sentence.audio_status} />
              {(sentence.audio_status === 'error' || (sentence.audio_status === 'pending' && !sentence.audio_url)) && !retrying.has(sentence.id) && (
                <button
                  onClick={e => retrySentence(e, sentence)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                  title="Retry"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Delete */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={e => { e.stopPropagation(); deleteSentence(sentence.id) }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>

      {/* Footer */}
      {sentences.length > 0 && (
        <div className="text-sm text-muted-foreground text-right">
          {readyCount} of {sentences.length} ready
        </div>
      )}
    </div>
  )
}
