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
        setIsLoading(false)
        return
      }

      console.log(`Have user ${user.email}`);
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
        
      if(data == null){
        console.log("No groups found");
      }
      else if(data.length > 1) {
        console.log("multiple groups found");
        data!.forEach(element => {
          console.log(`Group ${element.shopping_group_id} ${element.shopping_groups}`);
        });
      }

      const group = data![0];
      console.log(`Group ID ${group.shopping_group_id}`);

      if (data && !error) {
        setGroupId(group.shopping_group_id)
        setGroupName((group.shopping_groups as any)?.name || '')
        setUserRole(group.role as 'owner' | 'member')
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
