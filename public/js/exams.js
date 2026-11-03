// exams.js — danh sách bộ đề (original-style) + trang chi tiết một bộ.

const params = new URLSearchParams(location.search);
const id = params.get('id');
let page = params.get('page') ? Number(params.get('page')) : 1;
let kindFilter = params.get('kind') || '';
let loadingMore = false;

const STAMP = { hsg: 'stamp-hsg', chuyen: 'stamp-chuyen', tapchi: 'stamp-tapchi', chuyende: 'stamp-chuyende', olympic: 'stamp-olympic' };

function stampClass(kind) { return STAMP[kind] || 'stamp-hsg'; }
function stampLabel(kind) {
  return ({ hsg: 'HSG', chuyen: 'VÀO 10', tapchi: 'TẠP CHÍ', chuyende: 'CHUYÊN ĐỀ', olympic: 'OLYMPIC' })[kind] || (kind || 'ĐỀ').toUpperCase();
}

// ===================== Danh sách bộ đề =====================
async function listCollections() {
  const place = document.getElementById('results');
  const countEl = document.getElementById('result-count');
  const pager = document.getElementById('pager');
  place.innerHTML = '<p class="muted">Đang tải…</p>';
  try {
    const data = await api(`/api/collections?page=${page}&limit=24&kind=${encodeURIComponent(kindFilter)}`);
    const items = data.items || [];
    const total = data.total || 0;
    const perPage = 24;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (countEl) countEl.innerHTML = `<b>${total.toLocaleString('vi-VN')}</b> đề · trang ${page}/${totalPages}`;
    place.innerHTML = items.map(c => `
      <a class="ccard" href="/pages/exams.html?id=${encodeURIComponent(c.id)}&page=${page}">
        <div class="ccard-head"><span class="stamp ${stampClass(c.kind)}">${escapeText(stampLabel(c.kind))}</span><span class="ccard-meta">Lớp ${escapeText(c.grade || '?')} · ${escapeText(c.year || '')}</span></div>
        <h3>${escapeText(c.title)}</h3>
        <p class="muted small">${escapeText(c.itemSummary || '')}</p>
      </a>`).join('') || '<p class="muted">Không có đề.</p>';

    // pager
    if (pager) {
      let html = '';
      if (page > 1) html += `<a href="/pages/exams.html?page=${page-1}${kindFilter?'&kind='+encodeURIComponent(kindFilter):''}">← Trước</a>`;
      else html += `<span class="off">← Trước</span>`;
      html += `<span class="pnum"><b aria-current="page">${page}</b></span>`;
      if (page < totalPages) {
        html += `<span class="pnum"><a href="/pages/exams.html?page=${page+1}${kindFilter?'&kind='+encodeURIComponent(kindFilter):''}">${page+1}</a></span>`;
        if (page + 1 < totalPages) html += `<span class="pnum"><span class="gap">…</span><a href="/pages/exams.html?page=${totalPages}${kindFilter?'&kind='+encodeURIComponent(kindFilter):''}">${totalPages}</a></span>`;
        html += `<a rel="next" href="/pages/exams.html?page=${page+1}${kindFilter?'&kind='+encodeURIComponent(kindFilter):''}">Sau →</a>`;
      } else {
        html += `<span class="off">Sau →</span>`;
      }
      pager.innerHTML = html;
    }
    renderMath();
  } catch (error) {
    place.innerHTML = `<p class="empty">${escapeText(error.message)}</p>`;
  }
}

