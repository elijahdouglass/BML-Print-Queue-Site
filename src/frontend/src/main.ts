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
const tabs = document.querySelectorAll('.tab')
const tabContents = document.querySelectorAll('.tab-content')

// Tab grids
const pendingGrid = document.getElementById('pending-grid')!
const inProgressGrid = document.getElementById('in-progress-grid')!
const resolvedGrid = document.getElementById('resolved-grid')!

// Empty states
const pendingEmpty = document.getElementById('pending-empty')!
const inProgressEmpty = document.getElementById('in-progress-empty')!
const resolvedEmpty = document.getElementById('resolved-empty')!

// Modal elements
const modal = document.getElementById('job-modal')!
const closeModalBtn = document.getElementById('close-modal')!
const modalJobName = document.getElementById('modal-job-name')!
const modalJobId = document.getElementById('modal-job-id')!
const modalJobStatus = document.getElementById('modal-job-status')!
const modalJobMaterial = document.getElementById('modal-job-material')!
const modalJobColor = document.getElementById('modal-job-color')!
const modalJobQuantity = document.getElementById('modal-job-quantity')!
const modalJobCreated = document.getElementById('modal-job-created')!
const modalUserName = document.getElementById('modal-user-name')!
const modalUserEmail = document.getElementById('modal-user-email')!
const downloadStlBtn = document.getElementById('download-stl-btn')!
const startJobBtn = document.getElementById('start-job-btn')!
const completeJobBtn = document.getElementById('complete-job-btn')!
const cancelJobBtn = document.getElementById('cancel-job-btn')!

let allJobs: PrintJob[] = []
let currentJob: PrintJob | null = null

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab')!
    
    // Update active tab
    tabs.forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    
    // Update active content
    tabContents.forEach(content => content.classList.remove('active'))
    document.getElementById(`${tabName}-tab`)!.classList.add('active')
  })
})

// Modal controls
closeModalBtn.addEventListener('click', closeModal)
modal.addEventListener('click', (e) => {
  if (e.target === modal) {
    closeModal()
  }
})

downloadStlBtn.addEventListener('click', () => {
  if (currentJob) {
    downloadSTL(currentJob)
  }
})

startJobBtn.addEventListener('click', async () => {
  if (currentJob && currentJob.status === 'PENDING') {
    await updateJobStatus(currentJob.id, 'IN_PROGRESS')
  }
})

completeJobBtn.addEventListener('click', async () => {
  if (currentJob && currentJob.status === 'IN_PROGRESS') {
    await updateJobStatus(currentJob.id, 'COMPLETED')
  }
})

cancelJobBtn.addEventListener('click', async () => {
  if (currentJob && (currentJob.status === 'PENDING' || currentJob.status === 'IN_PROGRESS')) {
    if (confirm(`Are you sure you want to cancel the job "${currentJob.partName}"?`)) {
      await updateJobStatus(currentJob.id, 'CANCELLED')
    }
  }
})

