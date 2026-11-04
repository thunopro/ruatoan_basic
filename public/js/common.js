// common.js — thanh điều hướng chung, linh vật Rùa Toán, Markdown + MathJax, Lightbox & helpers.

// ===================== Danh mục Chuyên đề & Loại đề =====================
const CLANS = {
  lam: { mask: '#2f8cff', deep: '#0b3d91' },
  xich: { mask: '#ff3b3b', deep: '#8f0d16' },
  tu: { mask: '#a15bff', deep: '#4a1a99' },
  cam: { mask: '#ff8a1f', deep: '#9a4300' }
};

const TOPIC_META = [
  { key: 'so-hoc', name: 'Số học', clan: 'cam', icon: '#', color: '#ff8a1f', ti: '#5a2800', desc: 'Chia hết, đồng dư, số nguyên tố, số chính phương, nghiệm nguyên.' },
  { key: 'dai-so', name: 'Đại số', clan: 'tu', icon: 'x²', color: '#9b5cff', ti: '#35107a', desc: 'Biến đổi, căn thức, đa thức, phương trình và hệ phương trình.' },
  { key: 'bat-dang-thuc', name: 'Bất đẳng thức', clan: 'xich', icon: '≥', color: '#ff3b3b', ti: '#6b0710', desc: 'AM-GM, Cauchy–Schwarz, tìm giá trị lớn nhất, nhỏ nhất.' },
  { key: 'hinh-hoc', name: 'Hình học', clan: 'lam', icon: '△', color: '#2f8cff', ti: '#062a66', desc: 'Tam giác, đường tròn, tứ giác nội tiếp, quỹ tích.' },
  { key: 'to-hop', name: 'Tổ hợp', clan: 'cam', icon: 'n!', color: '#ff6a3d', ti: '#5c1a04', desc: 'Dirichlet, bất biến, cực hạn, đếm, trò chơi, tô màu.' }
];
const TOPIC_MAP = Object.fromEntries(TOPIC_META.map(t => [t.key, t]));

const TOPIC_CATEGORIES = {
  'phuong-trinh': 'dai-so', 'he-phuong-trinh': 'dai-so', 'da-thuc': 'dai-so',
  'nghiem-nguyen': 'so-hoc', 'chia-het': 'so-hoc', 'so-nguyen-to': 'so-hoc', 'dong-du': 'so-hoc',
  'tam-giac-dong-dang': 'hinh-hoc', 'tu-giac-noi-tiep': 'hinh-hoc',
  'duong-tron': 'hinh-hoc', 'cuc-tri-hinh-hoc': 'hinh-hoc',
  dirichlet: 'to-hop', 'nguyen-ly-cuc-han': 'to-hop', 'roi-rac': 'to-hop'
};

const TOPIC_LABELS = {
  'so-hoc': 'Số học', 'dai-so': 'Đại số', 'bat-dang-thuc': 'Bất đẳng thức',
  'hinh-hoc': 'Hình học', 'to-hop': 'Tổ hợp',
  'phuong-trinh': 'Phương trình', 'he-phuong-trinh': 'Hệ phương trình', 'da-thuc': 'Đa thức',
  'nghiem-nguyen': 'Nghiệm nguyên', 'chia-het': 'Chia hết', 'so-nguyen-to': 'Số nguyên tố', 'dong-du': 'Đồng dư',
  'tam-giac-dong-dang': 'Tam giác đồng dạng', 'tu-giac-noi-tiep': 'Tứ giác nội tiếp',
  'duong-tron': 'Đường tròn', 'cuc-tri-hinh-hoc': 'Cực trị hình học',
  dirichlet: 'Nguyên lý Dirichlet', 'nguyen-ly-cuc-han': 'Nguyên lý cực hạn', 'roi-rac': 'Toán rời rạc'
};

