'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'

export function UserMenu() {
  const [email, setEmail] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null)
    })
  }, [])

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!email) return null

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground hidden sm:block truncate max-w-[200px]">
        {email}
      </span>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleSignOut}
        title={`Sign out (${email})`}
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
      >
        <LogOut className="w-4 h-4" />
      </Button>
    </div>
  )
}
