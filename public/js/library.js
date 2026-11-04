// library.js — thư viện sách và tài liệu: lọc theo chuyên đề, tìm kiếm không dấu phía client.

let books = [];
let docs = [];
let activeTopic = '';
const search = document.getElementById('search');
const tabsEl = document.getElementById('library-topic-tabs');

const COVER_PALETTE = ['#2f8cff', '#9b5cff', '#ff8a1f', '#ff3b3b', '#3fbf5f'];

function renderLibraryTabs() {
  if (!tabsEl) return;
  tabsEl.innerHTML = [
    `<a role="listitem" href="#" data-topic=""${!activeTopic ? ' class="on"' : ''}>Tất cả</a>`,
    ...TOPIC_META.map(t => {
      const cls = activeTopic === t.key ? ' class="on"' : '';
      return `<a role="listitem" href="#" data-topic="${escapeText(t.key)}"${cls} style="--t:${t.color};--ti:${t.ti}"><b aria-hidden="true">${escapeText(t.icon)}</b> ${escapeText(t.name)}</a>`;
    })
  ].join('');
  tabsEl.querySelectorAll('a').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      activeTopic = a.dataset.topic || '';
      renderLibraryTabs();
      draw();
    };
  });
}

function matchesFilter(item, words) {
  if (activeTopic) {
    const itemTopics = Array.isArray(item.topics) ? item.topics.map(canonicalTopic) : (item.topic ? [canonicalTopic(item.topic)] : []);
    if (!itemTopics.includes(activeTopic)) return false;
  }
  if (!words.length) return true;
  const hay = foldText([item.title, item.author, item.publisher, item.source, item.desc].filter(Boolean).join(' '));
  return words.every(w => hay.includes(w));
}

function draw() {
  const words = foldText(search ? search.value : '').split(/\s+/).filter(Boolean);
  const filteredBooks = books.filter(x => matchesFilter(x, words));
  const filteredDocs = docs.filter(x => matchesFilter(x, words));

  const booksSec = document.getElementById('books-sec');
  const docsSec = document.getElementById('docs-sec');
  if (booksSec) booksSec.textContent = `Sách và tạp chí (${filteredBooks.length})`;
  if (docsSec) docsSec.textContent = `Tài liệu PDF (${filteredDocs.length})`;

  const renderBooks = items => items.map((x, idx) => {
    const firstTopic = (Array.isArray(x.topics) && x.topics[0]) || x.topic || '';
    const coverColor = firstTopic && TOPIC_MAP[canonicalTopic(firstTopic)]
      ? TOPIC_MAP[canonicalTopic(firstTopic)].color
      : COVER_PALETTE[idx % COVER_PALETTE.length];
    const langLabel = x.lang === 'en' ? 'Tiếng Anh' : x.lang === 'ru' ? 'Tiếng Nga' : x.lang === 'vi' ? 'Tiếng Việt' : (x.lang || '');
    const meta = [
      x.author || x.publisher || x.source || '',
      x.grades?.length ? 'Lớp ' + x.grades.join(', ') : '',
      langLabel
    ].filter(Boolean).join(' · ');
    return `
      <article class="book">
        <div class="book-cover" style="--c:${coverColor}"><span>${escapeText(x.title)}</span></div>
        <div class="book-body">
          <h3><a href="${safeUrl(x.url || '')}" target="_blank" rel="noopener">${escapeText(x.title)}</a>${x.free ? ' <span class="free">Miễn phí</span>' : ''}</h3>
          <p class="small muted">${escapeText(meta)}</p>
          <p class="small">${escapeText(x.desc || '')}</p>
          <a class="btn sm" href="${safeUrl(x.url || '')}" target="_blank" rel="noopener">${escapeText(x.source || 'Xem tài liệu')} ↗</a>
        </div>
      </article>`;
  }).join('') || '<p class="empty" style="grid-column:1/-1">Không tìm thấy sách hoặc tạp chí phù hợp.</p>';

  const renderDocs = items => items.map(x => {
    const meta = [
      x.author || x.source || '',
      x.grades?.length ? 'Lớp ' + x.grades.join(', ') : '',
      x.pages ? x.pages + ' trang' : '',
      x.topic ? topicLabel(x.topic) : ''
    ].filter(Boolean).join(' · ');
    const primaryHref = safeUrl(x.pdf || x.url || '');
    return `
      <li class="doc">
        <span class="doc-icon ${x.kind === 'mag' ? 'mag-icon' : 'book-icon'}" aria-hidden="true">${x.pdf ? 'PDF' : 'TÀI LIỆU'}</span>
        <div class="doc-body">
          <h3><a href="${primaryHref}" target="_blank" rel="noopener">${escapeText(x.title)}</a></h3>
          <p class="small muted">${escapeText(meta)}</p>
          <p class="small">${escapeText(x.desc || '')}</p>
        </div>
        <div class="doc-act">
          ${x.pdf ? `<a class="btn sm" href="${safeUrl(x.pdf)}" target="_blank" rel="noopener">Tải PDF</a>` : ''}
          ${x.url ? `<a class="btn sm${x.pdf ? ' ghost' : ''}" href="${safeUrl(x.url)}" target="_blank" rel="noopener">${escapeText(x.source || 'Trang gốc')} ↗</a>` : ''}
        </div>
      </li>`;
  }).join('') || '<p class="empty">Không tìm thấy tài liệu PDF phù hợp.</p>';

  document.getElementById('books').innerHTML = renderBooks(filteredBooks);
  document.getElementById('docs').innerHTML = renderDocs(filteredDocs);
}

// ===================== Nạp dữ liệu: Promise.allSettled =====================
(async function loadLibrary() {
  renderLibraryTabs();
  const results = await Promise.allSettled([api('/api/books'), api('/api/docs')]);
  const failed = [];
  if (results[0].status === 'fulfilled') books = results[0].value.items || [];
  else failed.push('sách');
  if (results[1].status === 'fulfilled') docs = results[1].value.items || [];
  else failed.push('tài liệu');
  draw();
  if (failed.length) {
    document.getElementById('books').insertAdjacentHTML('beforeend',
      `<p class="empty" style="grid-column:1/-1">Không tải được danh sách ${escapeText(failed.join(' và '))}. Phần còn lại vẫn hiển thị bên trên.</p>`);
  }
})();

if (search) search.oninput = draw;
