// src/main.ts

type User = {
  id: string
  name: string
  email: string
}

type PrintJob = {
  id: string
  userId: string
  partName: string
  quantity: number
  color: string
  material: string
  status: string
  createdAt: string
  user: User
}

type ApiResponse = {
  success: boolean
  data: PrintJob[]
  count?: number
}

const API_URL = 'http://localhost:3000/api/jobs'

// UI Elements
const loadingEl = document.getElementById('loading')!
const errorEl = document.getElementById('error')!
const tableContainerEl = document.getElementById('table-container')!
const emptyStateEl = document.getElementById('empty-state')!
const jobsBodyEl = document.getElementById('jobs-body')!

async function loadPrintJobs() {
  try {
    // Show loading state
    showLoading()

    const res = await fetch(API_URL)
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const json: ApiResponse = await res.json()

    if (!json.success) {
      throw new Error('API returned failure')
    }

    console.log('Loaded jobs:', json.data)

    // Hide loading
    hideLoading()

    // Render jobs
    if (json.data && json.data.length > 0) {
      renderJobs(json.data)
      showTable()
    } else {
      showEmptyState()
    }
  } catch (err) {
    console.error('Failed to load jobs:', err)
    hideLoading()
    showError(err instanceof Error ? err.message : 'Unknown error occurred')
  }
}

function renderJobs(jobs: PrintJob[]) {
  jobsBodyEl.innerHTML = ''

  for (const job of jobs) {
    const row = document.createElement('tr')

    row.innerHTML = `
      <td><code>${job.id.substring(0, 8)}...</code></td>
      <td><strong>${job.partName}</strong></td>
      <td>${job.user.name}<br/><small style="color: #6c757d;">${job.user.email}</small></td>
      <td>${job.material} - ${job.color}</td>
      <td><span class="status ${job.status}">${job.status}</span></td>
      <td>${new Date(job.createdAt).toLocaleString()}</td>
    `

    jobsBodyEl.appendChild(row)
  }
}

function showLoading() {
  loadingEl.style.display = 'block'
  errorEl.style.display = 'none'
  tableContainerEl.style.display = 'none'
  emptyStateEl.style.display = 'none'
}

function hideLoading() {
  loadingEl.style.display = 'none'
}

function showTable() {
  tableContainerEl.style.display = 'block'
  emptyStateEl.style.display = 'none'
  errorEl.style.display = 'none'
}

function showEmptyState() {
  emptyStateEl.style.display = 'block'
  tableContainerEl.style.display = 'none'
  errorEl.style.display = 'none'
}

function showError(message: string) {
  errorEl.textContent = `Error: ${message}`
  errorEl.style.display = 'block'
  tableContainerEl.style.display = 'none'
  emptyStateEl.style.display = 'none'
}

// Load jobs on page load
loadPrintJobs()

// Refresh every 10 seconds
setInterval(loadPrintJobs, 10000)