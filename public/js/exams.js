// exams.js — danh sách bộ đề (lọc theo loại, khối lớp, từ khóa) + trang chi tiết một bộ đề.

const params = new URLSearchParams(location.search);
const id = params.get('id');
const requestedPage = Number(params.get('page') || 1);
let page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
const requestedKind = params.get('kind') || '';
let kindFilter = ['hsg', 'chuyen', 'tapchi', 'chuyende', 'olympic'].includes(requestedKind) ? requestedKind : '';
let gradeFilter = [6, 7, 8, 9, 10].includes(Number(params.get('grade'))) ? Number(params.get('grade')) : 0;
let searchFilter = (params.get('search') || '').trim();

const STAMP = { hsg: 'stamp-hsg', chuyen: 'stamp-chuyen', tapchi: 'stamp-tapchi', chuyende: 'stamp-chuyende', olympic: 'stamp-olympic' };

function stampClass(kind) { return STAMP[kind] || 'stamp-hsg'; }
function stampLabel(kind) {
  return ({ hsg: 'HSG', chuyen: 'VÀO 10', tapchi: 'TẠP CHÍ', chuyende: 'CHUYÊN ĐỀ', olympic: 'OLYMPIC' })[kind] || (kind || 'ĐỀ').toUpperCase();
}
function kindLongLabel(kind) {
  return ({ hsg: 'Đề thi học sinh giỏi', chuyen: 'Đề thi vào 10 chuyên', tapchi: 'Bài toán trên tạp chí', chuyende: 'Bài tập chuyên đề', olympic: 'Đề Olympic' })[kind] || 'Bộ đề Toán';
}
function gradeName(g) {
  if (!g) return 'THCS';
  return Number(g) === 10 ? 'Vào 10' : `Lớp ${g}`;
}

function buildListQuery(targetPage = page) {
  const q = new URLSearchParams();
  if (targetPage > 1) q.set('page', String(targetPage));
  if (kindFilter) q.set('kind', kindFilter);
  if (gradeFilter) q.set('grade', String(gradeFilter));
  if (searchFilter) q.set('search', searchFilter);
  const s = q.toString();
  return '/pages/exams.html' + (s ? '?' + s : '');
}