const KIND_META = {
  hsg: { cls: 'stamp-hsg', stamp: 'HSG', long: 'Đề thi học sinh giỏi' },
  chuyen: { cls: 'stamp-chuyen', stamp: 'VÀO 10', long: 'Đề thi vào 10 chuyên' },
  tapchi: { cls: 'stamp-tapchi', stamp: 'TẠP CHÍ', long: 'Bài toán trên tạp chí' },
  chuyende: { cls: 'stamp-chuyende', stamp: 'CHUYÊN ĐỀ', long: 'Bài tập chuyên đề' },
  olympic: { cls: 'stamp-olympic', stamp: 'OLYMPIC', long: 'Đề Olympic' }
};

function canonicalTopic(topic) {
  const key = String(topic || '').trim();
  return TOPIC_CATEGORIES[key] || key;
}

function topicLabel(topic) {
  const key = String(topic || '').trim();
  return TOPIC_LABELS[key] || key.replaceAll('-', ' ');
}

function topicInfo(topic) {
  const cat = canonicalTopic(topic);
  return TOPIC_MAP[cat] || TOPIC_MAP['hinh-hoc'];
}

window.TOPIC_META = TOPIC_META;
window.TOPIC_MAP = TOPIC_MAP;
window.KIND_META = KIND_META;
window.canonicalTopic = canonicalTopic;
window.topicLabel = topicLabel;
window.topicInfo = topicInfo;

