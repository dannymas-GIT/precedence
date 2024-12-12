import { FileTextIcon, ExternalLinkIcon } from '@radix-ui/react-icons'

export const SwaggerWidget = () => {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

  return (
    <div className="p-4 rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <FileTextIcon className="w-5 h-5" />
        <h2 className="text-lg font-semibold">API Documentation</h2>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">Swagger UI</span>
          </div>
          <a
            href={`${API_URL}/docs`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-600"
          >
            Open <ExternalLinkIcon className="w-4 h-4" />
          </a>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm">OpenAPI Spec</span>
          </div>
          <a
            href={`${API_URL}/openapi.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-blue-500 hover:text-blue-600"
          >
            View <ExternalLinkIcon className="w-4 h-4" />
          </a>
        </div>

        <div className="mt-4 text-sm text-muted-foreground">
          <p>Available Endpoints:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Git Status API</li>
            <li>Docker Containers API</li>
            <li>Linting Status API</li>
          </ul>
        </div>
      </div>
    </div>
  )
} 