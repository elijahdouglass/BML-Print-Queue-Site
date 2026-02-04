// src/main.ts

type User = {
  id: string
  name: string
  email: string
  usage?: number
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
  stlUrl?: string
  specialInstructions?: string
}

type ApiResponse = {
  success: boolean
  data: PrintJob[]
  count?: number
}

type StartJobResponse = {
  success: boolean
  data: PrintJob
  message: string
  userUsage?: number
  estimatedUsage?: number
  totalUsage?: number
  usageLimit?: number
}

const API_URL = 'http://localhost:3000/api/jobs'

// UI Elements
const loadingEl = document.getElementById('loading')!
const errorEl = document.getElementById('error')!
const tabs = document.querySelectorAll('.tab')
const tabContents = document.querySelectorAll('.tab-content')

// Tab grids
const pendingGrid = document.getElementById('pending-grid')!
const waitingGrid = document.getElementById('waiting-grid')!
const inProgressGrid = document.getElementById('in-progress-grid')!
const resolvedGrid = document.getElementById('resolved-grid')!

// Empty states
const pendingEmpty = document.getElementById('pending-empty')!
const waitingEmpty = document.getElementById('waiting-empty')!
const inProgressEmpty = document.getElementById('in-progress-empty')!
const resolvedEmpty = document.getElementById('resolved-empty')!

// Modal elements
const modal = document.getElementById('job-modal')!
const usageModal = document.getElementById('usage-modal')!
const closeModalBtn = document.getElementById('close-modal')!
const closeUsageModalBtn = document.getElementById('close-usage-modal')!
const modalJobName = document.getElementById('modal-job-name')!
const modalJobId = document.getElementById('modal-job-id')!
const modalJobStatus = document.getElementById('modal-job-status')!
const modalJobMaterial = document.getElementById('modal-job-material')!
const modalJobColor = document.getElementById('modal-job-color')!
const modalJobQuantity = document.getElementById('modal-job-quantity')!
const modalJobCreated = document.getElementById('modal-job-created')!
const modalUserName = document.getElementById('modal-user-name')!
const modalUserEmail = document.getElementById('modal-user-email')!
const modalSpecialInstructions = document.getElementById('modal-special-instructions')!
const downloadStlBtn = document.getElementById('download-stl-btn')!
const startJobBtn = document.getElementById('start-job-btn')!
const completeJobBtn = document.getElementById('complete-job-btn')!
const cancelJobBtn = document.getElementById('cancel-job-btn')!

// Usage modal elements
const usageJobNameEl = document.getElementById('usage-job-name')!
const usageInputEl = document.getElementById('usage-input') as HTMLInputElement
const submitUsageBtn = document.getElementById('submit-usage-btn')!
const skipUsageBtn = document.getElementById('skip-usage-btn')!

let allJobs: PrintJob[] = []
let currentJob: PrintJob | null = null
let pendingStartJobId: string | null = null

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab')!
    
    tabs.forEach(t => t.classList.remove('active'))
    tab.classList.add('active')
    
    tabContents.forEach(content => content.classList.remove('active'))
    document.getElementById(`${tabName}-tab`)!.classList.add('active')
  })
})

// Modal controls
closeModalBtn.addEventListener('click', closeModal)
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal()
})

closeUsageModalBtn.addEventListener('click', closeUsageModal)
usageModal.addEventListener('click', (e) => {
  if (e.target === usageModal) closeUsageModal()
})

downloadStlBtn.addEventListener('click', () => {
  if (currentJob) downloadSTL(currentJob)
})

startJobBtn.addEventListener('click', async () => {
  if (currentJob && (currentJob.status === 'PENDING' || currentJob.status === 'WAITING')) {
    pendingStartJobId = currentJob.id
    openUsageModal(currentJob)
  }
})

completeJobBtn.addEventListener('click', async () => {
  if (currentJob && currentJob.status === 'IN_PROGRESS') {
    await updateJobStatus(currentJob.id, 'COMPLETED')
  }
})

cancelJobBtn.addEventListener('click', async () => {
  if (currentJob && (currentJob.status === 'PENDING' || currentJob.status === 'IN_PROGRESS' || currentJob.status === 'WAITING')) {
    if (confirm(`Are you sure you want to cancel the job "${currentJob.partName}"?`)) {
      await updateJobStatus(currentJob.id, 'CANCELLED')
    }
  }
})

