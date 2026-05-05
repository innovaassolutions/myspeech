import { create } from 'zustand'
import { Sentence } from '@/types'

type PlayerStore = {
  queue: Sentence[]
  currentIndex: number
  isPlaying: boolean
  isShuffled: boolean
  autoplay: boolean
  loopCurrent: boolean

  // Actions
  loadQueue: (sentences: Sentence[], startIndex?: number) => void
  next: () => void
  prev: () => void
  setPlaying: (playing: boolean) => void
  toggleShuffle: () => void
  toggleAutoplay: () => void
  toggleLoopCurrent: () => void
  jumpTo: (index: number) => void
  clear: () => void
}

function shuffleArray<T>(arr: T[]): T[] {
  const shuffled = [...arr]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export const usePlayerStore = create<PlayerStore>((set, get) => ({
  queue: [],
  currentIndex: 0,
  isPlaying: false,
  isShuffled: false,
  autoplay: true,
  loopCurrent: false,

  loadQueue: (sentences, startIndex = 0) => {
    const { isShuffled } = get()
    const queue = isShuffled ? shuffleArray(sentences) : sentences
    set({ queue, currentIndex: startIndex, isPlaying: true })
  },

  next: () => {
    const { queue, currentIndex, loopCurrent } = get()
    if (loopCurrent) return // stay on current
    if (currentIndex < queue.length - 1) {
      set({ currentIndex: currentIndex + 1 })
    } else {
      set({ isPlaying: false }) // end of queue
    }
  },

  prev: () => {
    const { currentIndex } = get()
    if (currentIndex > 0) {
      set({ currentIndex: currentIndex - 1 })
    }
  },

  setPlaying: (isPlaying) => set({ isPlaying }),

  toggleShuffle: () => {
    const { isShuffled, queue, currentIndex } = get()
    const currentSentence = queue[currentIndex]
    if (!isShuffled) {
      const shuffled = shuffleArray(queue)
      const newIndex = shuffled.findIndex(s => s.id === currentSentence?.id)
      set({ isShuffled: true, queue: shuffled, currentIndex: newIndex ?? 0 })
    } else {
      // Restore original order (re-sort by created_at)
      const sorted = [...queue].sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )
      const newIndex = sorted.findIndex(s => s.id === currentSentence?.id)
      set({ isShuffled: false, queue: sorted, currentIndex: newIndex ?? 0 })
    }
  },

  toggleAutoplay: () => set(s => ({ autoplay: !s.autoplay })),
  toggleLoopCurrent: () => set(s => ({ loopCurrent: !s.loopCurrent })),
  jumpTo: (index) => set({ currentIndex: index, isPlaying: true }),
  clear: () => set({ queue: [], currentIndex: 0, isPlaying: false }),
}))
