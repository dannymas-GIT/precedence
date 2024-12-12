import { useState, useEffect, useCallback } from 'react'

interface ContainerStatus {
  name: string
  status: 'running' | 'stopped' | 'exited' | 'error'
}

interface DockerStatus {
  containers: ContainerStatus[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export const useDockerStatus = (): DockerStatus => {
  const [status, setStatus] = useState<DockerStatus>({
    containers: [],
    isLoading: true,
    error: null,
    refetch: async () => {}
  })

  const API_URL = import.meta.env.VITE_API_URL || '/dashboard-api'

  const fetchDockerStatus = useCallback(async () => {
    try {
      setStatus(prev => ({ ...prev, isLoading: true, error: null }))

      const response = await fetch(`${API_URL}/api/docker/containers`, {
        headers: {
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch Docker status')
      }

      const data = await response.json()
      if (data.error) {
        throw new Error(data.error)
      }

      setStatus(prev => ({
        ...prev,
        containers: data.containers.map((container: any) => ({
          name: container.name,
          status: container.state.toLowerCase() as ContainerStatus['status']
        })),
        isLoading: false,
        error: null
      }))
    } catch (error) {
      console.error('Docker status error:', error)
      setStatus(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch Docker status'
      }))
    }
  }, [API_URL])

  useEffect(() => {
    fetchDockerStatus()
    const interval = setInterval(fetchDockerStatus, 10000)
    return () => clearInterval(interval)
  }, [fetchDockerStatus])

  return {
    ...status,
    refetch: fetchDockerStatus
  }
} 