// src/lib/hooks/useUserGroup.ts
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useUserGroup() {
  const [groupId, setGroupId] = useState<string | null>(null)
  const [groupName, setGroupName] = useState<string>('')
  const [userRole, setUserRole] = useState<'owner' | 'member'>('member')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function loadGroup() {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Reset all state when user is logged out
        setGroupId(null)
        setGroupName('')
        setUserRole('member')
        setIsLoading(false)
        return
      }

      const { data, error } = await supabase
        .from('shopping_group_members')
        .select(`
          shopping_group_id,
          role,
          shopping_groups (
            name
          )
        `)
        .eq('user_id', user.id)

      if (data && data.length > 0 && !error) {
        const group = data[0]
        setGroupId(group.shopping_group_id)
        setGroupName((group.shopping_groups as any)?.name || '')
        setUserRole(group.role as 'owner' | 'member')
      } else {
        // No group found - reset state
        setGroupId(null)
        setGroupName('')
        setUserRole('member')
      }

      setIsLoading(false)
    }

    loadGroup()

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      loadGroup()
    })

    return () => subscription.unsubscribe()
  }, [])

  return { groupId, groupName, userRole, isLoading }
}