// ===================== Danh sách bộ đề =====================
async function listCollections() {
  const place = document.getElementById('results');
  const countEl = document.getElementById('result-count');
  const pager = document.getElementById('pager');
  place.className = 'grid';
  place.innerHTML = '<p class="muted" style="grid-column:1/-1">Đang tải…</p>';
  try {
    const apiParams = new URLSearchParams({ page: String(page), limit: '24' });
    if (kindFilter) apiParams.set('kind', kindFilter);
    if (gradeFilter) apiParams.set('grade', String(gradeFilter));
    if (searchFilter) apiParams.set('search', searchFilter);
    const data = await api('/api/collections?' + apiParams.toString());
    const items = data.items || [];
    const total = data.total || 0;
    const perPage = 24;
    const totalPages = Math.max(1, Math.ceil(total / perPage));
    if (page > totalPages) {
      page = totalPages;
      return listCollections();
    }
    history.replaceState(null, '', buildListQuery(page));
    if (countEl) {
      countEl.innerHTML = `<b>${total.toLocaleString('vi-VN')}</b> đề${totalPages > 1 ? ` · trang ${page}/${totalPages}` : ''}`;
    }
    if (!items.length) {
      place.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          ${typeof turtleSvg === 'function' ? turtleSvg('tu', 80, '', 'dizzy') : ''}
          <div>
            <h2>Không tìm thấy bộ đề</h2>
            <p class="small muted">Thử từ khóa khác hoặc bấm <a href="/pages/exams.html">Xóa bộ lọc</a>.</p>
          </div>
        </div>`;
    } else {
      place.innerHTML = items.map(c => `
        <a class="ccard" href="/pages/exams.html?id=${encodeURIComponent(c.id)}&page=${page}${kindFilter ? '&kind=' + encodeURIComponent(kindFilter) : ''}">
          <div class="ccard-head">
            <span class="stamp ${stampClass(c.kind)}">${escapeText(stampLabel(c.kind))}</span>
            <span class="ccard-meta">${escapeText(gradeName(c.grade))}${c.year ? ' · ' + escapeText(c.year) : ''}</span>
          </div>
          <h3>${escapeText(c.title)}</h3>
          <p class="muted small">${escapeText(c.itemSummary || '')}${c.province ? ' · ' + escapeText(c.province) : ''}</p>
        </a>`).join('');
    }

    if (pager) {
      if (totalPages <= 1) {
        pager.innerHTML = '';
      } else {
        const nums = [...new Set([1, totalPages, page - 2, page - 1, page, page + 1, page + 2].filter(x => x >= 1 && x <= totalPages))].sort((a, b) => a - b);
        let html = '';
        if (page > 1) html += `<a rel="prev" href="${buildListQuery(page - 1)}">← Trước</a>`;
        else html += `<span class="off">← Trước</span>`;
        nums.forEach((n, idx) => {
          html += `<span class="pnum">`;
          if (idx > 0 && n - nums[idx - 1] > 1) html += `<span class="gap">…</span>`;
          if (n === page) html += `<b aria-current="page">${n}</b>`;
          else html += `<a href="${buildListQuery(n)}">${n}</a>`;
          html += `</span>`;
        });
        if (page < totalPages) html += `<a rel="next" href="${buildListQuery(page + 1)}">Sau →</a>`;
        else html += `<span class="off">Sau →</span>`;
        pager.innerHTML = html;
      }
    }
    renderMath();
  } catch (error) {
    place.innerHTML = `<p class="empty" style="grid-column:1/-1">${escapeText(error.message)}</p>`;
  }
}

// ===================== Trang chi tiết một bộ đề =====================
async function showCollection() {
  const listHeader = document.getElementById('list-header');
  const kindTabs = document.getElementById('kind-tabs');
  const searchForm = document.getElementById('exam-search-form');
  const countEl = document.getElementById('result-count');
  const pager = document.getElementById('pager');
  const place = document.getElementById('results');

  if (listHeader) listHeader.hidden = true;
  if (kindTabs) kindTabs.hidden = true;
  if (searchForm) searchForm.hidden = true;
  if (countEl) countEl.hidden = true;
  if (pager) pager.hidden = true;

  place.className = '';
  place.innerHTML = '<p class="muted">Đang tải bộ đề…</p>';

  try {
    const c = await api('/api/collections/' + encodeURIComponent(id) + '?per=100');
    document.title = `${c.title || 'Đề thi'} · Rùa Toán`;
    const problems = c.problems || [];
    const saved = readSaved();
    const backHref = buildListQuery(page);
    const metaParts = [
      gradeName(c.grade),
      c.year ? String(c.year) : '',
      c.province ? String(c.province) : '',
      `${problems.length} bài`
    ].filter(Boolean).join(' · ');

    const sourceHtml = c.sourceUrl
      ? `<p class="source">Nguồn: <a href="${safeUrl(c.sourceUrl)}" target="_blank" rel="noopener">${escapeText(c.sourceName || 'Tài liệu nguồn')} ↗</a></p>`
      : (c.sourceName ? `<p class="source">Nguồn: ${escapeText(c.sourceName)}</p>` : '');

    place.innerHTML = `
      <article class="de">
        <nav class="crumbs noprint" aria-label="Vị trí">
          <a href="/pages/exams.html">Đề thi</a>
          <span aria-hidden="true"> › </span>
          <a href="/pages/exams.html?kind=${encodeURIComponent(c.kind || '')}">${escapeText(kindLongLabel(c.kind))}</a>
        </nav>
        <header class="de-head">
          ${typeof turtleSvg === 'function' ? turtleSvg('tu', 90, 'noprint', 'happy') : ''}
          <div>
            <div class="row">
              <span class="stamp ${stampClass(c.kind)}">${escapeText(stampLabel(c.kind))}</span>
              <span class="small">${escapeText(metaParts)}</span>
            </div>
            <h1>${escapeText(c.title)}</h1>
            ${sourceHtml}
            <div class="row noprint" style="margin-top:10px">
              <a class="btn sm ghost" href="${backHref}">← Danh sách đề</a>
              <button type="button" class="btn sm secondary" id="print-exam-btn">🖨️ In đề</button>
            </div>
          </div>
        </header>

        <ol class="de-list">
          ${problems.map((p, i) => {
            const marked = saved.some(item => item.id === p.id);
            const rawTopics = (p.topics && p.topics.length) ? p.topics : [];
            const mainTm = topicInfo(rawTopics[0] || '');
            const chipsHtml = rawTopics.map(t => topicChipHtml(t, true)).join('');
            const labelText = p.label || ('Bài ' + (i + 1));
            return `
            <li id="${escapeText(p.id)}" class="scroll prob" data-pid="${escapeText(p.id)}" style="--c:${mainTm.color}">
              <div class="prob-head">
                <b class="plabel">${escapeText(labelText)}</b>
                <span class="chips noprint">${chipsHtml}</span>
                <span class="done-tag">✓ Đã nộp</span>
              </div>
              <div class="md question-text">${renderMarkdown(p.text)}</div>
              <div class="row noprint" style="margin-top:14px;padding-top:10px;border-top:2px dashed rgba(31,26,16,.22)">
                <button type="button" class="btn sm secondary save" data-index="${i}">${marked ? '✓ Đã đánh dấu' : 'Đánh dấu'}</button>
                <button type="button" class="btn sm primary photo-btn" data-problem="${escapeText(p.id)}" data-label="${escapeText(labelText)}" data-title="${escapeText(c.title)}">📷 Nộp ảnh bài làm</button>
                <input type="file" class="photo-input" data-problem="${escapeText(p.id)}" accept="image/jpeg,image/png,image/webp" multiple hidden>
                <span class="small muted upload-status" data-problem="${escapeText(p.id)}"></span>
              </div>
              <div class="thumbs problem-photos noprint" data-problem="${escapeText(p.id)}"></div>
            </li>`;
          }).join('')}
        </ol>
      </article>`;

    const printBtn = document.getElementById('print-exam-btn');
    if (printBtn) printBtn.onclick = () => window.print();

    place.querySelectorAll('.save').forEach(button => {
      button.onclick = () => toggleSaveProblem(button, c, problems[Number(button.dataset.index)]);
    });

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
        const statusEl = input.parentElement.querySelector('.upload-status');
        const label = btn ? btn.dataset.label : '';
        const title = btn ? btn.dataset.title : '';
        const files = Array.from(input.files || []);
        if (!files.length) return;
        if (files.length > 6) {
          if (statusEl) statusEl.textContent = 'Chỉ chọn tối đa 6 ảnh mỗi lần.';
          return;
        }
        input.disabled = true;
        if (btn) btn.disabled = true;
        if (statusEl) statusEl.textContent = 'Đang nén và tải ảnh lên…';
        try {
          const formData = new FormData();
          for (const file of files) {
            const blob = await compressImage(file);
            if (blob.size > 1_500_000) {
              throw new Error(`Ảnh "${file.name}" sau khi nén vẫn lớn hơn 1.5 MB.`);
            }
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
          if (res.status === 401) {
            location.href = '/pages/login.html';
            return;
          }
          let data = {};
          try { data = await res.json(); } catch (e) {}
          if (!res.ok) throw new Error(data.detail || 'Không tải được ảnh.');
          if (statusEl) statusEl.textContent = '✓ Đã lưu ảnh bài làm.';
          await loadProblemPhotos(problemId, place);
        } catch (error) {
          if (statusEl) statusEl.textContent = '⚠ ' + error.message;
        } finally {
          input.value = '';
          input.disabled = false;
          if (btn) btn.disabled = false;
        }
      };
    });

    for (const p of problems) {
      loadProblemPhotos(p.id, place);
    }
    await renderMath();
    if (location.hash) {
      const target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (error) {
    place.innerHTML = `<p class="empty">${escapeText(error.message)}</p>`;
  }
}

async function loadProblemPhotos(problemId, root) {
  const grid = root.querySelector(`.problem-photos[data-problem="${CSS.escape(problemId)}"]`);
  const card = root.querySelector(`.prob[data-pid="${CSS.escape(problemId)}"]`);
  if (!grid) return;
  try {
    const res = await fetch('/api/photos?problem=' + encodeURIComponent(problemId), { credentials: 'same-origin' });
    if (res.status === 401 || !res.ok) {
      grid.innerHTML = '';
      return;
    }
    const data = await res.json();
    const items = data.items || [];
    if (card) card.classList.toggle('is-done', items.length > 0);
    grid.innerHTML = items.map(item => {
      const imgUrl = `/api/photos/${encodeURIComponent(item.id)}`;
      const name = escapeText(item.file_name || 'Ảnh bài làm');
      return `
      <div class="thumb">
        <a href="${imgUrl}" class="thumb-img" data-lightbox="${imgUrl}" data-caption="${name}">
          <img src="${imgUrl}" alt="Ảnh bài làm: ${name}" loading="lazy">
        </a>
        <button class="thumb-del" data-id="${escapeText(String(item.id))}" type="button" aria-label="Xóa ảnh ${name}" title="Xóa ảnh">×</button>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-lightbox]').forEach(link => {
      link.onclick = e => {
        e.preventDefault();
        openLightbox(link.dataset.lightbox, link.dataset.caption);
      };
    });
    grid.querySelectorAll('.thumb-del').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Xóa ảnh bài làm này?')) return;
        btn.disabled = true;
        try {
          const r = await fetch('/api/photos/' + encodeURIComponent(btn.dataset.id), { method: 'DELETE', credentials: 'same-origin' });
          if (r.status === 401) { location.href = '/pages/login.html'; return; }
          if (!r.ok) throw new Error('Xóa thất bại.');
          loadProblemPhotos(problemId, root);
        } catch (e) {
          btn.disabled = false;
        }
      };
    });
  } catch (e) {}
}

