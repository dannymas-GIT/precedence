import { useState, useEffect, useCallback } from 'react'

interface LinterIssue {
  tool: string
  errors: number
  warnings: number
}

interface LinterStatus {
  issues: LinterIssue[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useLinterStatus = (): LinterStatus => {
  const [status, setStatus] = useState<LinterStatus>({
    issues: [],
    isLoading: true,
    error: null,
    refetch: async () => {}
  })

  const API_URL = import.meta.env.VITE_API_URL || '/dashboard-api'

  const fetchLinterStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(`${API_URL}/api/linter/status`, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch linter status')
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setStatus(prev => ({
        ...prev,
        issues: data.tools || [],
        isLoading: false,
        error: null
      }))
    } catch (error) {
      console.error('Linter status error:', error)
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch linter status',
        issues: []
      }))
    }
  }, [API_URL])

  useEffect(() => {
    fetchLinterStatus()
    const interval = setInterval(fetchLinterStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchLinterStatus])

  return {
    ...status,
    refetch: fetchLinterStatus
  }
} 