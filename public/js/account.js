// account.js — đăng nhập, đăng ký và đặt lại mật khẩu.

const form = document.getElementById('account-form');

if (form) {
  form.onsubmit = async event => {
    event.preventDefault();
    const fields = Object.fromEntries(new FormData(form).entries());
    const isRegister = location.pathname.endsWith('register.html');
    const message = document.getElementById('message');
    const submitButton = form.querySelector('button[type="submit"], button');
    if (submitButton) submitButton.disabled = true;
    try {
      await api(isRegister ? '/api/register' : '/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      showMessage(message, isRegister ? 'Đăng ký thành công. Đang mở trang chủ…' : 'Đăng nhập thành công. Đang mở trang chủ…', true);
      setTimeout(() => { location.href = '/'; }, 600);
    } catch (error) {
      if (submitButton) submitButton.disabled = false;
      showMessage(message, error.message);
    }
  };
}

// ===================== Quên mật khẩu / Đặt lại mật khẩu =====================
const toggleReset = document.getElementById('toggle-reset');
const resetPanel = document.getElementById('reset-panel');
const requestResetForm = document.getElementById('request-reset-form');
const confirmResetForm = document.getElementById('confirm-reset-form');
const resetMessage = document.getElementById('reset-message');
const resetTokenInput = document.getElementById('reset-token-input');

if (toggleReset && resetPanel) {
  toggleReset.onclick = e => {
    e.preventDefault();
    resetPanel.hidden = !resetPanel.hidden;
  };
}

if (requestResetForm) {
  requestResetForm.onsubmit = async e => {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(requestResetForm).entries());
    const btn = requestResetForm.querySelector('button');
    if (btn) btn.disabled = true;
    try {
      const res = await api('/api/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      if (res.token && resetTokenInput) {
        resetTokenInput.value = res.token;
        showMessage(resetMessage, 'Đã tạo mã đặt lại mật khẩu (chế độ dev đã tự điền mã bên dưới).', true);
      } else {
        showMessage(resetMessage, 'Yêu cầu đã được ghi nhận. Hãy nhập mã xác nhận bên dưới để đặt mật khẩu mới.', true);
      }
    } catch (error) {
      showMessage(resetMessage, error.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
}

if (confirmResetForm) {
  confirmResetForm.onsubmit = async e => {
    e.preventDefault();
    const fields = Object.fromEntries(new FormData(confirmResetForm).entries());
    const btn = confirmResetForm.querySelector('button');
    if (btn) btn.disabled = true;
    try {
      await api('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fields)
      });
      showMessage(resetMessage, 'Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay phía trên.', true);
      confirmResetForm.reset();
    } catch (error) {
      showMessage(resetMessage, error.message);
    } finally {
      if (btn) btn.disabled = false;
    }
  };
}
