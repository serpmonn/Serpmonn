(function () {
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginMsg = document.getElementById('loginMsg');
  const registerMsg = document.getElementById('registerMsg');

  function showMsg(el, text, ok) {
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle('is-ok', !!ok);
  }

  function cabinetUrl(role) {
    if (role === 'publisher') return '/frontend/partners/publisher.html';
    if (role === 'admin') return '/frontend/admin/partners.html';
    return '/frontend/partners/advertiser.html';
  }

  async function api(path, body) {
    const res = await fetch('/api/partners' + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Ошибка');
    return data;
  }

  document.querySelectorAll('.partners-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.partners-tab').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const tab = btn.getAttribute('data-tab');
      loginForm.hidden = tab !== 'login';
      registerForm.hidden = tab !== 'register';
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(loginForm);
    try {
      const data = await api('/auth/login', {
        email: fd.get('email'),
        password: fd.get('password')
      });
      showMsg(loginMsg, 'Ок', true);
      location.href = cabinetUrl(data.user.role);
    } catch (err) {
      showMsg(loginMsg, err.message, false);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(registerForm);
    try {
      const data = await api('/auth/register', {
        email: fd.get('email'),
        password: fd.get('password'),
        role: fd.get('role'),
        company: fd.get('company'),
        contacts: fd.get('contacts')
      });
      showMsg(registerMsg, 'Аккаунт создан', true);
      location.href = cabinetUrl(data.user.role);
    } catch (err) {
      showMsg(registerMsg, err.message, false);
    }
  });

  fetch('/api/partners/auth/me', { credentials: 'include' })
    .then((r) => (r.ok ? r.json() : null))
    .then((data) => {
      if (data && data.user) location.replace(cabinetUrl(data.user.role));
    })
    .catch(() => {});
})();
