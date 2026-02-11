// src/request.ts

type FormData = {
  userName: string;
  userEmail: string;
  userDiscord?: string;
  partName: string;
  material: string;
  userSuppliedMaterial: boolean;
  quantity: number;
  color: string;
  pickupLocation: string;
  stlUrl: string;
  specialInstructions?: string;
};

const API_URL = 'http://localhost:3000/api/jobs';
const UPLOAD_URL = 'http://localhost:3000/api/uploads';

// Form elements
const form = document.getElementById('print-job-form') as HTMLFormElement;
const firstNameInput = document.getElementById('first-name') as HTMLInputElement;
const lastNameInput = document.getElementById('last-name') as HTMLInputElement;
const emailInput = document.getElementById('email') as HTMLInputElement;
const partNameInput = document.getElementById('part-name') as HTMLInputElement;
const materialInput = document.getElementById('material') as HTMLInputElement;
const userSuppliedRadios = document.getElementsByName('user-supplied') as NodeListOf<HTMLInputElement>;
const quantityInput = document.getElementById('quantity') as HTMLInputElement;
const colorInput = document.getElementById('color') as HTMLInputElement;
const pickupLocationInput = document.getElementById('pickup-location') as HTMLInputElement;
const discordInput = document.getElementById('discord-id') as HTMLInputElement;
const stlFileInput = document.getElementById('stl-file') as HTMLInputElement;
const specialInstructionsTextarea = document.getElementById('special-instructions') as HTMLTextAreaElement;
const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
const fileNameDisplay = document.getElementById('file-name') as HTMLDivElement;
const errorMessage = document.getElementById('error-message') as HTMLDivElement;
const successMessage = document.getElementById('success-message') as HTMLDivElement;

// File upload handler
stlFileInput.addEventListener('change', (e) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  
  if (file) {
    fileNameDisplay.textContent = `📄 ${file.name} (${formatFileSize(file.size)})`;
    fileNameDisplay.classList.add('active');
  } else {
    fileNameDisplay.textContent = '';
    fileNameDisplay.classList.remove('active');
  }
});

// Email validation
emailInput.addEventListener('blur', () => {
  const email = emailInput.value.trim();
  if (email && !email.endsWith('@purdue.edu')) {
    showError('Please use a valid Purdue email address (@purdue.edu)');
    emailInput.style.borderColor = 'var(--error-red)';
  } else {
    emailInput.style.borderColor = '';
  }
});

emailInput.addEventListener('input', () => {
  hideError();
  emailInput.style.borderColor = '';
});

// Form submission
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  hideError();
  hideSuccess();
  
  // Validate email
  const email = emailInput.value.trim();
  if (!email.endsWith('@purdue.edu')) {
    showError('Please use a valid Purdue email address (@purdue.edu)');
    emailInput.focus();
    return;
  }
  
  // Get file
  const file = stlFileInput.files?.[0];
  if (!file) {
    showError('Please upload an STL file');
    return;
  }
  
  // Validate file type
  if (!file.name.toLowerCase().endsWith('.stl')) {
    showError('Only .stl files are accepted');
    return;
  }
  
  // Disable submit button
  submitBtn.disabled = true;
  submitBtn.textContent = 'Uploading file...';
  
  try {
    // Upload file
    const stlUrl = await uploadFile(file);
    
    submitBtn.textContent = 'Submitting request...';
    
    // Get selected radio value for user supplied material
    let userSuppliedMaterial = false;
    for (const radio of userSuppliedRadios) {
      if (radio.checked && radio.value === 'yes') {
        userSuppliedMaterial = true;
        break;
      }
    }
    
    // Prepare form data
    const fullName = `${firstNameInput.value.trim()} ${lastNameInput.value.trim()}`;
    
    const formData: FormData = {
      userName: fullName,
      userEmail: email,
      userDiscord: discordInput.value.trim() || undefined,
      partName: partNameInput.value.trim(),
      material: materialInput.value.trim(),
      userSuppliedMaterial: userSuppliedMaterial,
      quantity: parseInt(quantityInput.value, 10),
      color: colorInput.value.trim(),
      pickupLocation: pickupLocationInput.value.trim(),
      stlUrl: stlUrl,
      specialInstructions: specialInstructionsTextarea.value.trim() || undefined,
    };
    
    // Submit to API
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(formData),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const result = await response.json();
    
    if (result.success) {
      showSuccess('Print job submitted successfully! You will be notified via email when your job is ready.');
      
      // Reset form
      form.reset();
      fileNameDisplay.textContent = '';
      fileNameDisplay.classList.remove('active');
      
      // Scroll to top
      window.scrollTo({ top: 0, behavior: 'smooth' });
      
      // Optionally redirect after a delay
      setTimeout(() => {
        // window.location.href = '/'; // Uncomment to redirect to home page
      }, 3000);
    } else {
      throw new Error(result.error || 'Failed to submit print job');
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    showError(error instanceof Error ? error.message : 'An error occurred while submitting your request');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Print Job Request';
  }
});

/**
 * Upload file to server
 */
async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error('File upload failed. Please try again.');
  }
  
  const data = await response.json();
  
  if (!data.success || !data.url) {
    throw new Error('File upload failed. Invalid response from server.');
  }
  
  return data.url;
}

/**
 * Format file size for display
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Show error message
 */
function showError(message: string): void {
  errorMessage.textContent = message;
  errorMessage.classList.add('active');
}

/**
 * Hide error message
 */
function hideError(): void {
  errorMessage.classList.remove('active');
}

/**
 * Show success message
 */
function showSuccess(message: string): void {
  successMessage.textContent = message;
  successMessage.classList.add('active');
}

/**
 * Hide success message
 */
function hideSuccess(): void {
  successMessage.classList.remove('active');
}