async function apiJson(url, options={}) {
  const response = await fetch(url, options);
  let data = {};
  try { data = await response.json(); } catch (_) {}
  if (!response.ok) throw new Error(data.message || 'Request failed.');
  return data;
}

function saveSessionUser(user) {
  window.currentUser = user;
  const navGuest = document.getElementById('navGuest');
  const navUser = document.getElementById('navUser');
  const welcome = document.getElementById('welcomeName');
  const heroSignIn = document.getElementById('heroSignIn');
  if (user) {
    if (navGuest) navGuest.classList.add('hidden');
    if (navUser) navUser.classList.remove('hidden');
    if (welcome) welcome.textContent = user.full_name;
    if (heroSignIn) heroSignIn.classList.add('hidden');
  }
}

async function loadCurrentUser() {
  try {
    const data = await apiJson('/api/auth/me');
    saveSessionUser(data.user);
    return data;
  } catch (_) {
    return null;
  }
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  location.href = '/';
}

document.addEventListener('DOMContentLoaded', async () => {
  document.querySelectorAll('#logoutBtn').forEach(btn => btn.addEventListener('click', logout));

  const loginForm = document.getElementById('loginForm');
  const registerForm = document.getElementById('registerForm');
  if (loginForm && registerForm) {
    document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active'); document.getElementById(tab.dataset.tab + 'Form').classList.add('active');
    }));

    loginForm.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = document.getElementById('loginMsg');
      try {
        const data = await apiJson('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.fromEntries(new FormData(loginForm).entries())) });
        if (data.user.role === 'admin' || data.user.role === 'staff') location.href='/admin/dashboard'; else location.href='/';
      } catch (err) { msg.textContent = err.message; msg.className='form-msg error'; }
    });

    registerForm.addEventListener('submit', async e => {
      e.preventDefault();
      const msg = document.getElementById('registerMsg');
      try {
        await apiJson('/api/auth/register', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(Object.fromEntries(new FormData(registerForm).entries())) });
        msg.textContent='Account created. Redirecting...'; msg.className='form-msg success'; setTimeout(()=>location.href='/', 500);
      } catch (err) { msg.textContent = err.message; msg.className='form-msg error'; }
    });
  } else {
    await loadCurrentUser();
  }
});
