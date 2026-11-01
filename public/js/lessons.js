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
    <article class="ccard">
      <div class="ccard-head"><span class="ccard-meta">${escapeText(lesson.topic || '')}</span></div>
      <h3><button class="button secondary lesson-toggle" type="button" data-index="${index}">${escapeText(lesson.title)}</button></h3>
      <p class="muted small">${escapeText(lesson.summary || '')}</p>
      <button class="button secondary" data-index="${index}">Đọc bài</button>
      <div id="lesson-${index}" hidden class="lesson-body md"></div>
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
