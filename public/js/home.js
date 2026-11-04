// home.js — trang chủ: bộ tứ Rùa Toán, thống kê, bài hôm nay, bài đã đánh dấu, chuyên đề, đề mới.

// ===================== Bộ tứ Rùa Toán trên Hero =====================
function initHeroArt() {
  const heroArt = document.getElementById('hero-art');
  if (heroArt && typeof turtleSvg === 'function') {
    heroArt.innerHTML = [
      turtleSvg('xich', 128, 't t2', 'focus'),
      turtleSvg('lam', 176, 't t1', 'happy'),
      turtleSvg('tu', 128, 't t3', 'happy'),
      turtleSvg('cam', 112, 't t4', 'happy')
    ].join('');
  }
  const dailyTurtle = document.getElementById('daily-turtle');
  if (dailyTurtle && typeof turtleSvg === 'function') {
    dailyTurtle.innerHTML = turtleSvg('lam', 110, '', 'focus');
  }
}

// ===================== Thống kê & Chuyên đề =====================
async function loadStats() {
  try {
    const stats = await api('/api/stats');
    const statEls = document.querySelectorAll('#stats .stat');
    const values = [stats.problems, stats.collections, stats.docs, stats.books];
    statEls.forEach((el, i) => {
      const b = el.querySelector('b');
      if (b && values[i] != null) b.textContent = Number(values[i]).toLocaleString('vi-VN');
    });
    const tc = stats.topics || {};
    const topicsPlace = document.getElementById('topics');
    if (topicsPlace) {
      topicsPlace.innerHTML = TOPIC_META.map(t => `
        <a class="topic" style="--t:${t.color};--ti:${t.ti}" href="/pages/practice.html?topic=${encodeURIComponent(t.key)}">
          <b class="topic-icon" aria-hidden="true">${escapeText(t.icon)}</b>
          <span>
            <strong>${escapeText(t.name)}</strong>
            <small>${Number(tc[t.key] || 0).toLocaleString('vi-VN')} bài · ${escapeText(t.desc)}</small>
          </span>
        </a>`).join('');
    }
  } catch (error) {
    // giữ số mặc định
  }
}

// ===================== Bài hôm nay =====================
async function loadDaily() {
  const sectionEl = document.getElementById('daily-section');
  const turtleEl = document.getElementById('daily-turtle');
  const dateEl = document.getElementById('daily-date');
  const labelEl = document.getElementById('daily-label');
  const topicsEl = document.getElementById('daily-topics');
  const textEl = document.getElementById('daily-text');
  const sourceEl = document.getElementById('daily-source');
  const linkEl = document.getElementById('daily-link');
  const saveBtn = document.getElementById('daily-save');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('vi-VN');
  try {
    const data = await api('/api/daily');
    if (!data || !data.problem) return;
    const p = data.problem;
    const c = data.collection || {};
    if (labelEl) labelEl.textContent = p.label || 'Bài hôm nay';
    if (textEl) textEl.innerHTML = renderMarkdown(p.text || '');
    if (sourceEl) {
      sourceEl.textContent = c.title ? (c.title + (c.grade ? ' · Lớp ' + c.grade : '') + (c.year ? ' · ' + c.year : '')) : '';
    }
    if (linkEl && c.id) {
      linkEl.href = '/pages/exams.html?id=' + encodeURIComponent(c.id) + (p.id ? '#' + encodeURIComponent(p.id) : '');
    }
    const rawTopics = (p.topics && p.topics.length) ? p.topics : ['hinh-hoc'];
    const mainTm = topicInfo(rawTopics[0]);
    if (sectionEl) sectionEl.style.setProperty('--c', mainTm.color);
    if (turtleEl) turtleEl.innerHTML = turtleSvg(mainTm.clan, 110, '', 'focus');
    if (topicsEl) {
      const seen = new Set();
      topicsEl.innerHTML = rawTopics.filter(t => {
        const k = canonicalTopic(t);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      }).map(t => topicChipHtml(t, true)).join('');
    }
    if (saveBtn && p.id) {
      saveBtn.hidden = false;
      saveBtn.dataset.id = p.id;
      const syncSaveLabel = () => {
        const marked = readSaved().some(x => x.id === p.id);
        saveBtn.textContent = marked ? '✓ Đã đánh dấu' : 'Đánh dấu';
      };
      syncSaveLabel();
      saveBtn.onclick = () => {
        const items = readSaved();
        const idx = items.findIndex(x => x.id === p.id);
        if (idx >= 0) items.splice(idx, 1);
        else items.push({ id: p.id, collectionId: c.id || '', title: c.title || 'Bài hôm nay', label: p.label || 'Bài' });
        writeSaved(items);
        syncSaveLabel();
        drawSaved();
      };
    }
    renderMath();
  } catch (error) {
    if (textEl) textEl.textContent = error.message;
  }
}