function downloadSTL(job: PrintJob) {
  // Construct STL file URL based on job ID
  // Adjust this URL pattern based on your API structure
  const stlUrl = `http://localhost:3000/api/jobs/${job.id}/stl`
  
  // Create a temporary anchor element and trigger download
  const link = document.createElement('a')
  link.href = stlUrl
  link.download = `${job.partName.replace(/\s+/g, '_')}.stl`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function updateJobStatus(jobId: string, newStatus: string) {
  try {
    const res = await fetch(`${API_URL}/${jobId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: newStatus })
    })

    if (!res.ok) {
      throw new Error(`Failed to update job status: ${res.status}`)
    }

    const json = await res.json()

    if (json.success) {
      // Reload all jobs to get updated data
      await loadPrintJobs()
      
      // Close modal after successful update
      closeModal()
    } else {
      alert('Failed to update job status')
    }
  } catch (err) {
    console.error('Error updating job status:', err)
    alert(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`)
  }
}

function updateActionButtons(status: string) {
  // Reset all buttons
  startJobBtn.disabled = false
  completeJobBtn.disabled = false
  cancelJobBtn.disabled = false

  // Enable/disable based on current status
  if (status === 'PENDING') {
    startJobBtn.disabled = false
    completeJobBtn.disabled = true
    cancelJobBtn.disabled = false
  } else if (status === 'IN_PROGRESS') {
    startJobBtn.disabled = true
    completeJobBtn.disabled = false
    cancelJobBtn.disabled = false
  } else {
    // COMPLETED, CANCELLED, or FAILED
    startJobBtn.disabled = true
    completeJobBtn.disabled = true
    cancelJobBtn.disabled = true
  }
}

function openModal(job: PrintJob) {
  currentJob = job
  modalJobName.textContent = job.partName
  modalJobId.textContent = job.id
  
  // Create status badge
  modalJobStatus.innerHTML = `<span class="status ${job.status}">${job.status}</span>`
  
  modalJobMaterial.textContent = job.material
  modalJobColor.textContent = job.color
  modalJobQuantity.textContent = job.quantity.toString()
  modalJobCreated.textContent = new Date(job.createdAt).toLocaleString()
  modalUserName.textContent = job.user.name
  modalUserEmail.textContent = job.user.email
  
  // Update action button states based on job status
  updateActionButtons(job.status)
  
  modal.classList.add('active')
  document.body.style.overflow = 'hidden'
}

function closeModal() {
  modal.classList.remove('active')
  document.body.style.overflow = 'auto'
}

async function loadPrintJobs() {
  try {
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
    allJobs = json.data || []

    hideLoading()
    renderAllTabs()
  } catch (err) {
    console.error('Failed to load jobs:', err)
    hideLoading()
    showError(err instanceof Error ? err.message : 'Unknown error occurred')
  }
}

function renderAllTabs() {
  // Filter jobs by status
  const pendingJobs = allJobs.filter(job => job.status === 'PENDING')
  const inProgressJobs = allJobs.filter(job => job.status === 'IN_PROGRESS')
  const resolvedJobs = allJobs.filter(job => 
    job.status === 'COMPLETED' || job.status === 'CANCELLED' || job.status === 'FAILED'
  )

  // Render each tab
  renderTab(pendingJobs, pendingGrid, pendingEmpty)
  renderTab(inProgressJobs, inProgressGrid, inProgressEmpty)
  renderTab(resolvedJobs, resolvedGrid, resolvedEmpty)
}

function renderTab(jobs: PrintJob[], gridEl: HTMLElement, emptyEl: HTMLElement) {
  gridEl.innerHTML = ''
  
  if (jobs.length === 0) {
    emptyEl.style.display = 'block'
    return
  }
  
  emptyEl.style.display = 'none'
  
  jobs.forEach(job => {
    const card = createJobCard(job)
    gridEl.appendChild(card)
  })
}

function createJobCard(job: PrintJob): HTMLElement {
  const card = document.createElement('div')
  card.className = 'job-card'
  card.onclick = () => openModal(job)
  
  card.innerHTML = `
    <div class="job-card-header">
      <div>
        <div class="job-card-title">${job.partName}</div>
        <div class="job-id">${job.id.substring(0, 12)}...</div>
      </div>
      <span class="status ${job.status}">${job.status}</span>
    </div>
    <div class="job-card-detail">
      <strong>User:</strong> ${job.user.name}
    </div>
    <div class="job-card-detail">
      <strong>Material:</strong> ${job.material}
    </div>
    <div class="job-card-detail">
      <strong>Color:</strong> ${job.color}
    </div>
    <div class="job-card-detail">
      <strong>Quantity:</strong> ${job.quantity}
    </div>
    <div class="job-card-detail">
      <strong>Created:</strong> ${new Date(job.createdAt).toLocaleDateString()}
    </div>
  `
  
  return card
}

function showLoading() {
  loadingEl.style.display = 'block'
  errorEl.style.display = 'none'
}

function hideLoading() {
  loadingEl.style.display = 'none'
}

function showError(message: string) {
  errorEl.textContent = `Error: ${message}`
  errorEl.style.display = 'block'
}

// Load jobs on page load
loadPrintJobs()

// Refresh every 10 seconds
setInterval(loadPrintJobs, 10000)

// Close modal with Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeModal()
  }
})