// common.js — thanh điều hướng chung + helpers dùng cho toàn bộ trang.

// ===================== Thanh điều hướng =====================
const nav = document.getElementById('site-header');
if (nav) {
  nav.innerHTML = `
<header class="top">
  <div class="top-in">
    <a class="brand" aria-label="Rùa Toán — trang chủ" href="/">
      <svg viewBox="0 0 64 64" class="brand-art" aria-hidden="true">
        <circle cx="32" cy="32" r="30" fill="#0d1a0f" />
        <ellipse cx="32" cy="33" rx="25" ry="23" fill="#7b5a2c" stroke="#b6ff3b" stroke-width="3" />
        <path d="M32 17l9 5v10l-9 5-9-5V22z" fill="#5cc85a" stroke="#0d1a0f" stroke-width="2.5" />
        <path d="M32 37v9M23 32l-9 5M41 32l9 5M23 22l-8-5M41 22l8-5M32 17v-5" stroke="#0d1a0f" stroke-width="2.5" />
        <path d="M8 27h48v8H8z" fill="#2f8cff" stroke="#0d1a0f" stroke-width="2.5" />
      </svg>
      <span class="brand-name">Rùa <b>Toán</b></span>
    </a>
    <nav class="nav" aria-label="Điều hướng chính">
      <a href="/pages/practice.html">Luyện bài</a>
      <a href="/pages/exams.html">Đề thi</a>
      <a href="/pages/lesson.html">Chuyên đề</a>
      <a href="/pages/library.html">Sách</a>
      <a href="/pages/submissions.html">Bài nộp</a>
    </nav>
    <span id="account-link"></span>
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
      place.innerHTML = '<a class="btn sm auth-login" href="/pages/submissions.html">Bài nộp</a> <a class="btn sm auth-login" href="#" id="logout">Đăng xuất (' + escapeText(data.user.name) + ')</a>';
      wireLogout(place.querySelector('#logout'));
    } else {
      place.innerHTML = '<a class="btn sm auth-login" href="/pages/login.html">Đăng nhập</a>';
    }
  } catch (error) {
    place.innerHTML = '<a class="btn sm auth-login" href="/pages/login.html">Đăng nhập</a>';
  }
}

// Nạp trạng thái đăng nhập; lỗi mạng/server vẫn hiển thị "Đăng nhập" an toàn.
// Đăng xuất: chỉ chuyển trang khi gọi API thành công; khóa nút trong lúc đang gọi.
function wireLogout(logout) {
  if (!logout) return;
  logout.addEventListener('click', async event => {
    event.preventDefault();
    logout.style.pointerEvents = 'none'; // chặn bấm lại khi đang xử lý
    logout.textContent = 'Đang đăng xuất…';
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Đăng xuất thất bại.');
      location.href = '/';
    } catch (error) {
      logout.style.pointerEvents = '';
      logout.textContent = 'Đăng xuất thất bại, thử lại';
    }
  });
}

// ===================== Helpers chung =====================

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

function canonicalTopic(topic) {
  const key = String(topic || '');
  return TOPIC_CATEGORIES[key] || key;
}

function topicLabel(topic) {
  const key = String(topic || '');
  return TOPIC_LABELS[key] || key.replaceAll('-', ' ');
}
window.topicLabel = topicLabel;

// escapeText: mọi dữ liệu từ API chèn vào HTML đều phải đi qua hàm này.
function escapeText(text) {
  const box = document.createElement('span');
  box.textContent = text == null ? '' : String(text);
  return box.innerHTML.replaceAll('"', '&quot;').replaceAll("'", '&#39;');
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
  place.className = good ? 'success' : 'error';
}

// ===================== MathJax =====================

// Promise báo hiệu MathJax đã nạp xong; renderMath() sẽ chờ promise này.
let mathjaxResolve;
const mathjaxReadyPromise = new Promise(resolve => { mathjaxResolve = resolve; });
// Nếu CDN quá 15 giây không tải được thì thôi chờ, tránh treo trang vĩnh viễn.
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

// Append script CDN SAU KHI đã đặt config + ready callback.
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
        // grayscale + contrast
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