// ===================== Đề mới =====================
async function loadRecent() {
  const place = document.getElementById('recent');
  if (!place) return;
  try {
    const data = await api('/api/collections?limit=6');
    const items = data.items || [];
    place.innerHTML = items.map(c => {
      const km = KIND_META[c.kind] || { cls: 'stamp-hsg', stamp: (c.kind || 'ĐỀ').toUpperCase() };
      const gradeLabel = c.grade === 10 ? 'Vào 10' : ('Lớp ' + escapeText(c.grade || '?'));
      return `
      <a class="ccard" href="/pages/exams.html?id=${encodeURIComponent(c.id)}">
        <div class="ccard-head">
          <span class="stamp ${km.cls}">${escapeText(km.stamp)}</span>
          <span class="ccard-meta">${gradeLabel}${c.year ? ' · ' + escapeText(c.year) : ''}</span>
        </div>
        <h3>${escapeText(c.title)}</h3>
        <p class="muted small">${escapeText(c.itemSummary || '')}</p>
      </a>`;
    }).join('');
  } catch (error) {
    place.innerHTML = `<p class="empty">${escapeText(error.message)}</p>`;
  }
}

// ===================== Bài đã đánh dấu (FR8) =====================
function drawSaved() {
  const section = document.getElementById('saved-section');
  const list = document.getElementById('saved-list');
  const clearBtn = document.getElementById('clear-saved');
  if (!section || !list) return;
  const items = readSaved();
  if (!items.length) {
    section.hidden = true;
    list.innerHTML = '';
    return;
  }
  section.hidden = false;
  list.innerHTML = items.map(item => {
    const href = item.collectionId
      ? `/pages/exams.html?id=${encodeURIComponent(item.collectionId)}#${encodeURIComponent(item.id || '')}`
      : `/pages/practice.html?search=${encodeURIComponent(item.title || '')}`;
    return `
    <div class="mini">
      <div class="row" style="justify-content:space-between;align-items:flex-start">
        <b><a href="${href}" style="color:inherit;text-decoration:none">${escapeText(item.label || 'Bài tập')}</a></b>
        <button type="button" class="btn sm secondary remove-saved" data-id="${escapeText(item.id)}" aria-label="Bỏ đánh dấu ${escapeText(item.label || '')}" style="padding:2px 8px;font-size:11px">✕</button>
      </div>
      <a href="${href}" class="mini-text" style="color:inherit;text-decoration:none">${escapeText(item.title || 'Mở đề gốc')}</a>
    </div>`;
  }).join('');
  list.querySelectorAll('.remove-saved').forEach(btn => {
    btn.onclick = () => {
      const next = readSaved().filter(x => x.id !== btn.dataset.id);
      writeSaved(next);
      drawSaved();
      const dailySave = document.getElementById('daily-save');
      if (dailySave && dailySave.dataset.id) {
        const marked = next.some(x => x.id === dailySave.dataset.id);
        dailySave.textContent = marked ? '✓ Đã đánh dấu' : 'Đánh dấu';
      }
    };
  });
  if (clearBtn) {
    clearBtn.onclick = () => {
      writeSaved([]);
      drawSaved();
      const dailySave = document.getElementById('daily-save');
      if (dailySave && !dailySave.hidden) {
        dailySave.textContent = 'Đánh dấu';
      }
    };
  }
}

initHeroArt();
loadStats();
loadDaily();
loadRecent();
drawSaved();
