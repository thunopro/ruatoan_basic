// home.js — trang chủ: thống kê, bài hôm nay, chuyên đề, đề mới, bài đã đánh dấu.

const TOPIC_META = [
  { key: 'so-hoc', name: 'Số học', icon: '#', color: '#ff8a1f', ti: '#5a2800' },
  { key: 'dai-so', name: 'Đại số', icon: 'x²', color: '#9b5cff', ti: '#35107a' },
  { key: 'bat-dang-thuc', name: 'Bất đẳng thức', icon: '≥', color: '#ff3b3b', ti: '#6b0710' },
  { key: 'hinh-hoc', name: 'Hình học', icon: '△', color: '#2f8cff', ti: '#062a66' },
  { key: 'to-hop', name: 'Tổ hợp', icon: 'n!', color: '#ff6a3d', ti: '#5c1a04' },
];
const KIND_META = {
  hsg: ['stamp-hsg', 'HSG'],
  chuyen: ['stamp-chuyen', 'VÀO 10'],
  tapchi: ['stamp-tapchi', 'TẠP CHÍ'],
  chuyende: ['stamp-chuyende', 'CHUYÊN ĐỀ'],
  olympic: ['stamp-olympic', 'OLYMPIC']
};

// ===================== Thống kê =====================
async function loadStats() {
  try {
    const stats = await api('/api/stats');
    const statEls = document.querySelectorAll('#stats .stat');
    const values = [stats.problems, stats.collections, stats.docs, stats.books];
    statEls.forEach((el, i) => {
      const b = el.querySelector('b');
      if (b) b.textContent = Number(values[i] || 0).toLocaleString('vi-VN');
    });
    const tc = stats.topics || {};
    const topicsPlace = document.getElementById('topics');
    if (topicsPlace) {
      topicsPlace.innerHTML = TOPIC_META.map(t => `
        <a class="topic" style="--t:${t.color};--ti:${t.ti}" href="/pages/practice.html?topic=${encodeURIComponent(t.key)}">
          <b class="topic-icon" aria-hidden="true">${t.icon}</b>
          <span><strong>${escapeText(t.name)}</strong><small>${Number(tc[t.key] || 0).toLocaleString('vi-VN')} bài</small></span>
        </a>`).join('');
    }
  } catch (error) {
    // giữ số mặc định
  }
}

// ===================== Bài hôm nay =====================
async function loadDaily() {
  const dateEl = document.getElementById('daily-date');
  const labelEl = document.getElementById('daily-label');
  const topicsEl = document.getElementById('daily-topics');
  const textEl = document.getElementById('daily-text');
  const sourceEl = document.getElementById('daily-source');
  const linkEl = document.getElementById('daily-link');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('vi-VN');
  try {
    const data = await api('/api/daily');
    if (!data || !data.problem) return;
    const p = data.problem;
    const c = data.collection || {};
    if (labelEl) labelEl.textContent = p.label || 'Bài hôm nay';
    if (textEl) textEl.textContent = p.text || '';
    if (sourceEl) sourceEl.textContent = c.title ? (c.title + (c.grade ? ' · Lớp ' + c.grade : '') + (c.year ? ' · ' + c.year : '')) : '';
    if (linkEl && c.id) linkEl.href = '/pages/exams.html?id=' + encodeURIComponent(c.id);
    const categoryKeys = [...new Set((p.topics || []).map(canonicalTopic))];
    const topicTags = categoryKeys.map(key => TOPIC_META.find(t => t.key === key)).filter(Boolean);
    if (topicsEl && topicTags.length) {
      topicsEl.innerHTML = topicTags.map(topic => `
        <a class="chip" style="--c:${topic.color};--ci:${topic.ti}" href="/pages/practice.html?topic=${encodeURIComponent(topic.key)}">
          <b aria-hidden="true">${escapeText(topic.icon)}</b><span>${escapeText(topic.name)}</span>
        </a>`).join('');
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
      const [stampClass, stampText] = KIND_META[c.kind] || ['stamp-hsg', 'ĐỀ'];
      return `
      <a class="ccard" href="/pages/exams.html?id=${encodeURIComponent(c.id)}">
        <div class="ccard-head"><span class="stamp ${stampClass}">${stampText}</span><span class="ccard-meta">Lớp ${escapeText(c.grade || '?')} · ${escapeText(c.year || '')}</span></div>
        <h3>${escapeText(c.title)}</h3>
        <p class="muted small">${escapeText(c.itemSummary || '')}</p>
      </a>`;
    }).join('');
  } catch (error) {
    place.innerHTML = `<p class="empty">${escapeText(error.message)}</p>`;
  }
}

// ===================== Bài đã đánh dấu =====================
function drawSaved() {
  // giữ lại cho tương thích; trang chủ mới không còn section này
}

loadStats();
loadDaily();
loadRecent();
