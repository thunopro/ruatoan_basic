// practice.js — trang luyện tập: tìm kiếm, lọc theo chuyên đề/lớp, phân trang, đánh dấu câu hỏi.

let page = 1;
let loadingMore = false; // cờ chống double-click "Xem thêm"

const searchInput = document.getElementById('search');
const gradeSelect = document.getElementById('grade');
const topicSelect = document.getElementById('topic');
const topicTabsEl = document.getElementById('practice-topic-tabs');
const turtleWrap = document.getElementById('phead-turtle');
const pageTitleEl = document.getElementById('page-title');

function renderTopicTabs() {
  if (!topicTabsEl) return;
  const activeTopic = topicSelect ? topicSelect.value : '';
  const allActive = !activeTopic ? ' class="on"' : '';
  const tabsHtml = [
    `<a role="listitem" href="#" data-topic=""${allActive}>Tất cả</a>`,
    ...TOPIC_META.map(t => {
      const cls = activeTopic === t.key ? ' class="on"' : '';
      return `<a role="listitem" href="#" data-topic="${escapeText(t.key)}"${cls} style="--t:${t.color};--ti:${t.ti}"><b aria-hidden="true">${escapeText(t.icon)}</b> ${escapeText(t.name)}</a>`;
    })
  ].join('');
  topicTabsEl.innerHTML = tabsHtml;
  topicTabsEl.querySelectorAll('a').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      if (topicSelect) topicSelect.value = a.dataset.topic || '';
      syncHeaderAndUrl();
      loadProblems(true);
    };
  });
}

function syncHeaderAndUrl() {
  renderTopicTabs();
  const activeTopic = topicSelect ? topicSelect.value : '';
  const tm = activeTopic ? TOPIC_MAP[activeTopic] : null;
  if (pageTitleEl) pageTitleEl.textContent = tm ? `Luyện bài: ${tm.name}` : 'Luyện bài';
  if (turtleWrap && typeof turtleSvg === 'function') {
    turtleWrap.innerHTML = turtleSvg(tm ? tm.clan : 'xich', 80, 'phead-art', 'focus');
  }
  const url = new URL(location.href);
  const q = searchInput ? searchInput.value.trim() : '';
  const g = gradeSelect ? Number(gradeSelect.value) : 0;
  if (q) url.searchParams.set('search', q); else url.searchParams.delete('search');
  if (g) url.searchParams.set('grade', String(g)); else url.searchParams.delete('grade');
  if (activeTopic) url.searchParams.set('topic', activeTopic); else url.searchParams.delete('topic');
  history.replaceState(null, '', url.pathname + (url.search ? url.search : ''));
}

// ===================== Nạp danh sách câu hỏi =====================
async function loadProblems(reset = false) {
  if (loadingMore) return;
  const place = document.getElementById('results');
  const moreButton = document.getElementById('more');
  if (reset) {
    page = 1;
    place.innerHTML = '<p class="empty" style="grid-column:1/-1">Đang tải…</p>';
  }
  loadingMore = true;
  if (moreButton) moreButton.disabled = true;
  try {
    const params = new URLSearchParams({
      page: page,
      limit: 20,
      search: searchInput ? searchInput.value : '',
      topic: topicSelect ? topicSelect.value : ''
    });
    const grade = gradeSelect ? gradeSelect.value : '0';
    if (grade && Number(grade) !== 0) params.set('grade', grade);
    const data = await api('/api/problems?' + params.toString());
    const items = data.items || [];
    if (reset) place.innerHTML = '';
    if (reset && !items.length) {
      place.innerHTML = `
        <div class="empty" style="grid-column:1/-1">
          ${typeof turtleSvg === 'function' ? turtleSvg('tu', 80, '', 'dizzy') : ''}
          <div>
            <h2>Không tìm thấy câu hỏi</h2>
            <p class="small muted">Thử từ khóa khác hoặc bấm <a href="/pages/practice.html">Xóa bộ lọc</a>.</p>
          </div>
        </div>`;
    }
    const saved = readSaved();
    const resultCount = document.getElementById('result-count');
    if (resultCount) {
      resultCount.innerHTML = `<b>${Number(data.total || items.length).toLocaleString('vi-VN')}</b> câu hỏi`;
    }
    place.insertAdjacentHTML('beforeend', items.map(problem => {
      const marked = saved.some(item => item.id === problem.id);
      const rawTopics = (problem.topics && problem.topics.length) ? problem.topics : (problem.topic ? [problem.topic] : []);
      const mainTm = topicInfo(rawTopics[0] || '');
      const gradeLabel = problem.grade === 10 ? 'Vào 10' : ('Lớp ' + escapeText(problem.grade || '?'));
      const chipsHtml = rawTopics.length
        ? rawTopics.map(t => topicChipHtml(t, false)).join('')
        : topicChipHtml('hinh-hoc', false);
      const examHref = `/pages/exams.html?id=${encodeURIComponent(problem.collectionId)}#${encodeURIComponent(problem.id)}`;
      return `
      <article class="pcard" style="--c:${mainTm.color}">
        <div class="pcard-top">
          <span class="plabel">${escapeText(problem.label)} · ${gradeLabel}</span>
          <a class="btn sm ghost" href="${examHref}" style="padding:4px 10px;font-size:12px">Mở đề →</a>
        </div>
        <div class="md pcard-text question-text">
          ${renderMarkdown(problem.text)}
        </div>
        <div class="pcard-foot">
          <div class="row" style="justify-content:space-between">
            <span class="chips">${chipsHtml}</span>
            <button type="button" class="btn sm secondary save" data-id="${escapeText(problem.id)}" data-collection="${escapeText(problem.collectionId)}" data-title="${escapeText(problem.collectionTitle)}" data-label="${escapeText(problem.label)}">${marked ? '✓ Đã đánh dấu' : 'Đánh dấu'}</button>
          </div>
          <span class="pcard-src"><a href="${examHref}">${escapeText(problem.collectionTitle)}${problem.year ? ' · ' + escapeText(problem.year) : ''}</a></span>
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
    if (reset) {
      place.innerHTML = `<p class="empty" style="grid-column:1/-1">${escapeText(error.message)}</p>`;
    } else {
      place.insertAdjacentHTML('beforeend', `<p class="empty" style="grid-column:1/-1">${escapeText(error.message)}</p>`);
    }
    if (moreButton) moreButton.hidden = true;
  } finally {
    loadingMore = false;
    if (moreButton) moreButton.disabled = false;
  }
}

// ===================== Đánh dấu / gỡ đánh dấu =====================
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
const initParams = new URLSearchParams(location.search);
if (initParams.get('search') && searchInput) searchInput.value = initParams.get('search');
if (initParams.get('grade') && gradeSelect) gradeSelect.value = initParams.get('grade');
if (initParams.get('topic') && topicSelect) topicSelect.value = canonicalTopic(initParams.get('topic'));

const moreButton = document.getElementById('more');
if (moreButton) {
  moreButton.hidden = true;
  moreButton.onclick = () => loadProblems();
}
if (gradeSelect) gradeSelect.onchange = () => { syncHeaderAndUrl(); loadProblems(true); };
if (topicSelect) topicSelect.onchange = () => { syncHeaderAndUrl(); loadProblems(true); };

document.getElementById('search-form').onsubmit = event => {
  event.preventDefault();
  syncHeaderAndUrl();
  loadProblems(true);
};

syncHeaderAndUrl();
loadProblems(true);
