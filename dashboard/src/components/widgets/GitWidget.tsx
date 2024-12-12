import { 
  GitHubLogoIcon, 
  CommitIcon, 
  ArrowRightIcon, 
  ReloadIcon, 
  PlusIcon,
  UploadIcon,
  DownloadIcon,
  LayersIcon,
  BranchIcon,
  CaretSortIcon
} from '@radix-ui/react-icons'
import { useGitStatus } from '../../hooks/useGitStatus'
import { formatDistanceToNow } from 'date-fns'
import { useState } from 'react'

interface CommitPreview {
  message: string
  changes: string[]
}

interface CommitInfo {
  message: string
  timestamp: string
  relative_time: string
  author?: {
    name: string
    email: string
  }
  error?: string
}

export const GitWidget = () => {
  const { currentBranch, lastCommit, openPRs, isLoading, error, refetch } = useGitStatus()
  const [showCommitModal, setShowCommitModal] = useState(false)
  const [showBranchModal, setShowBranchModal] = useState(false)
  const [commitPreview, setCommitPreview] = useState<CommitPreview | null>(null)
  const [isCommitting, setIsCommitting] = useState(false)
  const [commitError, setCommitError] = useState<string | null>(null)
  const [newBranchName, setNewBranchName] = useState('')
  const [availableBranches, setAvailableBranches] = useState<string[]>([])
  const [showBranchList, setShowBranchList] = useState(false)

  const API_URL = import.meta.env.VITE_API_URL || '/dashboard-api'

  const handleCreateFeatureCommit = async () => {
    try {
      setIsCommitting(true)
      setCommitError(null)

      const previewResponse = await fetch(`${API_URL}/api/git/commit/preview`, {
        headers: { 'Accept': 'application/json' }
      })

      if (!previewResponse.ok) {
        throw new Error('Failed to generate commit preview')
      }

      const preview = await previewResponse.json()
      setCommitPreview(preview)
      setShowCommitModal(true)
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to create commit')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleConfirmCommit = async () => {
    try {
      setIsCommitting(true)
      setCommitError(null)

      const response = await fetch(`${API_URL}/api/git/commit/feature`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to create commit')
      }

      setShowCommitModal(false)
      setCommitPreview(null)
      refetch()
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to create commit')
    } finally {
      setIsCommitting(false)
    }
  }

  const handlePush = async () => {
    try {
      setIsCommitting(true)
      setCommitError(null)

      const response = await fetch(`${API_URL}/api/git/push`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Cache-Control': 'no-cache'
        }
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 409) {
          // Handle non-fast-forward error
          const shouldPull = window.confirm(
            'Remote has new changes. Would you like to pull these changes first?'
          )
          if (shouldPull) {
            await handlePull()
            // Retry push after successful pull
            return handlePush()
          }
          throw new Error('Please pull changes first')
        }
        throw new Error(errorData.detail || 'Failed to push changes')
      }

      const data = await response.json()
      console.log('Push successful:', data.message)
      refetch()
    } catch (err) {
      console.error('Push error:', err)
      setCommitError(err instanceof Error ? err.message : 'Failed to push changes')
    } finally {
      setIsCommitting(false)
    }
  }

  const handlePull = async () => {
    try {
      setIsCommitting(true)
      setCommitError(null)

      const response = await fetch(`${API_URL}/api/git/pull`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to pull changes')
      }

      refetch()
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to pull changes')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleStash = async () => {
    try {
      setIsCommitting(true)
      setCommitError(null)

      const response = await fetch(`${API_URL}/api/git/stash`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to stash changes')
      }

      refetch()
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to stash changes')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleStashPop = async () => {
    try {
      setIsCommitting(true)
      setCommitError(null)

      const response = await fetch(`${API_URL}/api/git/stash/pop`, {
        method: 'POST',
        headers: { 'Accept': 'application/json' }
      })

      if (!response.ok) {
        throw new Error('Failed to pop stashed changes')
      }

      refetch()
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to pop stashed changes')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleCreateBranch = async () => {
    try {
      setIsCommitting(true)
      setCommitError(null)

      const response = await fetch(`${API_URL}/api/git/branch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ name: newBranchName })
      })

      if (!response.ok) {
        throw new Error('Failed to create branch')
      }

      setShowBranchModal(false)
      setNewBranchName('')
      refetch()
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to create branch')
    } finally {
      setIsCommitting(false)
    }
  }

  const handleSwitchBranch = async (branch: string) => {
    try {
      setIsCommitting(true)
      setCommitError(null)

      const response = await fetch(`${API_URL}/api/git/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ branch })
      })

      if (!response.ok) {
        throw new Error('Failed to switch branch')
      }

      setShowBranchList(false)
      refetch()
    } catch (err) {
      setCommitError(err instanceof Error ? err.message : 'Failed to switch branch')
    } finally {
      setIsCommitting(false)
    }
  }

  const fetchBranches = async () => {
    try {
      const response = await fetch(`${API_URL}/api/git/branches`)
      if (!response.ok) throw new Error('Failed to fetch branches')
      const data = await response.json()
      setAvailableBranches(data.branches)
    } catch (err) {
      console.error('Failed to fetch branches:', err)
    }
  }

  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <GitHubLogoIcon className="w-5 h-5" />
          <h2 className="text-lg font-semibold">Git Status</h2>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleCreateFeatureCommit}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1 text-sm"
            disabled={isLoading || isCommitting}
            title="Create feature commit"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Feature</span>
          </button>
          <button
            onClick={handlePush}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading || isCommitting}
            title="Push changes"
          >
            <UploadIcon className="w-4 h-4" />
          </button>
          <button
            onClick={handlePull}
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading || isCommitting}
            title="Pull changes"
          >
            <DownloadIcon className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => {
                fetchBranches()
                setShowBranchList(!showBranchList)
              }}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isLoading || isCommitting}
              title="Switch branch"
            >
              <CaretSortIcon className="w-4 h-4" />
            </button>
            {showBranchList && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                <div className="p-2">
                  {availableBranches.map(branch => (
                    <button
                      key={branch}
                      onClick={() => handleSwitchBranch(branch)}
                      className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                    >
                      {branch}
                    </button>
                  ))}
                  <button
                    onClick={() => {
                      setShowBranchList(false)
                      setShowBranchModal(true)
                    }}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm text-blue-600"
                  >
                    + New Branch
                  </button>
                </div>
              </div>
            )}
          </div>
          <div className="relative">
            <button
              onClick={() => setShowBranchList(!showBranchList)}
              className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
              disabled={isLoading || isCommitting}
              title="Stash operations"
            >
              <LayersIcon className="w-4 h-4" />
            </button>
            {showBranchList && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-50">
                <div className="p-2">
                  <button
                    onClick={handleStash}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                  >
                    Stash Changes
                  </button>
                  <button
                    onClick={handleStashPop}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-md text-sm"
                  >
                    Pop Stashed Changes
                  </button>
                </div>
              </div>
            )}
          </div>
          <button 
            onClick={() => refetch()} 
            className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
            disabled={isLoading || isCommitting}
            title="Refresh status"
          >
            <ReloadIcon className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {(error || commitError) && (
        <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
          {error || commitError}
        </div>
      )}

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
          <div className="text-right">
            <span className="text-sm font-medium block">
              {isLoading ? (
                <span className="text-muted-foreground">Loading...</span>
              ) : lastCommit.error ? (
                <span className="text-destructive">{lastCommit.message}</span>
              ) : (
                lastCommit.relative_time || formatDistanceToNow(new Date(lastCommit.timestamp), { addSuffix: true })
              )}
            </span>
            {!isLoading && !lastCommit.error && lastCommit.author && (
              <span className="text-xs text-muted-foreground">
                by {lastCommit.author.name}
              </span>
            )}
          </div>
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

      {/* Commit Preview Modal */}
      {showCommitModal && commitPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">Create Feature Commit</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Commit Message</label>
              <div className="p-2 bg-gray-50 rounded text-sm font-mono">
                {commitPreview.message}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Changes</label>
              <div className="max-h-60 overflow-y-auto">
                <ul className="space-y-1 text-sm font-mono">
                  {commitPreview.changes.map((change, index) => (
                    <li key={index} className="p-2 bg-gray-50 rounded">
                      {change}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowCommitModal(false)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                disabled={isCommitting}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmCommit}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={isCommitting}
              >
                {isCommitting ? 'Creating...' : 'Create Commit'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Branch Modal */}
      {showBranchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 space-y-4">
            <h3 className="text-lg font-semibold">Create New Branch</h3>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Branch Name</label>
              <input
                type="text"
                value={newBranchName}
                onChange={(e) => setNewBranchName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="feature/my-new-branch"
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <button
                onClick={() => setShowBranchModal(false)}
                className="px-4 py-2 text-sm rounded-lg border hover:bg-gray-50"
                disabled={isCommitting}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateBranch}
                className="px-4 py-2 text-sm rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                disabled={isCommitting || !newBranchName.trim()}
              >
                {isCommitting ? 'Creating...' : 'Create Branch'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 