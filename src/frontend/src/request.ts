// src/request.ts

type FormData = {
  userName: string
  userEmail: string
  userDiscord?: string
  partName: string
  material: string
  userSuppliedMaterial: boolean
  quantity: number
  color: string
  pickupLocation: string
  stlUrl: string
  specialInstructions?: string
}

const BASE_URL = import.meta.env.VITE_API_URL
const API_URL = `${BASE_URL}/api/jobs`
const UPLOAD_URL = `${BASE_URL}/api/uploads`
const MAX_FILE_SIZE_MB = 50
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024

const form                       = document.getElementById('print-job-form') as HTMLFormElement
const firstNameInput             = document.getElementById('first-name') as HTMLInputElement
const lastNameInput              = document.getElementById('last-name') as HTMLInputElement
const emailInput                 = document.getElementById('email') as HTMLInputElement
const partNameInput              = document.getElementById('part-name') as HTMLInputElement
const materialInput              = document.getElementById('material') as HTMLInputElement
const userSuppliedRadios         = document.getElementsByName('user-supplied') as NodeListOf<HTMLInputElement>
const quantityInput              = document.getElementById('quantity') as HTMLInputElement
const colorInput                 = document.getElementById('color') as HTMLInputElement
const pickupLocationSelect       = document.getElementById('pickup-location') as HTMLSelectElement
const discordInput               = document.getElementById('discord-id') as HTMLInputElement
const stlFileInput               = document.getElementById('stl-file') as HTMLInputElement
const specialInstructionsTextarea = document.getElementById('special-instructions') as HTMLTextAreaElement
const submitBtn                  = document.getElementById('submit-btn') as HTMLButtonElement
const fileNameDisplay            = document.getElementById('file-name-display') as HTMLDivElement
const errorMessage               = document.getElementById('error-message') as HTMLDivElement
const successMessage             = document.getElementById('success-message') as HTMLDivElement

// File selection feedback — aria-live="polite" on the display div handles announcement
stlFileInput.addEventListener('change', () => {
  const file = stlFileInput.files?.[0]

  if (file) {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      showError(`File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`)
      stlFileInput.value = ''
      fileNameDisplay.textContent = ''
      fileNameDisplay.classList.remove('active')
      setInvalid(stlFileInput)
      return
    }
    clearInvalid(stlFileInput)
    fileNameDisplay.textContent = `Selected: ${file.name} (${formatFileSize(file.size)})`
    fileNameDisplay.classList.add('active')
  } else {
    fileNameDisplay.textContent = ''
    fileNameDisplay.classList.remove('active')
  }
})

// Inline email validation on blur
emailInput.addEventListener('blur', () => {
  const email = emailInput.value.trim()
  if (email && !email.endsWith('@purdue.edu')) {
    setInvalid(emailInput, 'Please use a valid Purdue email address (@purdue.edu)')
  } else {
    clearInvalid(emailInput)
  }
})

emailInput.addEventListener('input', () => {
  hideError()
  clearInvalid(emailInput)
})