submitUsageBtn.addEventListener('click', async () => {
  const usageValue = parseFloat(usageInputEl.value)
  
  if (isNaN(usageValue) || usageValue < 0) {
    alert('Please enter a valid filament usage amount (grams)')
    return
  }
  
  if (!pendingStartJobId || !currentJob) return
  
  submitUsageBtn.disabled = true
  submitUsageBtn.textContent = 'Saving...'
  
  try {
    const res = await fetch(`${API_URL}/${pendingStartJobId}/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usage: usageValue })
    })

    if (!res.ok) {
      throw new Error(`Failed to start job: ${res.status}`)
    }

    const json: StartJobResponse = await res.json()

    if (!json.success) {
      throw new Error('API returned failure when starting job')
    }

    // Check if job was set to WAITING
    if (json.data.status === 'WAITING') {
      alert(`Job set to WAITING status.\n\nUser has ${json.userUsage}g used.\nThis job would add ${json.estimatedUsage}g.\nTotal would be ${json.totalUsage}g, exceeding the ${json.usageLimit}g limit.`)
    }

    // Reload jobs and close modals
    await loadPrintJobs()
    closeUsageModal()
    closeModal()
  } catch (err) {
    console.error('Error starting job:', err)
    alert(`Error: ${err instanceof Error ? err.message : 'Failed to start job'}`)
  } finally {
    submitUsageBtn.disabled = false
    submitUsageBtn.textContent = 'Submit & Start Job'
    pendingStartJobId = null
  }
})

skipUsageBtn.addEventListener('click', async () => {
  if (!pendingStartJobId) return
  
  if (confirm('Are you sure you want to start this job without recording filament usage?')) {
    try {
      await updateJobStatus(pendingStartJobId, 'IN_PROGRESS')
      closeUsageModal()
      closeModal()
    } catch (err) {
      console.error('Error starting job:', err)
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to start job'}`)
    } finally {
      pendingStartJobId = null
    }
  }
})

function openUsageModal(job: PrintJob) {
  usageJobNameEl.textContent = job.partName
  usageInputEl.value = ''
  usageInputEl.focus()
  usageModal.classList.add('active')
}

function closeUsageModal() {
  usageModal.classList.remove('active')
  pendingStartJobId = null
}

function downloadSTL(job: PrintJob) {
  window.open(job.stlUrl || `http://localhost:3000/api/jobs/${job.id}/stl`, '_blank')
}

async function updateJobStatus(jobId: string, newStatus: string) {
  try {
    const res = await fetch(`${API_URL}/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    })

    if (!res.ok) {
      throw new Error(`Failed to update job status: ${res.status}`)
    }

    const json = await res.json()

    if (json.success) {
      await loadPrintJobs()
    } else {
      alert('Failed to update job status')
    }
  } catch (err) {
    console.error('Error updating job status:', err)
    alert(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`)
  }
}

function updateActionButtons(status: string) {
  startJobBtn.disabled = false
  completeJobBtn.disabled = false
  cancelJobBtn.disabled = false

  if (status === 'PENDING' || status === 'WAITING') {
    startJobBtn.disabled = false
    completeJobBtn.disabled = true
    cancelJobBtn.disabled = false
  } else if (status === 'IN_PROGRESS') {
    startJobBtn.disabled = true
    completeJobBtn.disabled = false
    cancelJobBtn.disabled = false
  } else {
    startJobBtn.disabled = true
    completeJobBtn.disabled = true
    cancelJobBtn.disabled = true
  }
}

function openModal(job: PrintJob) {
  currentJob = job
  modalJobName.textContent = job.partName
  modalJobId.textContent = job.id
  modalJobStatus.innerHTML = `<span class="status ${job.status}">${job.status}</span>`
  modalJobMaterial.textContent = job.material
  modalJobColor.textContent = job.color
  modalJobQuantity.textContent = job.quantity.toString()
  modalJobCreated.textContent = new Date(job.createdAt).toLocaleString()
  modalUserName.textContent = job.user.name
  modalUserEmail.textContent = job.user.email
  modalSpecialInstructions.textContent = job.specialInstructions || 'N/A'
  
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
  const pendingJobs = allJobs.filter(job => job.status === 'PENDING')
  const waitingJobs = allJobs.filter(job => job.status === 'WAITING')
  const inProgressJobs = allJobs.filter(job => job.status === 'IN_PROGRESS')
  const resolvedJobs = allJobs.filter(job => 
    job.status === 'COMPLETED' || job.status === 'CANCELLED' || job.status === 'FAILED'
  )

  renderTab(pendingJobs, pendingGrid, pendingEmpty)
  renderTab(waitingJobs, waitingGrid, waitingEmpty)
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
  
  const specialInstructionsText = job.specialInstructions || 'N/A'
  
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
      <strong>Instructions:</strong> ${specialInstructionsText}
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

loadPrintJobs()
setInterval(loadPrintJobs, 30000)

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (usageModal.classList.contains('active')) {
      closeUsageModal()
    } else if (modal.classList.contains('active')) {
      closeModal()
    }
  }
})

usageInputEl.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') submitUsageBtn.click()
})