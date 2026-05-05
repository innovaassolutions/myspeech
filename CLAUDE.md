# MySpeech

A language learning app built on the methodology of personalized sentence lists, audio immersion, shadowing, and active recall. The core idea: capture sentences from your real life in English, translate them to the target language, generate native-quality audio, and practice through listening and recall — not grammar study or flashcard apps.

## Stack

- **Next.js 15** (App Router, TypeScript, `src/` dir)
- **Supabase** — auth, PostgreSQL, Storage (audio files)
- **shadcn/ui + Tailwind CSS**
- **Zustand** — player queue state (`src/store/player.ts`)
- **Claude API** (`@anthropic-ai/sdk`) — translation
- **ElevenLabs** (`@elevenlabs/elevenlabs-js`) — TTS audio generation
- **Vercel** — deployment

## Key Directories

```
src/
  app/                  # Next.js App Router pages + API routes
    api/
      translate/        # POST: translate sentences via Claude
      generate-audio/   # POST: generate MP3 via ElevenLabs, upload to Supabase Storage
      sentences/        # GET/POST/DELETE: sentence CRUD
    collections/        # Collections list + detail pages
    practice/           # Active recall practice interface
  components/
    ui/                 # shadcn/ui primitives
  hooks/
    useAudioPlayer.ts   # HTML5 Audio + Media Session API integration
  lib/
    supabase/           # client.ts, server.ts, middleware.ts
  store/
    player.ts           # Zustand: queue, currentIndex, shuffle, autoplay, loop
  types/
    index.ts            # Shared TypeScript types
supabase/
  schema.sql            # Full DB schema + RLS policies + Storage bucket
```

## Dev Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run lint     # ESLint
```

## Core Data Flow

```
User types/pastes English sentences
  → POST /api/sentences         (store source_text, audio_status: 'pending')
  → POST /api/translate         (Claude translates → updates target_text)
  → POST /api/generate-audio    (ElevenLabs → MP3 → Supabase Storage → updates audio_url)
  → Player loads audio_url      (HTML5 Audio, autoplay queue, shuffle, loop)
```

## Audio Player Architecture

The player state lives in Zustand (`src/store/player.ts`). The `useAudioPlayer` hook (`src/hooks/useAudioPlayer.ts`) owns the single `HTMLAudioElement` instance and responds to state changes. The player supports:

- Single sentence playback
- Queue playback (subset of a collection)
- Autoplay (advances on `audio.onended`)
- Shuffle (Fisher-Yates on load or toggle)
- Loop current sentence
- Media Session API for lock screen controls

## Important Conventions

- Audio files are stored at `audio/{user_id}/{sentence_id}.mp3` in Supabase Storage
- The `audio_status` field tracks pipeline state: `pending → generating → ready | error`
- Translation text (`target_text`) is infrastructure — it feeds ElevenLabs but is never the primary UI shown to learners
- The learner always sees English (`source_text`) and hears the target language audio
- Generate audio one sentence at a time via the API route; trigger in batches from the client after translation completes
