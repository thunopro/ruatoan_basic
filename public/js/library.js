// library.js — thư viện sách và tài liệu: tìm kiếm phía client; một endpoint chết không làm trống cả trang.

let books = [];
let docs = [];
const search = document.getElementById('search');

// ===================== Vẽ kết quả tìm kiếm =====================
function draw() {
  const term = search.value.toLocaleLowerCase('vi');
  const renderBooks = items => items.filter(x => (x.title + ' ' + (x.author || '') + ' ' + (x.desc || '')).toLocaleLowerCase('vi').includes(term))
    .map(x => `
      <article class="book">
        <div class="book-cover" style="--c: var(--ooze)"><span>${escapeText(x.title)}</span></div>
        <div class="book-body">
          <h3><a href="${safeUrl(x.url || '')}" target="_blank" rel="noopener">${escapeText(x.title)}${x.free ? ' <span class="free">Miễn phí</span>' : ''}</a></h3>
          <p class="small muted">${escapeText(x.author || x.publisher || x.source || '')}${x.grades?.length ? ' · Lớp ' + escapeText(x.grades.join(', ')) : ''}${x.lang ? ' · ' + escapeText(x.lang === 'en' ? 'Tiếng Anh' : x.lang === 'ru' ? 'Tiếng Nga' : x.lang === 'vi' ? 'Tiếng Việt' : x.lang) : ''}</p>
          <p class="small">${escapeText(x.desc || '')}</p>
          <a class="btn sm" href="${safeUrl(x.url || '')}" target="_blank" rel="noopener">${escapeText(x.source || 'Xem')} ↗</a>
        </div>
      </article>`).join('') || '<p class="empty">Không tìm thấy tài liệu.</p>';
  const renderDocs = items => items.filter(x => (x.title + ' ' + (x.author || '') + ' ' + (x.desc || '')).toLocaleLowerCase('vi').includes(term))
    .map(x => `
      <li class="doc">
        <span class="doc-icon ${x.kind === 'mag' ? 'mag-icon' : 'book-icon'}" aria-hidden="true">${x.pdf ? 'PDF' : 'SÁCH'}</span>
        <div class="doc-body">
          <h3><a href="${safeUrl(x.url || x.pdf || '')}" target="_blank" rel="noopener">${escapeText(x.title)}</a></h3>
          <p class="small muted">${escapeText(x.author || x.source || '')}${x.grades?.length ? ' · Lớp ' + escapeText(x.grades.join(', ')) : ''}${x.pages ? ' · ' + escapeText(x.pages) + ' trang' : ''}</p>
          <p class="small">${escapeText(x.desc || '')}</p>
        </div>
        <div class="doc-act">
          <a class="btn sm" href="${safeUrl(x.pdf || x.url || '')}" target="_blank" rel="noopener">${escapeText(x.source || 'Xem')} ↗</a>
        </div>
      </li>`).join('') || '<p class="empty">Không tìm thấy tài liệu.</p>';
  document.getElementById('books').innerHTML = renderBooks(books);
  document.getElementById('docs').innerHTML = renderDocs(docs);
}

// ===================== Nạp dữ liệu: Promise.allSettled =====================
(async function loadLibrary() {
  const results = await Promise.allSettled([api('/api/books'), api('/api/docs')]);
  const failed = [];
  if (results[0].status === 'fulfilled') books = results[0].value.items || [];
  else failed.push('sách');
  if (results[1].status === 'fulfilled') docs = results[1].value.items || [];
  else failed.push('tài liệu');
  draw();
  if (failed.length) {
    document.getElementById('books').insertAdjacentHTML('beforeend',
      `<p class="empty">Không tải được danh sách ${escapeText(failed.join(' và '))}. Phần còn lại vẫn hiển thị bên trên.</p>`);
  }
})();

search.oninput = draw;
