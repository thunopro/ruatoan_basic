// submissions.js — xem, tải lên và xóa ảnh bài làm.

const form = document.getElementById('upload-form');
const message = document.getElementById('message');
const photos = document.getElementById('photos');
const MAX_FILES = 6;
const MAX_SIZE = 1.5 * 1024 * 1024; // 1.5MB

// ===================== Danh sách ảnh đã tải lên =====================
async function loadPhotos() {
  // Kiểm tra đăng nhập trước để tránh 401 console noise cho khách.
  try {
    const me = await api('/api/me');
    if (!me || !me.user) { location.href = '/pages/login.html'; return; }
  } catch (e) { location.href = '/pages/login.html'; return; }
  try {
    const data = await api('/api/photos');
    const items = data.items || [];
    photos.innerHTML = items.map(item => {
      const id = encodeURIComponent(item.id);
      const name = escapeText(item.file_name);
      return `
      <div class="thumb">
        <span class="thumb-img"><img src="/api/photos/${id}" alt="Ảnh bài làm: ${name}" loading="lazy"></span>
        <button class="thumb-del" data-id="${escapeText(String(item.id))}" type="button" aria-label="Xóa ảnh ${name}" title="Xóa ảnh">×</button>
      </div>`;
    }).join('') || '<p class="empty" style="grid-column:1/-1">Bạn chưa tải ảnh nào lên.</p>';
    photos.querySelectorAll('button').forEach(button => {
      button.onclick = () => deletePhoto(button);
    });
  } catch (error) {
    if (error.status === 401) {
      location.href = '/pages/login.html';
      return;
    }
    photos.innerHTML = `<p class="empty">${escapeText(error.message)}</p>`;
  }
}

// ===================== Xóa một ảnh =====================
async function deletePhoto(button) {
  if (!confirm('Bạn chắc chắn muốn xóa ảnh này?')) return;
  button.disabled = true;
  try {
    await api('/api/photos/' + encodeURIComponent(button.dataset.id), { method: 'DELETE' });
    await loadPhotos();
  } catch (error) {
    button.disabled = false;
    if (error.status === 401) {
      location.href = '/pages/login.html';
      return;
    }
    showMessage(message, error.message);
  }
}

// ===================== Tải ảnh lên =====================
form.onsubmit = async event => {
  event.preventDefault();
  const input = form.querySelector('input[type="file"]');
  const rawFiles = input ? Array.from(input.files || []) : [];
  if (rawFiles.length < 1 || rawFiles.length > MAX_FILES) {
    showMessage(message, `Hãy chọn từ 1 đến ${MAX_FILES} ảnh.`);
    return;
  }
  const submitButton = form.querySelector('button[type="submit"], button');
  if (submitButton) submitButton.disabled = true;
  try {
    // Nén ảnh phía trình duyệt (đen trắng, tăng tương phản, thu nhỏ) giống bản gốc.
    showMessage(message, 'Đang nén và tải ảnh lên…');
    const formData = new FormData();
    for (const file of rawFiles) {
      const blob = await compressImage(file);
      formData.append('files', blob, file.name.replace(/\.[^.]+$/, '') + '.webp');
    }
    const response = await fetch('/api/photos', { method: 'POST', body: formData });
    let result = {};
    try { result = await response.json(); } catch (error) { /* body không phải JSON */ }
    if (!response.ok) throw new Error(result.detail || 'Không tải được ảnh (mã ' + response.status + ').');
    showMessage(message, 'Đã lưu ảnh vào PostgreSQL.', true);
    form.reset();
    loadPhotos();
  } catch (error) {
    showMessage(message, error.message);
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
};

// ===================== Đổi mật khẩu =====================
const passwordForm = document.getElementById('password-form');
const passwordMessage = document.getElementById('password-message');
if (passwordForm) {
  passwordForm.onsubmit = async event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(passwordForm).entries());
    const button = passwordForm.querySelector('button');
    if (button) button.disabled = true;
    try {
      await api('/api/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      showMessage(passwordMessage, 'Đã đổi mật khẩu thành công.', true);
      passwordForm.reset();
    } catch (error) {
      showMessage(passwordMessage, error.message);
    } finally {
      if (button) button.disabled = false;
    }
  };
}

loadPhotos();