// ===================== Trang chi tiết một bộ =====================
async function showCollection() {
  const main = document.querySelector('main');
  try {
    const c = await api('/api/collections/' + encodeURIComponent(id) + '?per=50');
    // render header title
    const h1 = main.querySelector('h1');
    if (h1) h1.textContent = c.title;
    const place = document.getElementById('results');
    const problems = c.problems || [];
    place.innerHTML = problems.map((p, i) => `
      <article class="pcard" style="margin:20px 0">
        <div class="pcard-top">
          <span class="plabel">${escapeText(p.label || ('Bài ' + (i + 1)))}</span>
        </div>
        <div class="md pcard-text" style="padding:12px 0">
          <p class="question-text" style="color:#1f1a10;margin:0">${escapeText(p.text)}</p>
        </div>
        <div class="pcard-foot">
          <div class="row">
            <button class="btn sm secondary save" data-index="${i}">Đánh dấu</button>
            <button class="btn sm secondary photo-btn" data-problem="${escapeText(p.id)}" data-label="${escapeText(p.label || ('Bài ' + (i + 1)))}" data-title="${escapeText(c.title)}" type="button">📷 Nộp ảnh bài làm</button>
            <input type="file" class="photo-input" data-problem="${escapeText(p.id)}" accept="image/jpeg,image/png,image/webp" multiple hidden>
          </div>
          <div class="photo-grid problem-photos" data-problem="${escapeText(p.id)}"></div>
        </div>
      </article>`).join('');
    place.querySelectorAll('.save').forEach(button => {
      button.onclick = () => saveProblem(c, problems[Number(button.dataset.index)]);
    });
    // photo upload per problem
    place.querySelectorAll('.photo-btn').forEach(button => {
      button.onclick = () => {
        const input = button.parentElement.querySelector('.photo-input');
        if (input) input.click();
      };
    });
    place.querySelectorAll('.photo-input').forEach(input => {
      input.onchange = async () => {
        const problemId = input.dataset.problem;
        const btn = input.parentElement.querySelector('.photo-btn');
        const label = btn ? btn.dataset.label : '';
        const title = btn ? btn.dataset.title : '';
        const files = Array.from(input.files || []);
        if (!files.length) return;
        input.disabled = true; if (btn) btn.disabled = true;
        try {
          const formData = new FormData();
          for (const file of files) {
            const blob = await compressImage(file);
            formData.append('files', blob, file.name.replace(/\.[^.]+$/, '') + '.webp');
          }
          formData.append('problem_id', problemId);
          formData.append('label', label);
          formData.append('title', title);
          const res = await fetch('/api/photos', {
            method: 'POST',
            credentials: 'same-origin',
            body: formData
          });
          let data = {}; try { data = await res.json(); } catch (e) {}
          if (!res.ok) throw new Error(data.detail || 'Không tải được ảnh.');
          await loadProblemPhotos(problemId, place);
        } catch (error) { alert(error.message); }
        finally { input.value = ''; input.disabled = false; if (btn) btn.disabled = false; }
      };
    });
    for (const p of problems) loadProblemPhotos(p.id, place);
    if (c.sourceUrl) {
      place.insertAdjacentHTML('beforeend', `<p>Nguồn: <a href="${safeUrl(c.sourceUrl)}" target="_blank" rel="noopener">${escapeText(c.sourceName || 'Tài liệu nguồn')}</a></p>`);
    }
    renderMath();
  } catch (error) {
    const place = document.getElementById('results');
    if (place) place.innerHTML = `<p class="empty">${escapeText(error.message)}</p>`;
  }
}

async function loadProblemPhotos(problemId, root) {
  const grid = root.querySelector(`.problem-photos[data-problem="${CSS.escape(problemId)}"]`);
  if (!grid) return;
  try {
    const res = await fetch('/api/photos?problem=' + encodeURIComponent(problemId), { credentials: 'same-origin' });
    if (res.status === 401) return;
    if (!res.ok) return;
    const data = await res.json();
    const items = data.items || [];
    grid.innerHTML = items.map(item => `
      <article class="photo">
        <img src="/api/photos/${encodeURIComponent(item.id)}" alt="Ảnh bài làm" loading="lazy">
        <p>${escapeText(item.file_name)}</p>
        <button class="btn sm secondary" data-id="${escapeText(String(item.id))}" type="button">Xóa</button>
      </article>`).join('');
    grid.querySelectorAll('button').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Xóa ảnh này?')) return;
        btn.disabled = true;
        try {
          const r = await fetch('/api/photos/' + encodeURIComponent(btn.dataset.id), { method: 'DELETE', credentials: 'same-origin' });
          if (r.status === 401) { location.href = '/pages/login.html'; return; }
          if (!r.ok) throw new Error('Xóa thất bại.');
          loadProblemPhotos(problemId, root);
        } catch (e) { btn.disabled = false; alert(e.message); }
      };
    });
  } catch (e) {}
}

function saveProblem(collection, problem) {
  if (!problem) return;
  const items = readSaved();
  if (!items.some(x => x.id === problem.id)) {
    items.push({ id: problem.id, collectionId: collection.id, title: collection.title, label: problem.label });
    writeSaved(items);
  }
  alert('Đã đánh dấu trên trình duyệt này.');
}

// ===================== Khởi động =====================
if (id) {
  showCollection();
} else {
  // kind tabs active state
  const tabs = document.querySelectorAll('#kind-tabs a');
  tabs.forEach(a => {
    const u = new URL(a.href, location.origin);
    if ((u.searchParams.get('kind') || '') === kindFilter) a.classList.add('on');
    else a.classList.remove('on');
  });
  if (!kindFilter) tabs[0].classList.add('on');
  listCollections();
}
