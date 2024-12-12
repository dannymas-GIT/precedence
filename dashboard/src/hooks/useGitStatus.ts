import { useState, useEffect, useCallback } from 'react'

interface BranchResponse {
  branch: string
  error?: string
}

interface CommitResponse {
  message: string
  timestamp: string
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
        fetch(`${API_URL}/api/git/branch`),
        fetch(`${API_URL}/api/git/commit`),
        fetch(`${API_URL}/api/git/prs`)
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

  useEffect(() => {
    fetchGitStatus()
    const interval = setInterval(fetchGitStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchGitStatus])

  return {
    ...status,
    refetch: fetchGitStatus
  }
} 