import { useState, useEffect, useCallback } from 'react'

interface BranchResponse {
  branch: string
  error?: string
}

interface CommitResponse {
  message: string
  timestamp: string
  relative_time?: string
  author?: {
    name: string
    email: string
  }
  error?: string
}

interface GitStatus {
  currentBranch: BranchResponse
  lastCommit: CommitResponse
  openPRs: number
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useGitStatus = (): GitStatus => {
  const [status, setStatus] = useState<GitStatus>({
    currentBranch: { branch: '' },
    lastCommit: { message: '', timestamp: '' },
    openPRs: 0,
    isLoading: true,
    error: null,
    refetch: async () => {}
  })

  const API_URL = import.meta.env.VITE_API_URL || '/dashboard-api'

  const fetchGitStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }))

      const [branchResponse, commitResponse, prResponse] = await Promise.all([
        fetch(`${API_URL}/api/git/branch`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch(`${API_URL}/api/git/commit`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        }),
        fetch(`${API_URL}/api/git/prs`, {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        })
      ])

      if (!branchResponse.ok) throw new Error('Failed to fetch branch')
      if (!commitResponse.ok) throw new Error('Failed to fetch commit')
      if (!prResponse.ok) throw new Error('Failed to fetch PRs')

      const [branchData, commitData, prData] = await Promise.all([
        branchResponse.json(),
        commitResponse.json(),
        prResponse.json()
      ])

      setStatus(prev => ({
        ...prev,
        currentBranch: branchData,
        lastCommit: commitData,
        openPRs: prData.count,
        isLoading: false,
        error: null
      }))
    } catch (error) {
      console.error('Failed to fetch Git status:', error)
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Git status'
      }))
    }
  }, [API_URL])

  // Initial fetch
  useEffect(() => {
    fetchGitStatus()
  }, [fetchGitStatus])

  // Set up polling for updates
  useEffect(() => {
    const interval = setInterval(fetchGitStatus, 5000) // Poll every 5 seconds
    return () => clearInterval(interval)
  }, [fetchGitStatus])

  // Set up commit event listener
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchGitStatus()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [fetchGitStatus])

  return {
    ...status,
    refetch: fetchGitStatus
  }
} 