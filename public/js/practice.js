// practice.js — trang luyện tập: tìm kiếm, phân trang, đánh dấu câu hỏi (toggle).

let page = 1;
let loadingMore = false; // cờ chống double-click "Xem thêm"

// ===================== Nạp danh sách câu hỏi =====================
async function loadProblems(reset = false) {
  if (loadingMore) return;
  const place = document.getElementById('results');
  const moreButton = document.getElementById('more');
  if (reset) {
    page = 1;
    place.innerHTML = '<p class="empty">Đang tải…</p>';
  }
  loadingMore = true;
  if (moreButton) moreButton.disabled = true;
  try {
    const params = new URLSearchParams({
      page: page,
      limit: 20,
      search: document.getElementById('search').value,
      topic: document.getElementById('topic').value
    });
    const grade = document.getElementById('grade').value;
    if (grade && Number(grade) !== 0) params.set('grade', grade); // chỉ gửi grade khi người dùng chọn lớp
    const data = await api('/api/problems?' + params.toString());
    const items = data.items || [];
    if (reset) place.innerHTML = ''; // xóa chữ "Đang tải…"
    if (reset && !items.length) place.innerHTML = '<p class="empty">Không tìm thấy câu hỏi.</p>';
    const saved = readSaved();
    const resultCount = document.getElementById('result-count');
    if (resultCount) resultCount.innerHTML = `<b>${data.total || items.length}</b> câu hỏi`;
    place.insertAdjacentHTML('beforeend', items.map(problem => {
      const marked = saved.some(item => item.id === problem.id);
      return `
      <article class="pcard">
        <div class="pcard-top">
          <span class="plabel">${escapeText(problem.label)} · Lớp ${escapeText(problem.grade || '?')}</span>
        </div>
        <div class="md pcard-text">
          <p class="question-text">${escapeText(problem.text)}</p>
        </div>
        <div class="pcard-foot">
          <span class="chips"><span class="chip"><b>${escapeText(problem.topic || '')}</b></span></span>
          <span class="pcard-src"><a href="/pages/exams.html?id=${encodeURIComponent(problem.collectionId)}">${escapeText(problem.collectionTitle)} · ${escapeText(problem.year || '')}</a></span>
          <button class="button secondary save" data-id="${escapeText(problem.id)}" data-collection="${escapeText(problem.collectionId)}" data-title="${escapeText(problem.collectionTitle)}" data-label="${escapeText(problem.label)}">${marked ? '✓ Đã đánh dấu' : 'Đánh dấu'}</button>
        </div>
      </article>`;
    }).join(''));
    place.querySelectorAll('.save').forEach(button => {
      button.onclick = () => toggleSaved(button);
    });
    renderMath();
    if (moreButton) moreButton.hidden = page * 20 >= (data.total || 0);
    page++;
  } catch (error) {
    // Lỗi hiện trong container, không treo "đang tải".
    if (reset) {
      place.innerHTML = `<p class="empty">${escapeText(error.message)}</p>`;
    } else {
      place.insertAdjacentHTML('beforeend', `<p class="empty">${escapeText(error.message)}</p>`);
    }
    if (moreButton) moreButton.hidden = true;
  } finally {
    loadingMore = false;
    if (moreButton) moreButton.disabled = false;
  }
}

// ===================== Đánh dấu / gỡ đánh dấu =====================
// Toggle: giữ nguyên shape object {id, collectionId, title, label} trong localStorage.
function toggleSaved(button) {
  const items = readSaved();
  const index = items.findIndex(item => item.id === button.dataset.id);
  if (index >= 0) {
    items.splice(index, 1);
    writeSaved(items);
    button.textContent = 'Đánh dấu';
  } else {
    items.push({
      id: button.dataset.id,
      collectionId: button.dataset.collection,
      title: button.dataset.title,
      label: button.dataset.label
    });
    writeSaved(items);
    button.textContent = '✓ Đã đánh dấu';
  }
}

// ===================== Khởi động =====================
const params = new URLSearchParams(location.search);
const searchInput = document.getElementById('search');
const gradeSelect = document.getElementById('grade');
const topicSelect = document.getElementById('topic');
if (params.get('search') && searchInput) searchInput.value = params.get('search');
if (params.get('grade') && gradeSelect) gradeSelect.value = params.get('grade');
if (params.get('topic') && topicSelect) topicSelect.value = params.get('topic');

const moreButton = document.getElementById('more');
if (moreButton) {
  moreButton.hidden = true; // ẩn cho tới khi lần tải đầu xong
  moreButton.onclick = () => loadProblems();
}
document.getElementById('search-form').onsubmit = event => {
  event.preventDefault();
  loadProblems(true);
};
loadProblems(true);
