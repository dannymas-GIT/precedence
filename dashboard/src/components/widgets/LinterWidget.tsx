import { CheckCircledIcon, CrossCircledIcon, ExclamationTriangleIcon, ReloadIcon } from '@radix-ui/react-icons'
import { useLinterStatus } from '../../hooks/useLinterStatus'
import { useState, useEffect } from 'react'

interface LinterConfig {
  enabled: boolean
  severity: number
  tools: {
    eslint: boolean
    typescript: boolean
    pylint: boolean
  }
}

export const LinterWidget = () => {
  const { issues, isLoading, error, refetch } = useLinterStatus()
  const [config, setConfig] = useState<LinterConfig>({
    enabled: true,
    severity: 0.7,
    tools: {
      eslint: true,
      typescript: true,
      pylint: true
    }
  })

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  useEffect(() => {
    // Fetch initial config
    fetch(`${API_URL}/api/linter/config`)
      .then(res => res.json())
      .then(setConfig)
      .catch(console.error)
  }, [API_URL])

  const handleConfigChange = async (updates: Partial<LinterConfig>) => {
    const newConfig = { ...config, ...updates }
    setConfig(newConfig)
    try {
      await fetch(`${API_URL}/api/linter/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig)
      })
      refetch()
    } catch (err) {
      console.error('Failed to update linter config:', err)
    }
  }

  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Linter Status</h2>
        </div>
        <button 
          onClick={() => refetch()} 
          className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          disabled={isLoading}
        >
          <ReloadIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {error ? (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Linting Controls */}
          <div className="space-y-2 border-b pb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Enable Linting</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={config.enabled}
                  onChange={e => handleConfigChange({ enabled: e.target.checked })}
                  disabled={isLoading}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Severity: {(config.severity * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={config.severity}
                onChange={e => handleConfigChange({ severity: parseFloat(e.target.value) })}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                disabled={isLoading || !config.enabled}
              />
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Active Tools</span>
              {Object.entries(config.tools).map(([tool, enabled]) => (
                <div key={tool} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id={tool}
                    checked={enabled}
                    onChange={e => handleConfigChange({
                      tools: { ...config.tools, [tool]: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    disabled={isLoading || !config.enabled}
                  />
                  <label htmlFor={tool} className="text-sm">
                    {tool.charAt(0).toUpperCase() + tool.slice(1)}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Linting Results */}
          {isLoading ? (
            <div className="text-sm text-muted-foreground text-center py-4">
              Loading linting status...
            </div>
          ) : config.enabled ? (
            issues.length > 0 ? (
              issues.map(issue => (
                <div key={issue.tool} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {issue.errors === 0 && issue.warnings === 0 ? (
                      <CheckCircledIcon className="w-4 h-4 text-green-500" />
                    ) : issue.errors > 0 ? (
                      <CrossCircledIcon className="w-4 h-4 text-red-500" />
                    ) : (
                      <ExclamationTriangleIcon className="w-4 h-4 text-yellow-500" />
                    )}
                    <span className="text-sm">{issue.tool}</span>
                  </div>
                  <span className="text-sm font-medium">
                    {issue.errors > 0 
                      ? `${issue.errors} ${issue.errors === 1 ? 'error' : 'errors'}`
                      : issue.warnings > 0
                      ? `${issue.warnings} ${issue.warnings === 1 ? 'warning' : 'warnings'}`
                      : 'No issues'
                    }
                  </span>
                </div>
              ))
            ) : (
              <div className="text-sm text-muted-foreground text-center py-4">
                No linting issues found
              </div>
            )
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              Linting is disabled
            </div>
          )}
        </div>
      )}
    </div>
  )
} 