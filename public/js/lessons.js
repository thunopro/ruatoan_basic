// lessons.js — danh sách bài lý thuyết: lọc theo chuyên đề, tìm kiếm không dấu, mở bài giảng + bài tập áp dụng.

let lessons = [];
const params = new URLSearchParams(location.search);
let activeTopic = canonicalTopic(params.get('topic') || '');
const place = document.getElementById('results');
const countEl = document.getElementById('result-count');
const searchInput = document.getElementById('search');
const tabsEl = document.getElementById('lesson-topic-tabs');
const turtleWrap = document.getElementById('lesson-turtle');
const titleEl = document.getElementById('lesson-page-title');
const descEl = document.getElementById('lesson-page-desc');

function renderTabs() {
  if (!tabsEl) return;
  const counts = {};
  lessons.forEach(l => {
    const k = canonicalTopic(l.topic || '');
    counts[k] = (counts[k] || 0) + 1;
  });
  tabsEl.innerHTML = [
    `<a role="listitem" href="#" data-topic=""${!activeTopic ? ' class="on"' : ''}>Tất cả <small>(${lessons.length})</small></a>`,
    ...TOPIC_META.map(t => {
      const cls = activeTopic === t.key ? ' class="on"' : '';
      const n = counts[t.key] || 0;
      return `<a role="listitem" href="#" data-topic="${escapeText(t.key)}"${cls} style="--t:${t.color};--ti:${t.ti}"><b aria-hidden="true">${escapeText(t.icon)}</b> ${escapeText(t.name)} <small>(${n})</small></a>`;
    })
  ].join('');
  tabsEl.querySelectorAll('a').forEach(a => {
    a.onclick = e => {
      e.preventDefault();
      activeTopic = a.dataset.topic || '';
      syncHeader();
      showLessons();
    };
  });
}

function syncHeader() {
  const tm = activeTopic ? TOPIC_MAP[activeTopic] : null;
  if (titleEl) titleEl.textContent = tm ? `Chuyên đề: ${tm.name}` : 'Lý thuyết Toán';
  if (descEl) descEl.textContent = tm ? tm.desc : 'Ôn lý thuyết Toán nâng cao THCS theo 5 chuyên đề trọng tâm và bài tập áp dụng.';
  if (turtleWrap && typeof turtleSvg === 'function') {
    turtleWrap.innerHTML = turtleSvg(tm ? tm.clan : 'tu', 80, 'phead-art', 'happy');
  }
  renderTabs();
}

// ===================== Vẽ danh sách bài =====================
function showLessons() {
  if (!place) return;
  const words = foldText(searchInput ? searchInput.value : '').split(/\s+/).filter(Boolean);
  const matches = lessons.filter(x => {
    if (activeTopic && canonicalTopic(x.topic || '') !== activeTopic) return false;
    if (!words.length) return true;
    const hay = foldText((x.title || '') + ' ' + (x.summary || '') + ' ' + topicLabel(x.topic || ''));
    return words.every(w => hay.includes(w));
  });

  if (countEl) {
    countEl.innerHTML = `<b>${matches.length.toLocaleString('vi-VN')}</b> chuyên đề lý thuyết`;
  }

  if (!matches.length) {
    place.innerHTML = `
      <div class="empty" style="grid-column:1/-1">
        ${typeof turtleSvg === 'function' ? turtleSvg('tu', 80, '', 'dizzy') : ''}
        <div>
          <h2>Không tìm thấy bài giảng</h2>
          <p class="small muted">Thử từ khóa khác hoặc chọn tất cả chuyên đề.</p>
        </div>
      </div>`;
    return;
  }

  place.innerHTML = matches.map((lesson, index) => {
    const tm = topicInfo(lesson.topic || '');
    const exCount = Array.isArray(lesson.examples) ? lesson.examples.length : 0;
    return `
    <article class="lcard" id="card-${index}" style="--t:${tm.color}">
      <div class="row" style="justify-content:space-between">
        <span class="lcard-no">CHUYÊN ĐỀ #${String(index + 1).padStart(2, '0')} · ${escapeText(tm.name.toUpperCase())}</span>
        ${topicChipHtml(lesson.topic || tm.key, false)}
      </div>
      <h3><span class="md inline">${renderInlineMarkdown(lesson.title || '')}</span></h3>
      <p><span class="md inline">${renderInlineMarkdown(lesson.summary || '')}</span></p>
      <div class="row" style="margin-top:auto;padding-top:6px">
        <button class="btn sm secondary lesson-toggle" type="button" data-index="${index}">📖 Xem nội dung chuyên đề${exCount ? ` (${exCount} bài tập)` : ''}</button>
        <a class="btn sm ghost" href="/pages/practice.html?topic=${encodeURIComponent(tm.key)}">Luyện ${escapeText(tm.name)} →</a>
      </div>
      <div id="lesson-${index}" hidden class="lesson-body" style="margin-top:14px"></div>
    </article>`;
  }).join('');

  place.querySelectorAll('.lesson-toggle').forEach(button => {
    button.onclick = () => {
      const idx = Number(button.dataset.index);
      const lesson = matches[idx];
      const body = document.getElementById('lesson-' + idx);
      const card = document.getElementById('card-' + idx);
      if (!lesson || !body) return;
      const tm = topicInfo(lesson.topic || '');
      const exCount = Array.isArray(lesson.examples) ? lesson.examples.length : 0;
      body.hidden = !body.hidden;
      if (card) card.classList.toggle('is-open', !body.hidden);
      if (!body.hidden) {
        button.textContent = '▲ Thu gọn chuyên đề';
        const examplesHtml = exCount ? `
          <div style="margin-top:18px">
            <h4 style="margin:0 0 10px;color:#1f1a10;font-family:var(--display);font-size:15px">BÀI TẬP ÁP DỤNG (${exCount})</h4>
            <ol class="de-list">
              ${lesson.examples.map((ex, i) => `
                <li class="scroll prob" style="--c:${tm.color}">
                  <div class="prob-head"><b class="plabel">Ví dụ ${i + 1}</b></div>
                  <div class="md question-text">${renderMarkdown(ex.text || '')}</div>
                </li>`).join('')}
            </ol>
          </div>` : '';
        body.innerHTML = `
          <div class="scroll" style="background:#fffdf7;color:#1f1a10;border:3px solid var(--ink);box-shadow:4px 4px 0 var(--ink);border-radius:10px;padding:18px">
            <div class="md question-text">${renderMarkdown(lesson.body || lesson.summary || '')}</div>
          </div>
          ${examplesHtml}`;
        renderMath();
      } else {
        button.textContent = `📖 Xem nội dung chuyên đề${exCount ? ` (${exCount} bài tập)` : ''}`;
      }
    };
  });

  renderMath();
}

// ===================== Nạp dữ liệu =====================
(async function loadLessons() {
  try {
    const data = await api('/api/lessons');
    lessons = data.items || [];
    syncHeader();
    showLessons();
  } catch (error) {
    place.innerHTML = `<p class="empty" style="grid-column:1/-1">${escapeText(error.message)}</p>`;
  }
})();

if (searchInput) searchInput.oninput = showLessons;
