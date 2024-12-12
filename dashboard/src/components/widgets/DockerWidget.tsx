import { CubeIcon, PlayIcon, StopIcon, ReloadIcon } from '@radix-ui/react-icons'
import { useDockerStatus } from '../../hooks/useDockerStatus'

export const DockerWidget = () => {
  const { containers, isLoading, error, refetch } = useDockerStatus()

  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CubeIcon className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Docker Status</h2>
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
      ) : isLoading ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          Loading containers...
        </div>
      ) : containers.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-4">
          No containers found
        </div>
      ) : (
        <div className="space-y-4">
          {containers.map(container => (
            <div key={container.name} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {container.status === 'running' ? (
                  <PlayIcon className="w-4 h-4 text-green-500" />
                ) : (
                  <StopIcon className="w-4 h-4 text-red-500" />
                )}
                <span className="text-sm">{container.name}</span>
              </div>
              <span className={`text-sm font-medium ${
                container.status === 'running' ? 'text-green-500' : 'text-red-500'
              }`}>
                {container.status.charAt(0).toUpperCase() + container.status.slice(1)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
} 