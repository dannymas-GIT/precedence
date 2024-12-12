import { GitHubLogoIcon, CommitIcon, ArrowRightIcon, ReloadIcon } from '@radix-ui/react-icons'
import { useGitStatus } from '../../hooks/useGitStatus'
import { formatDistanceToNow } from 'date-fns'

export const GitWidget = () => {
  const { currentBranch, lastCommit, openPRs, isLoading, error, refetch } = useGitStatus()

  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitHubLogoIcon className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Git Status</h2>
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitHubLogoIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Current Branch</span>
            </div>
            <span className="text-sm font-medium">
              {isLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : currentBranch.error ? (
                <span className="text-destructive">{currentBranch.branch}</span>
              ) : (
                currentBranch.branch || '-'
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CommitIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Last Commit</span>
            </div>
            <span className="text-sm font-medium">
              {isLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : lastCommit.error ? (
                <span className="text-destructive">{lastCommit.message}</span>
              ) : (
                lastCommit.timestamp 
                  ? formatDistanceToNow(new Date(lastCommit.timestamp), { addSuffix: true })
                  : '-'
              )}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ArrowRightIcon className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Open PRs</span>
            </div>
            <span className="text-sm font-medium">
              {isLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : (
                openPRs
              )}
            </span>
          </div>
        </div>
      )}
    </div>
  )
} 