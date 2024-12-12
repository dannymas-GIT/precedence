import { BarChartIcon, ReloadIcon, ArrowUpIcon, ArrowDownIcon } from '@radix-ui/react-icons'
import { useState, useEffect } from 'react'

interface Metric {
  name: string
  value: number
  unit: string
  trend: 'up' | 'down' | 'neutral'
  change?: number
}

const defaultMetrics: Metric[] = [
  {
    name: 'CPU Usage',
    value: 0,
    unit: '%',
    trend: 'neutral'
  },
  {
    name: 'Memory Usage',
    value: 0,
    unit: '%',
    trend: 'neutral'
  },
  {
    name: 'Disk Usage',
    value: 0,
    unit: '%',
    trend: 'neutral'
  },
  {
    name: 'Active Containers',
    value: 0,
    unit: '',
    trend: 'neutral'
  }
]

export const MetricsWidget = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const [metrics, setMetrics] = useState<Metric[]>(defaultMetrics)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMetrics = async () => {
    try {
      const response = await fetch(`${API_URL}/api/metrics`)
      if (!response.ok) {
        throw new Error('Failed to fetch metrics')
      }
      const data = await response.json()
      setMetrics(data.metrics || defaultMetrics)
      setError(null)
    } catch (error) {
      setError('Failed to fetch metrics')
      setMetrics(defaultMetrics)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMetrics()
    const interval = setInterval(fetchMetrics, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [])

  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChartIcon className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Application Metrics</h2>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm text-destructive">Connection error</span>
          )}
          {isLoading && <ReloadIcon className="w-4 h-4 animate-spin" />}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        {metrics.map((metric) => (
          <div key={metric.name} className="p-3 rounded-md bg-muted/50">
            <div className="text-sm text-muted-foreground">{metric.name}</div>
            <div className="mt-1 flex items-center justify-between">
              <div className="text-2xl font-semibold">
                {metric.value}
                <span className="text-sm font-normal ml-1">{metric.unit}</span>
              </div>
              {metric.trend !== 'neutral' && (
                <div className={`flex items-center ${
                  metric.trend === 'up' ? 'text-green-500' : 'text-red-500'
                }`}>
                  {metric.trend === 'up' ? (
                    <ArrowUpIcon className="w-4 h-4" />
                  ) : (
                    <ArrowDownIcon className="w-4 h-4" />
                  )}
                  {metric.change && (
                    <span className="text-sm ml-1">{metric.change}%</span>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 