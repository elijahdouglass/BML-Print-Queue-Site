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
  pickupLocation?: string
  status: string
  createdAt: string
  specialInstructions?: string
  user: User
  stlUrl?: string
  userSuppliedMaterial?: boolean
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

type AuthResponse = {
  success: boolean
  token?: string
  message?: string
}

const BASE_URL = import.meta.env.VITE_API_URL
const API_URL = `${BASE_URL}/api/jobs`
const AUTH_URL = `${BASE_URL}/api/auth/monitor`
const TOKEN_KEY = 'bml_monitor_token'

let isUnlocked = false
let authToken: string | null = null

// ── UI Elements ──────────────────────────────────────────────────────────────
const loadingEl          = document.getElementById('loading')!
const errorEl            = document.getElementById('error')!
const tabs               = document.querySelectorAll<HTMLElement>('.tab')
const tabContents        = document.querySelectorAll('.tab-content')

const pendingGrid        = document.getElementById('pending-grid')!
const actionNeededGrid   = document.getElementById('action-needed-grid')!
const waitingGrid        = document.getElementById('waiting-grid')!
const inProgressGrid     = document.getElementById('in-progress-grid')!
const resolvedGrid       = document.getElementById('resolved-grid')!

const pendingEmpty       = document.getElementById('pending-empty')!
const actionNeededEmpty  = document.getElementById('action-needed-empty')!
const waitingEmpty       = document.getElementById('waiting-empty')!
const inProgressEmpty    = document.getElementById('in-progress-empty')!
const resolvedEmpty      = document.getElementById('resolved-empty')!

const modal              = document.getElementById('job-modal')!
const usageModal         = document.getElementById('usage-modal')!
const closeModalBtn      = document.getElementById('close-modal')!
const closeUsageModalBtn = document.getElementById('close-usage-modal')!
const modalJobName       = document.getElementById('modal-job-name')!
const modalJobId         = document.getElementById('modal-job-id')!
const modalJobStatus     = document.getElementById('modal-job-status')!
const modalJobMaterial   = document.getElementById('modal-job-material')!
const modalJobColor      = document.getElementById('modal-job-color')!
const modalJobPickup     = document.getElementById('modal-job-pickup')!
const modalJobQuantity   = document.getElementById('modal-job-quantity')!
const modalJobCreated    = document.getElementById('modal-job-created')!
const modalUserName      = document.getElementById('modal-user-name')!
const modalUserEmail     = document.getElementById('modal-user-email')!
const modalSpecialInstructions = document.getElementById('modal-special-instructions')!
const downloadStlBtn     = document.getElementById('download-stl-btn')!
const startJobBtn        = document.getElementById('start-job-btn') as HTMLButtonElement
const completeJobBtn     = document.getElementById('complete-job-btn') as HTMLButtonElement
const actionNeededBtn    = document.getElementById('action-needed-btn') as HTMLButtonElement
const cancelJobBtn       = document.getElementById('cancel-job-btn') as HTMLButtonElement

const usageJobNameEl     = document.getElementById('usage-job-name')!
const usageInputEl       = document.getElementById('usage-input') as HTMLInputElement
const submitUsageBtn     = document.getElementById('submit-usage-btn') as HTMLButtonElement
const skipUsageBtn       = document.getElementById('skip-usage-btn')!

const passwordModal      = document.getElementById('password-modal')!
const passwordInput      = document.getElementById('password-input') as HTMLInputElement
const passwordSubmitBtn  = document.getElementById('password-submit-btn') as HTMLButtonElement
const passwordError      = document.getElementById('password-error')!
const lockIndicator      = document.getElementById('lock-indicator')!

let allJobs: PrintJob[]      = []
let currentJob: PrintJob | null = null
let pendingStartJobId: string | null = null

function makeFocusTrap(container: HTMLElement): (e: KeyboardEvent) => void {
  return (e: KeyboardEvent) => {
    if (e.key !== 'Tab') return
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.closest('[aria-hidden="true"]'))

    if (focusable.length === 0) return
    const first = focusable[0]
    const last  = focusable[focusable.length - 1]

    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus() }
    } else {
      if (document.activeElement === last)  { e.preventDefault(); first.focus() }
    }
  }
}

