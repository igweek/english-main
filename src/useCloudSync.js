import { useEffect, useRef, useState } from 'react'
import { cloudEnabled, supabase } from './supabase'

export function useCloudSync(state, setState) {
  const [user, setUser] = useState(null)
  const [status, setStatus] = useState(cloudEnabled ? 'loading' : 'local')
  const hydratedUser = useRef(null)
  const stateRef = useRef(state)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user || null))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null)
      if (!session) {
        hydratedUser.current = null
        setStatus('local')
      }
    })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!supabase || !user || hydratedUser.current === user.id) return
    let cancelled = false

    async function hydrate() {
      setStatus('loading')
      const { data, error } = await supabase
        .from('learning_states')
        .select('state')
        .eq('user_id', user.id)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        setStatus('error')
        return
      }

      if (data?.state) {
        setState((current) => ({ ...current, ...data.state }))
      } else {
        const { error: uploadError } = await supabase
          .from('learning_states')
          .upsert({ user_id: user.id, state: stateRef.current, updated_at: new Date().toISOString() })
        if (uploadError) {
          setStatus('error')
          return
        }
      }
      hydratedUser.current = user.id
      setStatus('synced')
    }

    hydrate()
    return () => { cancelled = true }
  }, [user, setState])

  useEffect(() => {
    if (!supabase || !user || hydratedUser.current !== user.id) return
    setStatus('saving')
    const timer = setTimeout(async () => {
      const { error } = await supabase
        .from('learning_states')
        .upsert({ user_id: user.id, state, updated_at: new Date().toISOString() })
      setStatus(error ? 'error' : 'synced')
    }, 700)
    return () => clearTimeout(timer)
  }, [state, user])

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
  }

  return { user, status, signOut, cloudEnabled }
}
