// submissions.js — xem (kèm Lightbox & thông tin bài), tải lên và xóa ảnh bài làm, đổi mật khẩu.

const form = document.getElementById('upload-form');
const message = document.getElementById('message');
const photos = document.getElementById('photos');
const MAX_FILES = 6;
const MAX_BYTES = 1_500_000; // khớp giới hạn 1.5MB của backend

// ===================== Danh sách ảnh đã tải lên =====================
async function loadPhotos() {
  try {
    const me = await api('/api/me');
    if (!me || !me.user) { location.href = '/pages/login.html'; return; }
  } catch (e) { location.href = '/pages/login.html'; return; }
  try {
    const data = await api('/api/photos');
    const items = data.items || [];
    if (!items.length) {
      photos.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          ${typeof turtleSvg === 'function' ? turtleSvg('cam', 80, '', 'happy') : ''}
          <div>
            <h2>Bạn chưa tải ảnh bài làm nào lên</h2>
            <p class="small muted">Chọn ảnh ở khung phía trên hoặc nộp trực tiếp tại từng bài trong trang Đề thi.</p>
          </div>
        </div>`;
      return;
    }
    photos.innerHTML = items.map(item => {
      const id = encodeURIComponent(item.id);
      const imgUrl = `/api/photos/${id}`;
      const name = escapeText(item.file_name || 'Ảnh bài làm');
      const titleInfo = [item.label, item.title].filter(Boolean).join(' · ') || item.file_name || 'Ảnh bài làm';
      const dateStr = item.created_at ? new Date(item.created_at).toLocaleDateString('vi-VN') : '';
      return `
      <div class="thumb-card">
        <div class="thumb">
          <a href="${imgUrl}" class="thumb-img" data-lightbox="${imgUrl}" data-caption="${escapeText(titleInfo)}">
            <img src="${imgUrl}" alt="Ảnh bài làm: ${name}" loading="lazy">
          </a>
          <button class="thumb-del" data-id="${escapeText(String(item.id))}" type="button" aria-label="Xóa ảnh ${name}" title="Xóa ảnh">×</button>
        </div>
        <div class="thumb-meta">
          <strong title="${escapeText(titleInfo)}">${escapeText(item.label || name)}</strong>
          ${item.title ? `<small title="${escapeText(item.title)}">${escapeText(item.title)}</small>` : `<small>${escapeText(dateStr)}</small>`}
        </div>
      </div>`;
    }).join('');
    photos.querySelectorAll('[data-lightbox]').forEach(link => {
      link.onclick = e => {
        e.preventDefault();
        openLightbox(link.dataset.lightbox, link.dataset.caption);
      };
    });
    photos.querySelectorAll('.thumb-del').forEach(button => {
      button.onclick = () => deletePhoto(button);
    });
  } catch (error) {
    if (error.status === 401) {
      location.href = '/pages/login.html';
      return;
    }
    photos.innerHTML = `<p class="empty" style="grid-column:1/-1">${escapeText(error.message)}</p>`;
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
    showMessage(message, 'Đang nén và tải ảnh lên…', true);
    const formData = new FormData();
    for (const file of rawFiles) {
      const blob = await compressImage(file);
      if (blob.size > MAX_BYTES) {
        throw new Error(`Ảnh "${file.name}" sau khi nén vẫn vượt quá 1.5 MB.`);
      }
      formData.append('files', blob, file.name.replace(/\.[^.]+$/, '') + '.webp');
    }
    const response = await fetch('/api/photos', { method: 'POST', body: formData });
    let result = {};
    try { result = await response.json(); } catch (error) {}
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