let jobModalTrap:      ((e: KeyboardEvent) => void) | null = null
let usageModalTrap:    ((e: KeyboardEvent) => void) | null = null
let passwordModalTrap: ((e: KeyboardEvent) => void) | null = null

let previouslyFocused: HTMLElement | null = null

function openModalEl(
  el: HTMLElement,
  trapRef: { value: ((e: KeyboardEvent) => void) | null },
  firstFocusTarget?: HTMLElement
) {
  previouslyFocused = document.activeElement as HTMLElement
  el.classList.add('active')
  el.setAttribute('aria-hidden', 'false')
  document.body.style.overflow = 'hidden'

  const trap = makeFocusTrap(el)
  trapRef.value = trap
  document.addEventListener('keydown', trap)

  // Move focus into the modal
  const target = firstFocusTarget ?? el.querySelector<HTMLElement>(
    'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )
  setTimeout(() => target?.focus(), 50)
}

function closeModalEl(
  el: HTMLElement,
  trapRef: { value: ((e: KeyboardEvent) => void) | null }
) {
  el.classList.remove('active')
  el.setAttribute('aria-hidden', 'true')
  document.body.style.overflow = 'auto'

  if (trapRef.value) {
    document.removeEventListener('keydown', trapRef.value)
    trapRef.value = null
  }

  // Return focus to the element that opened the modal
  previouslyFocused?.focus()
  previouslyFocused = null
}

function showPasswordModal() {
  passwordInput.value = ''
  passwordError.classList.remove('show')
  passwordSubmitBtn.disabled = false
  passwordSubmitBtn.textContent = 'Unlock'
  openModalEl(passwordModal, { get value() { return passwordModalTrap }, set value(v) { passwordModalTrap = v } }, passwordInput)
}

function hidePasswordModal() {
  closeModalEl(passwordModal, { get value() { return passwordModalTrap }, set value(v) { passwordModalTrap = v } })
}

async function checkPassword() {
  const enteredPassword = passwordInput.value

  if (!enteredPassword) {
    passwordError.textContent = 'Please enter a password'
    passwordError.classList.add('show')
    passwordError.setAttribute('aria-live', 'assertive')
    return
  }

  passwordSubmitBtn.disabled = true
  passwordSubmitBtn.textContent = 'Authenticating...'

  try {
    const res  = await fetch(AUTH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: enteredPassword })
    })
    const json: AuthResponse = await res.json()

    if (res.ok && json.success && json.token) {
      authToken = json.token
      localStorage.setItem(TOKEN_KEY, json.token)
      isUnlocked = true
      updateLockState()
      hidePasswordModal()
      renderAllTabs()
    } else {
      passwordError.textContent = json.message || 'Incorrect password. Please try again.'
      passwordError.classList.add('show')
      passwordInput.value = ''
      passwordInput.focus()
    }
  } catch (err) {
    console.error('Authentication error:', err)
    passwordError.textContent = 'Authentication failed. Please try again.'
    passwordError.classList.add('show')
  } finally {
    passwordSubmitBtn.disabled = false
    passwordSubmitBtn.textContent = 'Unlock'
  }
}

function updateLockState() {
  if (isUnlocked) {
    lockIndicator.classList.add('unlocked')
    lockIndicator.setAttribute('aria-label', 'Lock lab monitor access')
    lockIndicator.setAttribute('aria-pressed', 'true')
  } else {
    lockIndicator.classList.remove('unlocked')
    lockIndicator.setAttribute('aria-label', 'Unlock lab monitor access')
    lockIndicator.setAttribute('aria-pressed', 'false')
  }
}

function logout() {
  isUnlocked = false
  authToken = null
  localStorage.removeItem(TOKEN_KEY)
  updateLockState()
  renderAllTabs()
  closeJobModal()
}

function checkExistingToken() {
  const savedToken = localStorage.getItem(TOKEN_KEY)
  if (savedToken) {
    authToken = savedToken
    isUnlocked = true
    updateLockState()
  }
}

