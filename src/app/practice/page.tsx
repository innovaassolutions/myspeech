'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePlayerStore } from '@/store/player'
import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { Button } from '@/components/ui/button'
import {
  Play, Pause, SkipBack, SkipForward, Shuffle, Repeat, Repeat2, ArrowLeft
} from 'lucide-react'

export default function PracticePage() {
  const router = useRouter()
  const {
    queue, currentIndex, isPlaying, isShuffled, autoplay, loopCurrent, loopQueue, playbackRate,
    next, prev, toggleShuffle, toggleAutoplay, toggleLoopCurrent, toggleLoopQueue, setPlaybackRate, jumpTo,
  } = usePlayerStore()

  const { currentSentence, play, pause } = useAudioPlayer()

  useEffect(() => {
    if (queue.length === 0) router.replace('/collections')
  }, [queue.length, router])

  if (!currentSentence) return null

  return (
    <div className="min-h-screen flex flex-col">

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-4 md:px-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="text-muted-foreground"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Back
        </Button>
        <span className="text-sm text-muted-foreground tabular-nums">
          {currentIndex + 1} / {queue.length}
        </span>
      </div>

      {/* Main content — centred vertically */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 md:px-12 gap-10 md:gap-14">

        {/* English sentence + phonetic */}
        <div className="w-full max-w-2xl text-center space-y-4">
          <p className="text-3xl md:text-4xl lg:text-5xl font-medium leading-tight tracking-tight">
            {currentSentence.source_text}
          </p>
          {currentSentence.phonetic_text && (
            <p className="text-xl md:text-2xl text-muted-foreground font-light tracking-wide">
              {currentSentence.phonetic_text}
            </p>
          )}
          <p className="text-xs text-muted-foreground/60 uppercase tracking-widest">
            listening in target language
          </p>
        </div>

        {/* Playback indicator */}
        <div className="w-full max-w-sm flex items-center gap-3">
          <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full bg-primary rounded-full transition-all duration-300 ${
                isPlaying ? 'w-full' : 'w-0'
              }`}
            />
          </div>
        </div>

        {/* Main controls */}
        <div className="flex items-center gap-6 md:gap-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={prev}
            disabled={currentIndex === 0}
            className="h-12 w-12 rounded-full"
          >
            <SkipBack className="w-6 h-6" />
          </Button>

          <Button
            size="icon"
            onClick={isPlaying ? pause : play}
            className="h-20 w-20 rounded-full shadow-lg"
          >
            {isPlaying
              ? <Pause className="w-8 h-8" />
              : <Play className="w-8 h-8 ml-1" />
            }
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={next}
            disabled={currentIndex === queue.length - 1}
            className="h-12 w-12 rounded-full"
          >
            <SkipForward className="w-6 h-6" />
          </Button>
        </div>

        {/* Speed control */}
        <div className="flex items-center gap-1 bg-muted rounded-full px-1 py-1">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map(rate => (
            <button
              key={rate}
              onClick={() => setPlaybackRate(rate)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                playbackRate === rate
                  ? 'bg-background shadow text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {rate === 1 ? '1×' : `${rate}×`}
            </button>
          ))}
        </div>

        {/* Toggle controls */}
        <div className="flex items-center gap-3">
          <Button
            variant={autoplay ? 'secondary' : 'ghost'}
            size="sm"
            onClick={toggleAutoplay}
            className="rounded-full text-sm px-4"
          >
            Autoplay {autoplay ? 'on' : 'off'}
          </Button>

          <Button
            variant={isShuffled ? 'secondary' : 'ghost'}
            size="icon"
            onClick={toggleShuffle}
            className="h-9 w-9 rounded-full"
            title="Shuffle"
          >
            <Shuffle className="w-4 h-4" />
          </Button>

          <Button
            variant={loopCurrent ? 'secondary' : 'ghost'}
            size="icon"
            onClick={toggleLoopCurrent}
            className="h-9 w-9 rounded-full"
            title="Loop current sentence"
          >
            <Repeat className="w-4 h-4" />
          </Button>

          <Button
            variant={loopQueue ? 'secondary' : 'ghost'}
            size="icon"
            onClick={toggleLoopQueue}
            className="h-9 w-9 rounded-full"
            title="Loop entire list"
          >
            <Repeat2 className="w-4 h-4" />
          </Button>
        </div>

      </div>

      {/* Queue — scrollable bottom panel */}
      <div className="w-full max-w-2xl mx-auto px-4 pb-6">
        <div className="rounded-2xl bg-muted/40 overflow-hidden">
          <div className="max-h-52 overflow-y-auto divide-y divide-border/50">
            {queue.map((s, i) => (
              <div
                key={s.id}
                onClick={() => jumpTo(i)}
                className={`flex items-center gap-4 px-4 py-3.5 cursor-pointer transition-colors ${
                  i === currentIndex
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted/80 text-muted-foreground'
                }`}
              >
                <span className={`text-xs tabular-nums w-6 text-right flex-shrink-0 ${
                  i === currentIndex ? 'text-primary-foreground/70' : 'opacity-50'
                }`}>
                  {i + 1}
                </span>
                <span className={`text-base leading-snug ${
                  i === currentIndex ? 'font-medium text-primary-foreground' : ''
                }`}>
                  {s.source_text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
