'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/store/player'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { Button } from '@/components/ui/button'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, ArrowLeft
} from 'lucide-react'

export default function PracticePage() {
  const router = useRouter()
  const {
    queue, currentIndex, isPlaying, isShuffled, autoplay, loopCurrent,
    next, prev, toggleShuffle, toggleAutoplay, toggleLoopCurrent,
  } = usePlayerStore()

  const { currentSentence, play, pause } = useAudioPlayer()

  // Redirect if queue is empty
  useEffect(() => {
    if (queue.length === 0) router.replace('/collections')
  }, [queue.length, router])

  if (!currentSentence) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">

        {/* Back */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-muted-foreground -ml-2"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back
        </Button>

        {/* Counter */}
        <div className="text-sm text-muted-foreground text-center">
          {currentIndex + 1} / {queue.length}
        </div>

        {/* English sentence — always visible */}
        <div className="text-center space-y-2">
          <p className="text-2xl font-medium leading-snug">
            {currentSentence.source_text}
          </p>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">
            Listening in {queue[0] ? 'target language' : '—'}
          </p>
        </div>

        {/* Progress bar placeholder — could wire to audio currentTime */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full bg-primary transition-all ${isPlaying ? 'animate-pulse' : ''}`}
            style={{ width: isPlaying ? '100%' : '0%' }}
          />
        </div>

        {/* Main controls */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            disabled={currentIndex === 0}
          >
            <SkipBack className="w-5 h-5" />
          </Button>

          <Button
            size="icon"
            className="h-14 w-14 rounded-full"
            onClick={isPlaying ? pause : play}
          >
            {isPlaying
              ? <Pause className="w-6 h-6" />
              : <Play className="w-6 h-6 ml-0.5" />
            }
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            disabled={currentIndex === queue.length - 1}
          >
            <SkipForward className="w-5 h-5" />
          </Button>
        </div>

        {/* Secondary controls */}
        <div className="flex items-center justify-center gap-2">
          <Button
            variant={autoplay ? 'secondary' : 'ghost'}
            size="sm"
            onClick={toggleAutoplay}
            className="text-xs"
          >
            Autoplay {autoplay ? 'on' : 'off'}
          </Button>

          <Button
            variant={isShuffled ? 'secondary' : 'ghost'}
            size="icon"
            onClick={toggleShuffle}
            className="h-8 w-8"
          >
            <Shuffle className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant={loopCurrent ? 'secondary' : 'ghost'}
            size="icon"
            onClick={toggleLoopCurrent}
            className="h-8 w-8"
          >
            <Repeat className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Queue preview */}
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {queue.map((s, i) => (
            <div
              key={s.id}
              onClick={() => usePlayerStore.getState().jumpTo(i)}
              className={`px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                i === currentIndex
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted text-muted-foreground'
              }`}
            >
              <span className="mr-3 text-xs opacity-60">{i + 1}</span>
              {s.source_text}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
