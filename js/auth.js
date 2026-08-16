(function (global) {
  'use strict';
  const KEY = 'mingli_jwt_v2';

  function getToken() {
    try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
  }
  function setToken(t) {
    try { localStorage.setItem(KEY, t); } catch (_) {}
  }
  function clearToken() {
    try { localStorage.removeItem(KEY); } catch (_) {}
  }

  async function login(email, password) {
    const base = global.MINGLI_CONFIG?.API_BASE;
    if (!base) throw new Error('未配置 API 地址（config.js）');
    const body = email && email.includes('@')
      ? { email, password }
      : { password: password || email };
    const res = await fetch(base + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '登录失败');
    setToken(data.token);
    return data;
  }

  async function register(email, password, inviteCode) {
    const base = global.MINGLI_CONFIG?.API_BASE;
    if (!base) throw new Error('未配置 API 地址');
    const res = await fetch(base + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, inviteCode }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || '注册失败');
    setToken(data.token);
    return data;
  }

  async function checkAuth() {
    const base = global.MINGLI_CONFIG?.API_BASE;
    const token = getToken();
    if (!base || !token) return false;
    const res = await fetch(base + '/api/auth/check', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) { clearToken(); return false; }
    return true;
  }

  async function me() {
    const base = global.MINGLI_CONFIG?.API_BASE;
    const token = getToken();
    if (!base || !token) return null;
    const res = await fetch(base + '/api/auth/me', {
      headers: { Authorization: 'Bearer ' + token },
    });
    if (!res.ok) return null;
    return res.json();
  }

  function logout() {
    clearToken();
    location.href = 'index.html';
  }

  global.MingliAuth = { getToken, setToken, clearToken, login, register, checkAuth, me, logout };
})(window);
