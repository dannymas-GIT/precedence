import { MagnifyingGlassIcon, ReloadIcon, CrossCircledIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'

interface LogEntry {
  timestamp: string
  level: 'info' | 'warn' | 'error' | 'debug'
  message: string
  service: string
}

interface LogSearchParams {
  query: string
  level?: string
  service?: string
  startTime?: string
  endTime?: string
}

export const LogSearchWidget = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchParams, setSearchParams] = useState<LogSearchParams>({
    query: '',
    level: '',
    service: ''
  })

  const fetchLogs = async () => {
    try {
      setIsLoading(true)
      const queryParams = new URLSearchParams()
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value) queryParams.append(key, value)
      })

      const response = await fetch(`${API_URL}/api/logs/search?${queryParams}`)
      const data = await response.json()
      setLogs(data.logs)
      setError(null)
    } catch (error) {
      setError('Failed to fetch logs')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    fetchLogs()
  }

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-500'
      case 'warn': return 'text-yellow-500'
      case 'info': return 'text-blue-500'
      default: return 'text-gray-500'
    }
  }

  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm col-span-full">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MagnifyingGlassIcon className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Log Search</h2>
        </div>
        {isLoading && <ReloadIcon className="w-4 h-4 animate-spin" />}
      </div>

      <form onSubmit={handleSearch} className="space-y-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search logs..."
            className="px-3 py-2 rounded-md border bg-background"
            value={searchParams.query}
            onChange={(e) => setSearchParams(prev => ({ ...prev, query: e.target.value }))}
          />
          <select
            className="px-3 py-2 rounded-md border bg-background"
            value={searchParams.level}
            onChange={(e) => setSearchParams(prev => ({ ...prev, level: e.target.value }))}
          >
            <option value="">All Levels</option>
            <option value="debug">Debug</option>
            <option value="info">Info</option>
            <option value="warn">Warning</option>
            <option value="error">Error</option>
          </select>
          <select
            className="px-3 py-2 rounded-md border bg-background"
            value={searchParams.service}
            onChange={(e) => setSearchParams(prev => ({ ...prev, service: e.target.value }))}
          >
            <option value="">All Services</option>
            <option value="frontend">Frontend</option>
            <option value="backend">Backend</option>
            <option value="api">API</option>
          </select>
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Search
          </button>
        </div>
      </form>

      {error ? (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive">
          <div className="flex items-center gap-2">
            <CrossCircledIcon className="w-4 h-4" />
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {logs.map((log, index) => (
            <div
              key={index}
              className="p-2 rounded-md bg-muted/50 flex items-start gap-3"
            >
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {new Date(log.timestamp).toLocaleString()}
              </div>
              <div className={`text-sm font-medium ${getLevelColor(log.level)} uppercase`}>
                {log.level}
              </div>
              <div className="text-sm text-muted-foreground">{log.service}</div>
              <div className="text-sm flex-1">{log.message}</div>
            </div>
          ))}
          {logs.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No logs found. Try adjusting your search criteria.
            </p>
          )}
        </div>
      )}
    </div>
  )
} 