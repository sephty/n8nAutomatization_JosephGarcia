/* DOM Elements */
const btn = document.getElementById('btnSubmit');
const btnText = document.getElementById('btnText');
const spinner = document.getElementById('spinner');
const msg = document.getElementById('response-msg');
const fileInput = document.getElementById('fileInput');
const filePreview = document.getElementById('filePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const fileExt = document.getElementById('fileExt');
const imgThumb = document.getElementById('imgThumb');
const removeFile = document.getElementById('removeFile');

/* State Variables */
let fileBase64 = null;
let fileMeta = null;

/**
 * Format bytes to human-readable size
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size string
 */
function formatBytes(bytes) {
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

/**
 * Validate email format
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email
 */
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Display success or error message
 * @param {string} type - Message type: 'success' or 'error'
 * @param {string} text - Message text
 */
function showMsg(type, text) {
  msg.className = 'msg ' + type;
  msg.textContent = (type === 'success' ? '✔ ' : '✖ ') + text;
  msg.style.display = 'block';
}

/**
 * Toggle loading state on submit button
 * @param {boolean} loading - Is loading
 */
function setLoading(loading) {
  btn.disabled = loading;
  btnText.textContent = loading ? 'Enviando...' : 'Enviar justificación';
  spinner.style.display = loading ? 'block' : 'none';
}

/**
 * Validate file MIME type
 * @param {string} mimeType - File MIME type
 * @returns {boolean} True if MIME type is allowed
 */
function isAllowedMimeType(mimeType) {
  const allowedMimeTypes = {
    'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    'pdf': ['application/pdf']
  };
  
  const allAllowed = [...allowedMimeTypes.image, ...allowedMimeTypes.pdf];
  return allAllowed.includes(mimeType);
}

/**
 * Handle file selection and preview
 */
fileInput.addEventListener('change', () => {
  const file = fileInput.files[0];
  if (!file) return;

  // Validate file MIME type
  if (!isAllowedMimeType(file.type)) {
    showMsg('error', 'Tipo de archivo no permitido. Acepta: JPEG, PNG, GIF, WebP o PDF.');
    fileInput.value = '';
    return;
  }

  // Validate file size
  if (file.size > 5 * 1024 * 1024) {
    showMsg('error', 'El archivo supera el límite de 5 MB.');
    fileInput.value = '';
    return;
  }

  // Store file for later upload
  fileMeta = {
    name: file.name,
    type: file.type,
    size: file.size,
    file: file  // Store the actual File object
  };

  // Update preview information
  fileName.textContent = file.name;
  fileSize.textContent = formatBytes(file.size);
  const ext = file.name.split('.').pop().toUpperCase();
  fileExt.textContent = ext;

  // Show image or file icon
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = (e) => {
      imgThumb.src = e.target.result;
      imgThumb.style.display = 'block';
      fileExt.style.display = 'none';
    };
    reader.readAsDataURL(file);
  } else {
    imgThumb.style.display = 'none';
    fileExt.style.display = 'inline';
  }

  filePreview.classList.add('show');
  msg.style.display = 'none';
});

/**
 * Handle file removal
 */
removeFile.addEventListener('click', () => {
  fileBase64 = null;
  fileMeta = null;
  fileInput.value = '';
  filePreview.classList.remove('show');
  imgThumb.src = '';
});

/**
 * Handle form submission
 */
btn.addEventListener('click', async () => {
  // Get form values
  const name = document.getElementById('name').value.trim();
  const studentId = document.getElementById('student-id').value.trim();
  const email = document.getElementById('email').value.trim();
  const reason = document.getElementById('reason').value;
  const detail = document.getElementById('detail').value.trim();

  // Validate required fields
  if (!name || !studentId || !email || !reason) {
    showMsg('error', 'Por favor completa todos los campos obligatorios.');
    return;
  }

  // Validate email format
  if (!validateEmail(email)) {
    showMsg('error', 'Por favor ingresa un correo electrónico válido.');
    return;
  }

  // Validate student ID format (basic check)
  if (studentId.length < 4) {
    showMsg('error', 'El ID de estudiante debe tener al menos 4 caracteres.');
    return;
  }

  setLoading(true);
  msg.style.display = 'none';

  // Build FormData for multipart submission
  const formData = new FormData();
  formData.append('name', name);
  formData.append('student_id', studentId);
  formData.append('email', email);
  formData.append('reason', reason);
  formData.append('detail', detail);
  formData.append('submitted_at', new Date().toISOString());
  
  // Add file if present
  if (fileMeta && fileMeta.file) {
    formData.append('file', fileMeta.file);
    formData.append('filename', fileMeta.name);
    formData.append('mime_type', fileMeta.type);
  }

  try {
    // Send form data to n8n webhook
    const response = await fetch(
      'https://candyr.app.n8n.cloud/webhook-test/c1d57ee3-358b-4f11-9803-42c87144cd6a',
      {
        method: 'POST',
        body: formData
      }
    );

    const result = await response.json().catch(() => ({}));

    if (response.ok) {
      // Success - clear form
      showMsg('success', 'Justificación enviada correctamente. Tu solicitud está siendo procesada.');
      clearForm();
    } else {
      throw new Error(
        result.message || result.error || 'Error en el servidor'
      );
    }
  } catch (err) {
    // Error handling
    const errorMessage =
      err.message === 'Failed to fetch'
        ? 'No se pudo conectar al servidor. Verifica tu conexión.'
        : err.message;
    showMsg('error', errorMessage);
  } finally {
    setLoading(false);
  }
});

/**
 * Clear all form fields and file input
 */
function clearForm() {
  document.getElementById('name').value = '';
  document.getElementById('student-id').value = '';
  document.getElementById('email').value = '';
  document.getElementById('reason').value = '';
  document.getElementById('detail').value = '';
  fileBase64 = null;
  fileMeta = null;
  fileInput.value = '';
  filePreview.classList.remove('show');
  imgThumb.src = '';
}
  imgThumb.style.display = 'none';
