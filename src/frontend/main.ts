type PrintJob = {
  id: string
  userId: string
  status: string
  createdAt: string
}

type ApiResponse = {
  success: boolean
  data: PrintJob[]
}

const API_URL = 'http://localhost:3000/api/jobs'

async function loadPrintJobs() {
  try {
    const res = await fetch(API_URL)
    const json: ApiResponse = await res.json()

    if (!json.success) {
      throw new Error('API returned failure')
    }

    renderJobs(json.data)
  } catch (err) {
    console.error('Failed to load jobs:', err)
  }
}

function renderJobs(jobs: PrintJob[]) {
  const tbody = document.getElementById('jobs-body')!
  tbody.innerHTML = ''

  for (const job of jobs) {
    const row = document.createElement('tr')

    row.innerHTML = `
      <td>${job.id}</td>
      <td>${job.userId}</td>
      <td>${job.status}</td>
      <td>${new Date(job.createdAt).toLocaleString()}</td>
    `

    tbody.appendChild(row)
  }
}

loadPrintJobs()