function toggleSaveProblem(button, collection, problem) {
  if (!problem) return;
  const items = readSaved();
  const idx = items.findIndex(x => x.id === problem.id);
  if (idx >= 0) {
    items.splice(idx, 1);
    writeSaved(items);
    button.textContent = 'Đánh dấu';
  } else {
    items.push({ id: problem.id, collectionId: collection.id, title: collection.title, label: problem.label || 'Bài' });
    writeSaved(items);
    button.textContent = '✓ Đã đánh dấu';
  }
}

// ===================== Khởi động =====================
if (id) {
  showCollection();
} else {
  const searchInput = document.getElementById('search');
  const gradeSelect = document.getElementById('grade');
  const searchForm = document.getElementById('exam-search-form');
  if (searchInput && searchFilter) searchInput.value = searchFilter;
  if (gradeSelect && gradeFilter) gradeSelect.value = String(gradeFilter);

  const syncKindTabs = () => {
    const tabs = document.querySelectorAll('#kind-tabs a');
    tabs.forEach(a => {
      const k = a.dataset.kind || '';
      if (k === kindFilter) a.classList.add('on');
      else a.classList.remove('on');
      a.onclick = e => {
        e.preventDefault();
        kindFilter = k;
        page = 1;
        syncKindTabs();
        listCollections();
      };
    });
  };
  syncKindTabs();

  if (gradeSelect) {
    gradeSelect.onchange = () => {
      gradeFilter = Number(gradeSelect.value) || 0;
      page = 1;
      listCollections();
    };
  }
  if (searchForm) {
    searchForm.onsubmit = e => {
      e.preventDefault();
      searchFilter = searchInput ? searchInput.value.trim() : '';
      gradeFilter = gradeSelect ? (Number(gradeSelect.value) || 0) : 0;
      page = 1;
      listCollections();
    };
  }
  listCollections();
}
