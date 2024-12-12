#!/usr/bin/env node

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '..')

// Function to run a command
const runCommand = (command, args, options = {}) => {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      ...options
    })

    child.on('error', reject)
    child.on('exit', code => {
      if (code === 0) resolve()
      else reject(new Error(`Command failed with exit code ${code}`))
    })
  })
}

// Main function to start the dashboard
async function startDashboard() {
  try {
    console.log('🚀 Starting Development Dashboard...')

    // Run frontend and API concurrently
    await runCommand('npm', ['run', 'start'], {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        VITE_PROJECT_ROOT: process.cwd(), // Pass the current project root to the dashboard
        VITE_API_URL: 'http://localhost:3001'
      }
    })
  } catch (error) {
    console.error('❌ Failed to start dashboard:', error)
    process.exit(1)
  }
}

// Start the dashboard
startDashboard() 