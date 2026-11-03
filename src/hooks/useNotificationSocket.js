import { useEffect, useState } from 'react'
import { io } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { baseURL } from '@/services/api'

const origin = () => new URL(baseURL, window.location.origin).origin

/**
 * Live notifications: the server pushes "notification:new" and we refetch once.
 * Returns whether the socket is connected so callers can fall back to slow polling.
 */
export function useNotificationSocket(enabled = true) {
  const queryClient = useQueryClient()
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (!enabled) return undefined
    const socket = io(origin(), {
      path: '/api/socket.io',
      // re-read on every (re)connect so a refreshed token is used
      auth: (cb) => cb({ token: localStorage.getItem('accessToken') }),
      reconnectionDelayMax: 30000,
    })
    const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] })
    socket.on('connect', () => { setConnected(true); refresh() })
    socket.on('disconnect', () => setConnected(false))
    socket.on('notification:new', refresh)
    return () => { socket.off(); socket.close(); setConnected(false) }
  }, [enabled, queryClient])

  return connected
}
