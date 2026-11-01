// account.js — đăng nhập / đăng ký.

const form = document.getElementById('account-form');

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
    setTimeout(() => { location.href = '/'; }, 700);
  } catch (error) {
    if (submitButton) submitButton.disabled = false;
    showMessage(message, error.message);
  }
};