// ===================== Linh vật Rùa Toán SVG (bản gốc) =====================
function turtleSvg(clan = 'lam', size = 120, className = '', mood = 'happy') {
  const mask = (CLANS[clan] || CLANS.lam).mask;
  const ink = '#0d1a0f';
  const h = Math.round(size * 1.05 * 10) / 10;
  const cls = className ? ` class="${escapeText(className)}"` : '';
  const eyes = mood === 'dizzy'
    ? `<g stroke="${ink}" stroke-width="5" stroke-linecap="round"><path d="M68 64l20 18M88 64l-20 18M112 64l20 18M132 64l-20 18"/></g>`
    : `<g>
        <path d="${mood === 'focus' ? 'M64 70Q78 60 92 68Q88 86 74 84Q64 80 64 70Z' : 'M65 73a13 14 0 1 0 26 0a13 14 0 1 0-26 0Z'}" fill="#fff" stroke="${ink}" stroke-width="3.5"/>
        <path d="${mood === 'focus' ? 'M136 70Q122 60 108 68Q112 86 126 84Q136 80 136 70Z' : 'M109 73a13 14 0 1 0 26 0a13 14 0 1 0-26 0Z'}" fill="#fff" stroke="${ink}" stroke-width="3.5"/>
        <circle cx="81" cy="75" r="6.5" fill="${ink}"/>
        <circle cx="119" cy="75" r="6.5" fill="${ink}"/>
        <circle cx="83.5" cy="72" r="2.2" fill="#fff"/>
        <circle cx="121.5" cy="72" r="2.2" fill="#fff"/>
      </g>`;
  const mouth = mood === 'dizzy'
    ? `<path d="M86 106Q93 100 100 106Q107 112 114 106" stroke="${ink}" stroke-width="4" fill="none" stroke-linecap="round"/>`
    : `<path d="M84 100Q100 116 116 100" stroke="${ink}" stroke-width="4.5" fill="${mood === 'happy' ? '#7a1f2b' : 'none'}" stroke-linecap="round" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 200 210" width="${size}" height="${h}"${cls} aria-hidden="true">
    <ellipse cx="100" cy="201" rx="64" ry="8" fill="rgba(0,0,0,.35)"/>
    <path d="M150 64C170 48 190 52 199 66C185 67 172 72 157 82Z" fill="${mask}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M152 78C176 84 190 100 188 124C177 110 163 100 147 93Z" fill="${mask}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
    <ellipse cx="100" cy="152" rx="63" ry="50" fill="#7b5a2c" stroke="${ink}" stroke-width="5"/>
    <path d="M44 150Q40 124 56 108M156 150Q160 124 144 108" stroke="#a57a3d" stroke-width="5" fill="none" stroke-linecap="round"/>
    <path d="M52 128C32 136 26 158 34 176" stroke="${ink}" stroke-width="21" fill="none" stroke-linecap="round"/>
    <path d="M52 128C32 136 26 158 34 176" stroke="#5cc85a" stroke-width="12" fill="none" stroke-linecap="round"/>
    <path d="M148 128C168 136 174 158 166 176" stroke="${ink}" stroke-width="21" fill="none" stroke-linecap="round"/>
    <path d="M148 128C168 136 174 158 166 176" stroke="#5cc85a" stroke-width="12" fill="none" stroke-linecap="round"/>
    <ellipse cx="74" cy="192" rx="21" ry="12" fill="#5cc85a" stroke="${ink}" stroke-width="4.5"/>
    <ellipse cx="126" cy="192" rx="21" ry="12" fill="#5cc85a" stroke="${ink}" stroke-width="4.5"/>
    <path d="M58 118Q100 104 142 118Q152 162 128 190Q100 200 72 190Q48 162 58 118Z" fill="#f4d27a" stroke="${ink}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M60 142Q100 152 140 142M62 166Q100 176 138 166M100 112V194" stroke="#c39a45" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M55 132Q100 146 145 132L146 146Q100 160 54 146Z" fill="${mask}" stroke="${ink}" stroke-width="4" stroke-linejoin="round"/>
    <circle cx="100" cy="148" r="8" fill="${mask}" stroke="${ink}" stroke-width="4"/>
    <ellipse cx="100" cy="72" rx="60" ry="52" fill="#5cc85a"/>
    <path d="M46 92Q100 138 154 92Q150 118 100 124Q52 118 46 92Z" fill="#46a646"/>
    <path d="M40 58Q100 42 160 58L160 91Q100 79 40 91Z" fill="${mask}"/>
    <path d="M40 58Q100 42 160 58" stroke="rgba(255,255,255,.35)" stroke-width="3" fill="none"/>
    ${eyes}
    <ellipse cx="100" cy="72" rx="60" ry="52" fill="none" stroke="${ink}" stroke-width="5"/>
    <ellipse cx="72" cy="36" rx="15" ry="7" fill="#fff" opacity=".28" transform="rotate(-22 72 36)"/>
    <circle cx="62" cy="100" r="7" fill="#ff8fa3" opacity=".55"/>
    <circle cx="138" cy="100" r="7" fill="#ff8fa3" opacity=".55"/>
    ${mouth}
  </svg>`;
}
window.turtleSvg = turtleSvg;

// ===================== Helpers chung =====================

