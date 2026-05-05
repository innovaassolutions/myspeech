'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePlayerStore } from '@/store/player'

export function useAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const {
    queue,
    currentIndex,
    isPlaying,
    autoplay,
    loopCurrent,
    playbackRate,
    next,
    setPlaying,
  } = usePlayerStore()

  const currentSentence = queue[currentIndex] ?? null

  // Initialize audio element once
  useEffect(() => {
    audioRef.current = new Audio()

    audioRef.current.onended = () => {
      if (loopCurrent) {
        audioRef.current?.play()
      } else if (autoplay) {
        next()
      } else {
        setPlaying(false)
      }
    }

    return () => {
      audioRef.current?.pause()
      audioRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update loop/autoplay handlers when toggles change
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.onended = () => {
      if (loopCurrent) {
        audioRef.current?.play()
      } else if (autoplay) {
        next()
      } else {
        setPlaying(false)
      }
    }
  }, [loopCurrent, autoplay, next, setPlaying])

  // Load new audio when sentence changes
  useEffect(() => {
    if (!audioRef.current || !currentSentence?.audio_url) return
    audioRef.current.src = currentSentence.audio_url
    if (isPlaying) {
      audioRef.current.play().catch(() => setPlaying(false))
    }
  }, [currentSentence?.id, currentSentence?.audio_url]) // eslint-disable-line react-hooks/exhaustive-deps

  // Respond to play/pause state
  useEffect(() => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.play().catch(() => setPlaying(false))
    } else {
      audioRef.current.pause()
    }
  }, [isPlaying, setPlaying])

  // Apply playback rate whenever it changes
  useEffect(() => {
    if (!audioRef.current) return
    audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  // Media Session API — lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !currentSentence) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: currentSentence.source_text,
      artist: 'MySpeech',
    })
    navigator.mediaSession.setActionHandler('nexttrack', next)
    navigator.mediaSession.setActionHandler('previoustrack', () =>
      usePlayerStore.getState().prev()
    )
  }, [currentSentence, next])

  const play = useCallback(() => setPlaying(true), [setPlaying])
  const pause = useCallback(() => setPlaying(false), [setPlaying])

  return { currentSentence, play, pause, audioRef }
}