lockIndicator.addEventListener('click', () => {
  if (!isUnlocked) {
    showPasswordModal()
  } else {
    if (confirm('Lock the interface? You will need to enter the password again.')) {
      logout()
    }
  }
})

passwordSubmitBtn.addEventListener('click', checkPassword)
passwordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') checkPassword() })

passwordModal.addEventListener('click', (e) => {
  if (e.target === passwordModal) hidePasswordModal()
})

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab')!

    // FIX: update aria-selected on all tabs
    tabs.forEach(t => {
      t.classList.remove('active')
      t.setAttribute('aria-selected', 'false')
    })
    tab.classList.add('active')
    tab.setAttribute('aria-selected', 'true')

    tabContents.forEach(content => content.classList.remove('active'))
    document.getElementById(`${tabName}-tab`)!.classList.add('active')
  })

  tab.addEventListener('keydown', (e) => {
    const tabArray = Array.from(tabs)
    const idx = tabArray.indexOf(tab)
    let next: HTMLElement | null = null

    if (e.key === 'ArrowRight') next = tabArray[(idx + 1) % tabArray.length] as HTMLElement
    if (e.key === 'ArrowLeft')  next = tabArray[(idx - 1 + tabArray.length) % tabArray.length] as HTMLElement
    if (e.key === 'Home')       next = tabArray[0] as HTMLElement
    if (e.key === 'End')        next = tabArray[tabArray.length - 1] as HTMLElement

    if (next) {
      e.preventDefault()
      next.focus()
      next.click() // activate the tab as well
    }
  })
})

function openJobModal(job: PrintJob) {
  if (!isUnlocked) { showPasswordModal(); return }

  currentJob = job
  modalJobName.textContent    = job.partName
  modalJobId.textContent      = job.id
  modalJobStatus.innerHTML    = `<span class="status ${job.status}"><span class="sr-only">Status: </span>${job.status.replace('_', ' ')}</span>`
  modalJobMaterial.textContent  = job.material
  modalJobColor.textContent     = job.color
  modalJobPickup.textContent    = job.pickupLocation || 'TBD'
  modalJobQuantity.textContent  = job.quantity.toString()
  modalJobCreated.textContent   = new Date(job.createdAt).toLocaleString()
  modalUserName.textContent     = job.user.name
  modalUserEmail.textContent    = job.user.email
  modalSpecialInstructions.textContent = job.specialInstructions || 'None'
  document.getElementById('modal-job-supplied')!.textContent = job.userSuppliedMaterial ? 'User supplied' : 'Lab stock'
  updateActionButtons(job.status)

  openModalEl(modal, { get value() { return jobModalTrap }, set value(v) { jobModalTrap = v } }, closeModalBtn)
}

function closeJobModal() {
  currentJob = null
  closeModalEl(modal, { get value() { return jobModalTrap }, set value(v) { jobModalTrap = v } })
}

closeModalBtn.addEventListener('click', closeJobModal)
modal.addEventListener('click', (e) => { if (e.target === modal) closeJobModal() })

function openUsageModal(job: PrintJob) {
  usageJobNameEl.textContent = job.partName
  usageInputEl.value = ''
  openModalEl(usageModal, { get value() { return usageModalTrap }, set value(v) { usageModalTrap = v } }, usageInputEl)
}

function closeUsageModal() {
  pendingStartJobId = null
  closeModalEl(usageModal, { get value() { return usageModalTrap }, set value(v) { usageModalTrap = v } })
}

closeUsageModalBtn.addEventListener('click', closeUsageModal)
usageModal.addEventListener('click', (e) => { if (e.target === usageModal) closeUsageModal() })

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return
  if (passwordModal.getAttribute('aria-hidden') === 'false') { hidePasswordModal(); return }
  if (usageModal.getAttribute('aria-hidden') === 'false')    { closeUsageModal();   return }
  if (modal.getAttribute('aria-hidden') === 'false')         { closeJobModal();     return }
})

downloadStlBtn.addEventListener('click', () => {
  if (currentJob) downloadSTL(currentJob)
})

