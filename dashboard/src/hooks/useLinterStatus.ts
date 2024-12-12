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
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Failed to fetch linter status: ${response.status}`)
      }

      const data = await response.json()
      
      // Validate response data structure
      if (!Array.isArray(data.tools)) {
        throw new Error('Invalid linter status response format')
      }

      setStatus(prev => ({
        ...prev,
        issues: data.tools.map((tool: any) => ({
          tool: String(tool.tool || ''),
          errors: Number(tool.errors || 0),
          warnings: Number(tool.warnings || 0)
        })),
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