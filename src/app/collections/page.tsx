'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { NewCollectionDialog } from '@/components/NewCollectionDialog'
import { Collection } from '@/types'
import { Languages, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CollectionsPage() {
  const [collections, setCollections] = useState<Collection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/collections')
      .then(r => r.json())
      .then(data => {
        setCollections(data)
        setLoading(false)
      })
  }, [])

  async function deleteCollection(id: string) {
    if (!confirm('Delete this collection and all its sentences?')) return
    await fetch('/api/collections', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setCollections(prev => prev.filter(c => c.id !== id))
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Collections</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Groups of sentences organised by language or topic.
          </p>
        </div>
        <NewCollectionDialog
          onCreated={c => setCollections(prev => [c, ...prev])}
        />
      </div>

      {loading && (
        <div className="text-sm text-muted-foreground">Loading...</div>
      )}

      {!loading && collections.length === 0 && (
        <div className="text-center py-20 text-muted-foreground">
          <Languages className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No collections yet. Create one to get started.</p>
        </div>
      )}

      <div className="grid gap-3">
        {collections.map(collection => (
          <div key={collection.id} className="group relative">
            <Link href={`/collections/${collection.id}`}>
              <Card className="hover:border-foreground/30 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base">{collection.name}</CardTitle>
                    <Badge variant="secondary" className="text-xs">
                      {collection.target_language}
                    </Badge>
                  </div>
                  <CardDescription>
                    {collection.sentence_count ?? 0} sentence{collection.sentence_count !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Button
              variant="ghost"
              size="icon"
              className="absolute right-3 top-3 md:opacity-0 md:group-hover:opacity-100 transition-opacity h-7 w-7 text-muted-foreground hover:text-destructive"
              onClick={e => { e.preventDefault(); deleteCollection(collection.id) }}
            >
              <Trash2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
