export type Language = {
  code: string
  name: string
  voiceId: string // ElevenLabs voice ID
}

export type Collection = {
  id: string
  user_id: string
  name: string
  target_language: string
  voice_id: string
  created_at: string
  sentence_count?: number
}

export type Sentence = {
  id: string
  collection_id: string
  user_id: string
  source_text: string        // English
  target_text: string | null // Mandarin (or target language)
  phonetic_text: string | null // Pinyin, romaji, transliteration, etc.
  audio_url: string | null   // ElevenLabs generated MP3
  audio_status: 'pending' | 'generating' | 'ready' | 'error'
  created_at: string
}

export type RecallResult = {
  id: string
  sentence_id: string
  user_id: string
  correct: boolean
  attempted_at: string
}

export type PlayerState = {
  queue: Sentence[]
  currentIndex: number
  isPlaying: boolean
  isShuffled: boolean
  autoplay: boolean
  loopCurrent: boolean
}