async function downloadSTL(job: PrintJob) {
  const url = job.stlUrl || `${BASE_URL}/api/jobs/${job.id}/stl`
  const ext = url.split('.').pop() || 'stl'

  if (job.stlUrl) {
    const a = document.createElement('a')
    a.href = job.stlUrl
    a.download = `${job.partName}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    return
  }

  try {
    const response = await fetch(`${BASE_URL}/api/jobs/${job.id}/stl`)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const blob   = await response.blob()
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = `${job.partName}.${ext}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(blobUrl)
  } catch (error) {
    console.error('Download failed:', error)
  }
}

startJobBtn.addEventListener('click', () => {
  if (currentJob && ['PENDING', 'WAITING', 'ACTION_NEEDED'].includes(currentJob.status)) {
    pendingStartJobId = currentJob.id
    openUsageModal(currentJob)
  }
})

completeJobBtn.addEventListener('click', async () => {
  if (currentJob && currentJob.status === 'IN_PROGRESS') {
    await updateJobStatus(currentJob.id, 'COMPLETED')
  }
})

actionNeededBtn.addEventListener('click', async () => {
  if (currentJob && ['PENDING', 'IN_PROGRESS'].includes(currentJob.status)) {
    if (confirm(`Mark "${currentJob.partName}" as needing user action?\n\nThis will indicate to the user that input is required.`)) {
      await updateJobStatus(currentJob.id, 'ACTION_NEEDED')
    }
  }
})

cancelJobBtn.addEventListener('click', async () => {
  if (currentJob && ['PENDING', 'IN_PROGRESS', 'WAITING', 'ACTION_NEEDED'].includes(currentJob.status)) {
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
  if (usageValue > 300) {
    alert(`Job rejected: Filament usage cannot exceed 300g.\n\nThis job requires ${usageValue}g, which is over the 300g limit.`)
    return
  }
  if (!pendingStartJobId || !currentJob) return

  submitUsageBtn.disabled = true
  submitUsageBtn.textContent = 'Saving...'

  try {
    const res = await fetch(`${API_URL}/${pendingStartJobId}/start`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ usage: usageValue })
    })

    if (res.status === 401 || res.status === 403) { logout(); alert('Session expired. Please log in again.'); return }
    if (!res.ok) throw new Error(`Failed to start job: ${res.status}`)

    const json: StartJobResponse = await res.json()
    if (!json.success) throw new Error('API returned failure when starting job')

    if (json.data.status === 'WAITING') {
      alert(`Job set to WAITING status.\n\nUser has ${json.userUsage}g used.\nThis job would add ${json.estimatedUsage}g.\nTotal would be ${json.totalUsage}g, exceeding the ${json.usageLimit}g limit.`)
    }

    await loadPrintJobs()
    closeUsageModal()
    closeJobModal()
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
      closeJobModal()
    } catch (err) {
      console.error('Error starting job:', err)
      alert(`Error: ${err instanceof Error ? err.message : 'Failed to start job'}`)
    } finally {
      pendingStartJobId = null
    }
  }
})

usageInputEl.addEventListener('keypress', (e) => { if (e.key === 'Enter') submitUsageBtn.click() })

function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (authToken) headers['Authorization'] = `Bearer ${authToken}`
  return headers
}

async function updateJobStatus(jobId: string, newStatus: string) {
  try {
    const res = await fetch(`${API_URL}/${jobId}/status`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify({ status: newStatus })
    })

    if (res.status === 401 || res.status === 403) { logout(); alert('Session expired. Please log in again.'); return }
    if (!res.ok) throw new Error(`Failed to update job status: ${res.status}`)

    const json = await res.json()
    if (json.success) {
      await loadPrintJobs()
      closeJobModal()
    } else {
      alert('Failed to update job status')
    }
  } catch (err) {
    console.error('Error updating job status:', err)
    alert(`Error: ${err instanceof Error ? err.message : 'Unknown error occurred'}`)
  }
}

