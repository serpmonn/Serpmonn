(function () {
  const I = window.PartnersI18n;
  if (I) I.apply();

  const t = (key, vars) => (I ? I.t(key, vars) : key);
  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  const loginMsg = document.getElementById('loginMsg');
  const registerMsg = document.getElementById('registerMsg');
  const regRole = document.getElementById('regRole');

  function showMsg(el, text, ok) {
    el.hidden = false;
    el.textContent = text;
    el.classList.toggle('is-ok', !!ok);
  }

  function clearFieldErrors(form) {
    form.querySelectorAll('.partners-field-error').forEach((el) => {
      el.hidden = true;
      el.textContent = '';
    });
    form.querySelectorAll('.is-invalid').forEach((el) => el.classList.remove('is-invalid'));
  }

  function setFieldError(form, name, message) {
    const input = form.elements.namedItem(name);
    const err = form.querySelector(`.partners-field-error[data-for="${name}"]`);
    if (input && input.classList) input.classList.add('is-invalid');
    if (err) {
      err.hidden = false;
      err.textContent = message;
    }
  }

  function validateAuthForm(form, { minPassword }) {
    clearFieldErrors(form);
    const email = String(form.elements.namedItem('email')?.value || '').trim();
    const password = String(form.elements.namedItem('password')?.value || '');
    let ok = true;
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFieldError(form, 'email', t('auth.errEmail'));
      ok = false;
    }
    if (!password || (minPassword && password.length < minPassword)) {
      setFieldError(form, 'password', minPassword ? t('auth.errPasswordMin') : t('auth.errPassword'));
      ok = false;
    } else if (!password) {
      setFieldError(form, 'password', t('auth.errPassword'));
      ok = false;
    }
    return ok;
  }

  function cabinetUrl(role) {
    return I ? I.cabinetUrl(role) : (
      role === 'publisher' ? '/frontend/partners/publisher.html' :
      role === 'admin' ? '/frontend/admin/partners.html' :
      '/frontend/partners/advertiser.html'
    );
  }

  async function api(path, body) {
    const res = await fetch('/api/partners' + path, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || t('auth.error'));
    return data;
  }

  document.querySelectorAll('.partners-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.partners-tab').forEach((b) => b.classList.remove('is-active'));
      btn.classList.add('is-active');
      const tab = btn.getAttribute('data-tab');
      loginForm.hidden = tab !== 'login';
      registerForm.hidden = tab !== 'register';
      clearFieldErrors(loginForm);
      clearFieldErrors(registerForm);
      loginMsg.hidden = true;
      registerMsg.hidden = true;
    });
  });

  document.querySelectorAll('.partners-role-card').forEach((btn) => {
    btn.addEventListener('click', () => {
      const role = btn.getAttribute('data-role');
      if (!role || !regRole) return;
      regRole.value = role;
      document.querySelectorAll('.partners-role-card').forEach((b) => {
        const on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
      });
    });
  });

  const helpLink = document.getElementById('authHelpLink');
  if (helpLink && I) helpLink.href = I.helpUrl();

  document.querySelectorAll('.partners-password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const wrap = btn.closest('.partners-password');
      const input = wrap && wrap.querySelector('input');
      if (!input) return;
      const show = input.type === 'password';
      input.type = show ? 'text' : 'password';
      btn.classList.toggle('is-visible', show);
      btn.setAttribute('aria-pressed', show ? 'true' : 'false');
      const label = show ? t('auth.hidePassword') : t('auth.showPassword');
      btn.setAttribute('aria-label', label);
    });
  });

  [loginForm, registerForm].forEach((form) => {
    form.querySelectorAll('input').forEach((input) => {
      input.addEventListener('input', () => {
        input.classList.remove('is-invalid');
        const err = form.querySelector(`.partners-field-error[data-for="${input.name}"]`);
        if (err) {
          err.hidden = true;
          err.textContent = '';
        }
      });
    });
  });

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateAuthForm(loginForm, { minPassword: 0 })) return;
    const fd = new FormData(loginForm);
    try {
      const data = await api('/auth/login', {
        email: fd.get('email'),
        password: fd.get('password')
      });
      showMsg(loginMsg, t('auth.ok'), true);
      location.href = cabinetUrl(data.user.role);
    } catch (err) {
      showMsg(loginMsg, err.message, false);
    }
  });

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!validateAuthForm(registerForm, { minPassword: 8 })) return;
    const fd = new FormData(registerForm);
    try {
      const data = await api('/auth/register', {
        email: fd.get('email'),
        password: fd.get('password'),
        role: fd.get('role') || regRole.value,
        company: fd.get('company'),
        contacts: fd.get('contacts')
      });
      showMsg(registerMsg, t('auth.created'), true);
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