// escapeText: mọi dữ liệu từ API chèn vào HTML đều phải đi qua hàm này.
function escapeText(text) {
  const box = document.createElement('span');
  box.textContent = text == null ? '' : String(text);
  return box.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

// foldText: chuẩn hóa tiếng Việt không dấu để tìm kiếm phía client.
function foldText(value) {
  return String(value == null ? '' : value)
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}
window.foldText = foldText;

// topicChipHtml: tạo thẻ chip chủ đề có màu và biểu tượng chuẩn.
function topicChipHtml(rawTopic, asLink = true) {
  if (!rawTopic) return '';
  const tm = topicInfo(rawTopic);
  const label = topicLabel(rawTopic);
  const style = `--c:${tm.color};--ci:${tm.ti}`;
  const inner = `<b aria-hidden="true">${escapeText(tm.icon)}</b><span>${escapeText(label)}</span>`;
  if (asLink) {
    return `<a class="chip" style="${style}" href="/pages/practice.html?topic=${encodeURIComponent(tm.key)}">${inner}</a>`;
  }
  return `<span class="chip" style="${style}">${inner}</span>`;
}
window.topicChipHtml = topicChipHtml;

// ===================== Markdown + LaTeX an toàn =====================
function _formatTextSegment(raw) {
  return escapeText(raw)
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<i>$2</i>')
    .replace(/\n/g, '<br>');
}

function renderInlineMarkdown(src) {
  if (!src) return '';
  const s = String(src).replace(/\r/g, '');
  const out = [];
  const re = /\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\$([^$\n]+?)\$|\\\(([\s\S]+?)\\\)/g;
  let last = 0;
  let m;
  while ((m = re.exec(s)) !== null) {
    out.push(_formatTextSegment(s.slice(last, m.index)));
    if (m[1] !== undefined || m[2] !== undefined) {
      const tex = m[1] !== undefined ? m[1] : m[2];
      out.push(`<span class="mathd" style="display:block">$$${escapeText(tex)}$$</span>`);
    } else {
      const tex = m[3] !== undefined ? m[3] : m[4];
      out.push(`<span class="mathi">$${escapeText(tex)}$</span>`);
    }
    last = re.lastIndex;
  }
  out.push(_formatTextSegment(s.slice(last)));
  return out.join('');
}

function _isListItem(line) {
  return /^\s*[-•]\s+/.test(line);
}

function _renderBlock(blockText) {
  const lines = blockText.split('\n');
  if (lines.every(_isListItem)) {
    return `<ul>${lines.map(l => `<li>${renderInlineMarkdown(l.replace(/^\s*[-•]\s+/, ''))}</li>`).join('')}</ul>`;
  }
  if (lines.length > 1 && lines.every(l => /^\s*\|.*\|\s*$/.test(l))) {
    const rows = lines
      .filter(l => !/^\s*\|[\s:|-]+\|\s*$/.test(l))
      .map(l => l.trim().slice(1, -1).split('|'));
    return `<div class="tbl"><table>${rows.map((r, i) => `<tr>${r.map(c => (i ? `<td>${renderInlineMarkdown(c.trim())}</td>` : `<th>${renderInlineMarkdown(c.trim())}</th>`)).join('')}</tr>`).join('')}</table></div>`;
  }
  const h = blockText.match(/^(#{1,3})\s+(.*)$/);
  if (h && lines.length === 1) {
    const level = Math.min(5, h[1].length + 2);
    return `<h${level}>${renderInlineMarkdown(h[2])}</h${level}>`;
  }
  if (!blockText.includes('$$') && lines.some(_isListItem) && !lines.every(_isListItem)) {
    const runs = [];
    for (const l of lines) {
      const last = runs[runs.length - 1];
      if (last && _isListItem(last[0]) === _isListItem(l)) last.push(l);
      else runs.push([l]);
    }
    return runs.map(r => _renderBlock(r.join('\n'))).join('');
  }
  return `<p>${renderInlineMarkdown(blockText)}</p>`;
}

function renderMarkdown(src) {
  if (!src) return '';
  return String(src)
    .replace(/\r/g, '')
    .replace(/^(#{1,3}\s+.*)$/gm, '\n$1\n')
    .trim()
    .split(/\n\s*\n/)
    .map(b => b.replace(/^\n+|\n+$/g, ''))
    .filter(Boolean)
    .map(_renderBlock)
    .join('');
}
window.renderMarkdown = renderMarkdown;
window.renderInlineMarkdown = renderInlineMarkdown;

// ===================== Thanh điều hướng =====================
const nav = document.getElementById('site-header');
if (nav) {
  const path = location.pathname;
  const navItems = [
    { href: '/pages/practice.html', label: 'Luyện bài' },
    { href: '/pages/exams.html', label: 'Đề thi' },
    { href: '/pages/lesson.html', label: 'Chuyên đề' },
    { href: '/pages/library.html', label: 'Sách' },
    { href: '/pages/submissions.html', label: 'Bài nộp' }
  ];
  nav.innerHTML = `
<a href="#main" class="skip">Bỏ qua điều hướng</a>
<header class="top">
  <div class="top-in">
    <a class="brand" aria-label="Rùa Toán — trang chủ" href="/">
      ${turtleSvg('lam', 40, 'brand-art', 'happy')}
      <span class="brand-name">Rùa <b>Toán</b></span>
    </a>
    <nav class="nav" aria-label="Điều hướng chính">
      ${navItems.map(item => {
        const active = path === item.href;
        return `<a href="${item.href}"${active ? ' class="on" aria-current="page"' : ''}>${item.label}</a>`;
      }).join('')}
    </nav>
    <span id="account-link" class="auth-controls"></span>
  </div>
  <svg class="ooze-drip" viewBox="0 0 1200 28" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0H1200V8C1170 8 1165 22 1150 22S1132 8 1100 8 1010 12 990 12 975 26 960 26 944 12 920 10 760 8 740 8 728 18 716 18 703 8 690 8 520 8 500 10 488 24 474 24 460 10 440 9 300 8 280 8 270 16 260 16 250 8 238 8 130 8 110 10 100 21 88 21 76 10 60 9L0 8Z"></path></svg>
</header>`;
  loadAccount();
}

async function loadAccount() {
  const place = document.getElementById('account-link');
  if (!place) return;
  try {
    const response = await fetch('/api/me');
    if (!response.ok) throw new Error('me ' + response.status);
    const data = await response.json();
    if (data && data.user) {
      place.innerHTML = `<span class="auth-name" title="${escapeText(data.user.email || data.user.name)}">🐢 ${escapeText(data.user.name)}</span><a class="btn sm ghost auth-login" href="#" id="logout">Đăng xuất</a>`;
      wireLogout(place.querySelector('#logout'));
    } else {
      place.innerHTML = '<a class="btn sm auth-login" href="/pages/login.html">Đăng nhập</a>';
    }
  } catch (error) {
    place.innerHTML = '<a class="btn sm auth-login" href="/pages/login.html">Đăng nhập</a>';
  }
}

function wireLogout(logout) {
  if (!logout) return;
  logout.addEventListener('click', async event => {
    event.preventDefault();
    logout.style.pointerEvents = 'none';
    logout.textContent = 'Đang đăng xuất…';
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Đăng xuất thất bại.');
      location.href = '/';
    } catch (error) {
      logout.style.pointerEvents = '';
      logout.textContent = 'Thử lại';
    }
  });
}

// safeUrl: chỉ cho phép http(s):// hoặc đường dẫn nội bộ '/', chặn javascript:.
function safeUrl(url) {
  const value = String(url == null ? '' : url).trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (value === '/' || /^\/[^/]/.test(value)) return value;
  return '#';
}

// api: fetch + check response.ok + parse json, lỗi kèm message + .status để phân biệt 404/401/500.
async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(path, options);
  } catch (error) {
    const err = new Error('Không kết nối được máy chủ. Kiểm tra mạng rồi thử lại.');
    err.status = 0;
    throw err;
  }
  if (!response.ok) {
    let detail = '';
    try {
      const data = await response.json();
      detail = data.detail || data.message || '';
    } catch (error) { /* body không phải JSON */ }
    const err = new Error(detail || 'Yêu cầu thất bại (mã ' + response.status + ').');
    err.status = response.status;
    throw err;
  }
  return response.json();
}

// readSaved / writeSaved: đọc-ghi localStorage an toàn (JSON hỏng thường trả về []).
function readSaved(key = 'savedProblems') {
  try {
    const items = JSON.parse(localStorage.getItem(key) || '[]');
    return Array.isArray(items) ? items : [];
  } catch (error) {
    return [];
  }
}
function writeSaved(items, key = 'savedProblems') {
  try {
    localStorage.setItem(key, JSON.stringify(items));
    return true;
  } catch (error) {
    return false;
  }
}

// showMessage: ghi thông báo vào một phần tử (#message hoặc container).
function showMessage(place, text, good = false) {
  if (!place) return;
  place.textContent = text;
  place.className = 'message ' + (good ? 'success' : 'error');
  place.hidden = !text;
}

// ===================== Lightbox xem ảnh bài làm =====================
function openLightbox(src, caption = '') {
  const existing = document.getElementById('rt-lightbox');
  if (existing) existing.remove();
  const box = document.createElement('div');
  box.id = 'rt-lightbox';
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.setAttribute('aria-label', caption || 'Xem ảnh bài làm');
  box.innerHTML = `
    <img src="${safeUrl(src)}" alt="${escapeText(caption || 'Ảnh bài làm')}">
    <div class="row">
      ${caption ? `<span class="small" style="color:#fff;font-weight:700">${escapeText(caption)}</span>` : ''}
      <a class="btn sm ghost" href="${safeUrl(src)}" target="_blank" rel="noopener">Mở tab mới ↗</a>
      <button type="button" class="btn sm primary" id="rt-lightbox-close">Đóng (Esc)</button>
    </div>`;
  const close = () => {
    box.remove();
    document.removeEventListener('keydown', onKey);
  };
  const onKey = e => { if (e.key === 'Escape') close(); };
  box.addEventListener('click', e => {
    if (e.target === box || e.target.id === 'rt-lightbox-close') close();
  });
  document.addEventListener('keydown', onKey);
  document.body.appendChild(box);
}
window.openLightbox = openLightbox;

// ===================== MathJax =====================
let mathjaxResolve;
const mathjaxReadyPromise = new Promise(resolve => { mathjaxResolve = resolve; });
setTimeout(() => mathjaxResolve(), 15000);

window.MathJax = {
  tex: {
    inlineMath: [['$', '$'], ['\\(', '\\)']],
    displayMath: [['$$', '$$'], ['\\[', '\\]']]
  },
  startup: {
    typeset: false,
    ready: () => {
      window.MathJax.startup.defaultReady();
      mathjaxResolve();
    }
  }
};

const mathScript = document.createElement('script');
mathScript.async = true;
mathScript.src = 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js';
document.head.appendChild(mathScript);

// compressImage: nén ảnh phía trình duyệt (đen trắng, tăng tương phản, thu nhỏ cạnh dài
// tối đa 1000px, WebP với JPEG dự phòng) — giống hành vi của bản Rùa Toán gốc.
async function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được ảnh.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Ảnh không hợp lệ.'));
      img.onload = () => {
        const maxEdge = 1000;
        let w = img.width, h = img.height;
        if (Math.max(w, h) > maxEdge) {
          const scale = maxEdge / Math.max(w, h);
          w = Math.round(w * scale);
          h = Math.round(h * scale);
        }
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const imageData = ctx.getImageData(0, 0, w, h);
        const d = imageData.data;
        for (let i = 0; i < d.length; i += 4) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          const c = Math.min(255, Math.max(0, (gray - 128) * 1.35 + 128));
          d[i] = d[i + 1] = d[i + 2] = c;
        }
        ctx.putImageData(imageData, 0, 0);
        canvas.toBlob(blob => {
          if (blob) resolve(blob);
          else canvas.toBlob(b2 => b2 ? resolve(b2) : reject(new Error('Không nén được ảnh.')), 'image/jpeg', 0.82);
        }, 'image/webp', 0.82);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

// renderMath: mọi trang đều gọi được an toàn — tự chờ MathJax sẵn sàng trước khi typeset.
async function renderMath() {
  try {
    if (window.MathJax && window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise();
      return;
    }
    await mathjaxReadyPromise;
    if (window.MathJax && window.MathJax.typesetPromise) {
      await window.MathJax.typesetPromise();
    }
  } catch (error) {
    // CDN lỗi: giữ công thức dạng chữ, không làm hỏng trang.
  }
}