function updateActionButtons(status: string) {
  const isPending    = status === 'PENDING'
  const isWaiting    = status === 'WAITING'
  const isInProgress = status === 'IN_PROGRESS'
  const isActionNeeded = status === 'ACTION_NEEDED'
  const isResolved   = ['COMPLETED', 'CANCELLED', 'FAILED'].includes(status)

  startJobBtn.disabled    = isInProgress || isResolved
  completeJobBtn.disabled = !isInProgress
  actionNeededBtn.disabled = isActionNeeded || isResolved
  cancelJobBtn.disabled   = isResolved
}

async function loadPrintJobs() {
  try {
    showLoading()
    const res = await fetch(API_URL, { headers: getAuthHeaders() })

    if (res.status === 401 || res.status === 403) {
      if (isUnlocked) { logout(); alert('Session expired. Please log in again.') }
      hideLoading()
      return
    }
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`)

    const json: ApiResponse = await res.json()
    if (!json.success) throw new Error('API returned failure')

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
  renderTab(allJobs.filter(j => j.status === 'PENDING'),                                                         pendingGrid,      pendingEmpty)
  renderTab(allJobs.filter(j => j.status === 'ACTION_NEEDED'),                                                   actionNeededGrid, actionNeededEmpty)
  renderTab(allJobs.filter(j => j.status === 'WAITING'),                                                         waitingGrid,      waitingEmpty)
  renderTab(allJobs.filter(j => j.status === 'IN_PROGRESS'),                                                     inProgressGrid,   inProgressEmpty)
  renderTab(allJobs.filter(j => ['COMPLETED','CANCELLED','FAILED'].includes(j.status)),                          resolvedGrid,     resolvedEmpty)
}

function renderTab(jobs: PrintJob[], gridEl: HTMLElement, emptyEl: HTMLElement) {
  gridEl.innerHTML = ''
  if (jobs.length === 0) { emptyEl.style.display = 'block'; return }
  emptyEl.style.display = 'none'
  jobs.forEach(job => gridEl.appendChild(createJobCard(job)))
}

function createJobCard(job: PrintJob): HTMLElement {
  const card = document.createElement('button')
  card.className = 'job-card'
  card.type = 'button'

  if (isUnlocked) {
    card.classList.add('clickable')
    card.addEventListener('click', () => openJobModal(job))
    card.setAttribute('aria-label', `View details for ${job.partName}, status: ${job.status.replace('_', ' ')}`)
  } else {
    card.classList.add('locked')
    card.addEventListener('click', () => showPasswordModal())
    card.setAttribute('aria-label', `${job.partName} – locked. Click to unlock.`)
  }

  card.innerHTML = `
    <div class="job-card-header">
      <div>
        <div class="job-card-title">${job.partName}</div>
        <div class="job-id" aria-label="Job ID: ${job.id.substring(0, 12)}">${job.id.substring(0, 12)}...</div>
      </div>
      <span class="status ${job.status}" aria-hidden="true">${job.status.replace('_', ' ')}</span>
    </div>
    <dl>
      <div class="job-card-detail"><dt><strong>User</strong></dt><dd>${job.user.name}</dd></div>
      <div class="job-card-detail"><dt><strong>Material</strong></dt><dd>${job.material}</dd></div>
      <div class="job-card-detail"><dt><strong>Color</strong></dt><dd>${job.color}</dd></div>
      <div class="job-card-detail"><dt><strong>Quantity</strong></dt><dd>${job.quantity}</dd></div>
      <div class="job-card-detail"><dt><strong>Pickup</strong></dt><dd>${job.pickupLocation || 'TBD'}</dd></div>
      <div class="job-card-detail"><dt><strong>Created</strong></dt><dd>${new Date(job.createdAt).toLocaleDateString()}</dd></div>
    </dl>
  `

  return card
}

function showLoading() {
  loadingEl.style.display = 'block'
  loadingEl.textContent = 'Loading print jobs...'
  errorEl.style.display = 'none'
}

function hideLoading() {
  loadingEl.style.display = 'none'
}

function showError(message: string) {
  errorEl.textContent = `Error: ${message}`
  errorEl.style.display = 'block'
}

checkExistingToken()
loadPrintJobs()
setInterval(loadPrintJobs, 30000)