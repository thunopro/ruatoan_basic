// lessons.js — danh sách bài lý thuyết: tìm kiếm và bấm tiêu đề để mở/đóng nội dung.

let lessons = [];
const place = document.getElementById('results');

// ===================== Vẽ danh sách bài =====================
function showLessons() {
  if (!place) return;
  const term = document.getElementById('search').value.toLocaleLowerCase('vi');
  const matches = lessons.filter(x => ((x.title || '') + ' ' + (x.summary || '')).toLocaleLowerCase('vi').includes(term));
  // Tiêu đề là nút bấm toggle (thay cho anchor href="#" không hoạt động).
  place.innerHTML = matches.map((lesson, index) => `
    <article class="lcard" style="--t:#b6ff3b">
      <div class="lcard-no">CHUYÊN ĐỀ #${index + 1} · ${escapeText(lesson.topic || 'Toán THCS')}</div>
      <h3>${escapeText(lesson.title)}</h3>
      <p>${escapeText(lesson.summary || '')}</p>
      <div class="row">
        <button class="btn sm secondary lesson-toggle" type="button" data-index="${index}">📖 Xem nội dung chuyên đề</button>
      </div>
      <div id="lesson-${index}" hidden class="lesson-body md scroll" style="margin-top:14px;background:#fff8e6;color:#1f1a10;border:3px solid var(--ink);box-shadow:4px 4px 0 var(--ink);border-radius:10px;padding:16px"></div>
    </article>`).join('') || '<p class="empty">Chưa có kết quả.</p>';
  place.querySelectorAll('button').forEach(button => {
    button.onclick = () => {
      const lesson = matches[Number(button.dataset.index)];
      const body = document.getElementById('lesson-' + button.dataset.index);
      if (!lesson || !body) return;
      body.hidden = !body.hidden;
      if (!body.hidden) {
        body.textContent = lesson.body || lesson.summary;
        renderMath();
      }
    };
  });
}

// ===================== Nạp dữ liệu =====================
(async function loadLessons() {
  try {
    const data = await api('/api/lessons');
    lessons = data.items || [];
    showLessons();
  } catch (error) {
    place.innerHTML = `<p class="empty">${escapeText(error.message)}</p>`;
  }
})();

document.getElementById('search').oninput = showLessons;
