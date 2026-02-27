// src/users.ts

type User = {
  id: string
  name: string
  email: string
  discord?: string
  usage: number
  createdAt: string
  _count?: {
    printJobs: number
  }
}

type PrintJob = {
  id: string
  partName: string
  status: string
  material: string
  color: string
  createdAt: string
}

type UserWithJobs = User & {
  printJobs: PrintJob[]
}

type ApiResponse = {
  success: boolean
  data: User[]
  count?: number
}

type UserDetailResponse = {
  success: boolean
  data: UserWithJobs
}

const BASE_URL = import.meta.env.VITE_API_URL;
const API_URL = `${BASE_URL}/api/users`
const USAGE_LIMIT = 300

// UI Elements
const loadingEl = document.getElementById('loading')!
const errorEl = document.getElementById('error')!
const searchInput = document.getElementById('search-input') as HTMLInputElement
const usersTableContainer = document.getElementById('users-table-container')!
const usersTableBody = document.getElementById('users-table-body')!
const emptyState = document.getElementById('empty-state')!

// Modal elements
const modal = document.getElementById('user-modal')!
const closeModalBtn = document.getElementById('close-modal')!
const modalUserName = document.getElementById('modal-user-name')!
const modalName = document.getElementById('modal-name')!
const modalEmail = document.getElementById('modal-email')!
const modalDiscord = document.getElementById('modal-discord')!
const modalUserId = document.getElementById('modal-user-id')!
const modalUsage = document.getElementById('modal-usage')!
const modalJobCount = document.getElementById('modal-job-count')!
const modalJobsList = document.getElementById('modal-jobs-list')!

let allUsers: User[] = []
let filteredUsers: User[] = []

// Modal controls
closeModalBtn.addEventListener('click', closeModal)
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal()
})

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modal.classList.contains('active')) {
    closeModal()
  }
})

// Search functionality
searchInput.addEventListener('input', (e) => {
  const searchTerm = (e.target as HTMLInputElement).value.toLowerCase().trim()
  
  if (!searchTerm) {
    filteredUsers = [...allUsers]
  } else {
    filteredUsers = allUsers.filter(user => 
      user.name.toLowerCase().includes(searchTerm) ||
      user.email.toLowerCase().includes(searchTerm) ||
      (user.discord && user.discord.toLowerCase().includes(searchTerm))
    )
  }
  
  renderUsers()
})

async function loadUsers() {
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

    allUsers = json.data || []
    filteredUsers = [...allUsers]

    hideLoading()
    renderUsers()
  } catch (err) {
    console.error('Failed to load users:', err)
    hideLoading()
    showError(err instanceof Error ? err.message : 'Unknown error occurred')
  }
}

function renderUsers() {
  usersTableBody.innerHTML = ''
  
  if (filteredUsers.length === 0) {
    usersTableContainer.style.display = 'none'
    emptyState.style.display = 'block'
    return
  }
  
  usersTableContainer.style.display = 'block'
  emptyState.style.display = 'none'
  
  filteredUsers.forEach(user => {
    const row = createUserRow(user)
    usersTableBody.appendChild(row)
  })
}

function createUserRow(user: User): HTMLTableRowElement {
  const row = document.createElement('tr')
  row.onclick = () => openUserModal(user.id)
  
  const usage = user.usage || 0
  const usagePercent = Math.min((usage / USAGE_LIMIT) * 100, 100)
  const isOverLimit = usage > USAGE_LIMIT
  
  row.innerHTML = `
    <td>${user.name}</td>
    <td>${user.email}</td>
    <td>${user.discord || '-'}</td>
    <td>
      <div class="usage-bar-container">
        <div class="usage-bar">
          <div class="usage-bar-fill" style="width: ${usagePercent}%"></div>
        </div>
        <div class="usage-text ${isOverLimit ? 'usage-over-limit' : ''}">
          ${usage.toFixed(1)}g / ${USAGE_LIMIT}g ${isOverLimit ? '⚠️' : ''}
        </div>
      </div>
    </td>
    <td>
      <span class="job-count">${user._count?.printJobs || 0} jobs</span>
    </td>
  `
  
  return row
}

async function openUserModal(userId: string) {
  try {
    const res = await fetch(`${API_URL}/${userId}`)
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`)
    }

    const json: UserDetailResponse = await res.json()

    if (!json.success) {
      throw new Error('Failed to load user details')
    }

    const user = json.data
    
    modalUserName.textContent = user.name
    modalName.textContent = user.name
    modalEmail.textContent = user.email
    modalDiscord.textContent = user.discord || 'Not set'
    modalUserId.textContent = user.id.substring(0, 12) + '...'
    
    const usage = user.usage || 0
    const isOverLimit = usage > USAGE_LIMIT
    modalUsage.innerHTML = `
      ${usage.toFixed(1)}g / ${USAGE_LIMIT}g
      ${isOverLimit ? '<span class="usage-over-limit"> ⚠️ Over Limit</span>' : ''}
    `
    
    modalJobCount.textContent = user.printJobs.length.toString()
    
    // Render jobs list
    modalJobsList.innerHTML = ''
    if (user.printJobs.length === 0) {
      modalJobsList.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--text-gray);">No jobs yet</div>'
    } else {
      user.printJobs.slice(0, 10).forEach(job => {
        const jobItem = document.createElement('div')
        jobItem.className = 'job-item'
        jobItem.innerHTML = `
          <div class="job-item-header">
            <span class="job-item-title">${job.partName}</span>
            <span class="status ${job.status}">${job.status.replace('_', ' ')}</span>
          </div>
          <div style="font-size: 0.9rem; color: var(--text-gray);">
            ${job.material} • ${job.color} • ${new Date(job.createdAt).toLocaleDateString()}
          </div>
        `
        modalJobsList.appendChild(jobItem)
      })
      
      if (user.printJobs.length > 10) {
        const moreText = document.createElement('div')
        moreText.style.textAlign = 'center'
        moreText.style.padding = '10px'
        moreText.style.color = 'var(--text-gray)'
        moreText.textContent = `+ ${user.printJobs.length - 10} more jobs`
        modalJobsList.appendChild(moreText)
      }
    }
    
    modal.classList.add('active')
    document.body.style.overflow = 'hidden'
  } catch (err) {
    console.error('Error loading user details:', err)
    alert('Failed to load user details')
  }
}

function closeModal() {
  modal.classList.remove('active')
  document.body.style.overflow = 'auto'
}

function showLoading() {
  loadingEl.style.display = 'block'
  errorEl.style.display = 'none'
  usersTableContainer.style.display = 'none'
  emptyState.style.display = 'none'
}

function hideLoading() {
  loadingEl.style.display = 'none'
}

function showError(message: string) {
  errorEl.textContent = `Error: ${message}`
  errorEl.style.display = 'block'
}

// Load users on page load
loadUsers()

// Refresh every 30 seconds
setInterval(loadUsers, 30000)