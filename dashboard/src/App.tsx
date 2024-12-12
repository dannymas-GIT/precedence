import { useState } from 'react'
import { GitWidget } from './components/widgets/GitWidget'
import { DockerWidget } from './components/widgets/DockerWidget'
import { LinterWidget } from './components/widgets/LinterWidget'
import { SwaggerWidget } from './components/widgets/SwaggerWidget'
import { MetricsWidget } from './components/widgets/MetricsWidget'
import { LogSearchWidget } from './components/widgets/LogSearchWidget'

function App() {
  const [darkMode, setDarkMode] = useState(false)

  return (
    <div className={`min-h-screen w-full ${darkMode ? 'dark' : ''}`}>
      <div className="container mx-auto p-4">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">Development Dashboard</h1>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {darkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <MetricsWidget />
          <GitWidget />
          <DockerWidget />
          <LinterWidget />
          <SwaggerWidget />
          <LogSearchWidget />
        </main>
      </div>
    </div>
  )
}

export default App