form.addEventListener('submit', async (e) => {
  e.preventDefault()
  hideError()
  hideSuccess()

  // Validate required text fields
  const requiredFields: [HTMLInputElement | HTMLSelectElement, string][] = [
    [firstNameInput,       'First name is required'],
    [lastNameInput,        'Last name is required'],
    [emailInput,           'Email is required'],
    [partNameInput,        'Part name is required'],
    [materialInput,        'Material is required'],
    [colorInput,           'Color is required'],
    [pickupLocationSelect, 'Please select a pickup location'],
  ]

  for (const [el, msg] of requiredFields) {
    if (!el.value.trim()) {
      showError(msg)
      setInvalid(el, msg)
      el.focus()
      return
    }
    clearInvalid(el)
  }

  // Email domain check
  if (!emailInput.value.trim().endsWith('@purdue.edu')) {
    const msg = 'Please use a valid Purdue email address (@purdue.edu)'
    showError(msg)
    setInvalid(emailInput, msg)
    emailInput.focus()
    return
  }

  // File check
  const file = stlFileInput.files?.[0]
  if (!file) {
    const msg = 'Please upload an STL or 3MF file'
    showError(msg)
    setInvalid(stlFileInput, msg)
    stlFileInput.focus()
    return
  }

  const fileName = file.name.toLowerCase()
  if (!fileName.endsWith('.stl') && !fileName.endsWith('.3mf')) {
    const msg = 'Only .stl and .3mf files are accepted'
    showError(msg)
    setInvalid(stlFileInput, msg)
    stlFileInput.focus()
    return
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const msg = `File is too large. Maximum file size is ${MAX_FILE_SIZE_MB} MB.`
    showError(msg)
    setInvalid(stlFileInput, msg)
    stlFileInput.focus()
    return
  }

  submitBtn.disabled = true
  submitBtn.textContent = 'Uploading file...'
  // Announce status change to screen readers via the status region
  showSuccess('Uploading file, please wait...')

  try {
    const stlUrl = await uploadFile(file)

    submitBtn.textContent = 'Submitting request...'
    showSuccess('Submitting request, please wait...')

    let userSuppliedMaterial = false
    for (const radio of userSuppliedRadios) {
      if (radio.checked && radio.value === 'yes') { userSuppliedMaterial = true; break }
    }

    const formData: FormData = {
      userName:             `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`,
      userEmail:            emailInput.value.trim(),
      userDiscord:          discordInput.value.trim() || undefined,
      partName:             partNameInput.value.trim(),
      material:             materialInput.value.trim(),
      userSuppliedMaterial,
      quantity:             parseInt(quantityInput.value, 10),
      color:                colorInput.value.trim(),
      pickupLocation:       pickupLocationSelect.value,
      stlUrl,
      specialInstructions:  specialInstructionsTextarea.value.trim() || undefined,
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || `HTTP error: ${response.status}`)
    }

    const result = await response.json()

    if (result.success) {
      hideError()
      showSuccess('Print job submitted successfully. You will be notified via email when your job is ready.')
      form.reset()
      fileNameDisplay.textContent = ''
      fileNameDisplay.classList.remove('active')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      throw new Error(result.error || 'Failed to submit print job')
    }
  } catch (error) {
    hideSuccess()
    showError(error instanceof Error ? error.message : 'An error occurred while submitting your request')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } finally {
    submitBtn.disabled = false
    submitBtn.textContent = 'Submit Print Job Request'
  }
})

async function uploadFile(file: File): Promise<string> {
  const data = new FormData()
  data.append('file', file)

  const response = await fetch(UPLOAD_URL, { method: 'POST', body: data })

  if (!response.ok) throw new Error('File upload failed. Please try again.')

  const json = await response.json()
  if (!json.success || !json.url) throw new Error('File upload failed. Invalid response from server.')

  return json.url
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

// Mark a field as invalid and attach an accessible error description
function setInvalid(el: HTMLInputElement | HTMLSelectElement, message?: string): void {
  el.setAttribute('aria-invalid', 'true')
  if (message) {
    const errorId = `${el.id}-error`
    let errorEl = document.getElementById(errorId)
    if (!errorEl) {
      errorEl = document.createElement('span')
      errorEl.id = errorId
      errorEl.className = 'sr-only'
      errorEl.setAttribute('role', 'alert')
      el.parentNode?.insertBefore(errorEl, el.nextSibling)
    }
    errorEl.textContent = message
    // Append to existing aria-describedby rather than overwrite
    const existing = el.getAttribute('aria-describedby') || ''
    if (!existing.includes(errorId)) {
      el.setAttribute('aria-describedby', `${existing} ${errorId}`.trim())
    }
  }
}

function clearInvalid(el: HTMLInputElement | HTMLSelectElement): void {
  el.removeAttribute('aria-invalid')
  const errorId = `${el.id}-error`
  const errorEl = document.getElementById(errorId)
  if (errorEl) {
    // Remove the error id from aria-describedby
    const described = (el.getAttribute('aria-describedby') || '')
      .split(' ')
      .filter(id => id !== errorId)
      .join(' ')
      .trim()
    if (described) el.setAttribute('aria-describedby', described)
    else el.removeAttribute('aria-describedby')
    errorEl.remove()
  }
}

function showError(message: string): void {
  errorMessage.textContent = message
  errorMessage.classList.add('active')
}

function hideError(): void {
  errorMessage.classList.remove('active')
  errorMessage.textContent = ''
}

function showSuccess(message: string): void {
  successMessage.textContent = message
  successMessage.classList.add('active')
}

function hideSuccess(): void {
  successMessage.classList.remove('active')
  successMessage.textContent = ''
}