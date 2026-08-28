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

  function apiBase() {
    return (global.MINGLI_CONFIG && global.MINGLI_CONFIG.API_BASE || '').replace(/\/$/, '');
  }

  function friendlyNetError(e, fallback) {
    const msg = (e && e.message) || String(e || '');
    if (/Failed to fetch|NetworkError|Load failed|aborted|timeout/i.test(msg)) {
      return '无法连接后台服务。若电脑能登、手机不能：请用 Safari / Chrome 打开本页（不要用微信内置浏览器），并确认地址以 / 结尾。';
    }
    return fallback || msg || '请求失败';
  }

  async function fetchJson(path, options, timeoutMs) {
    const base = apiBase();
    if (!base) throw new Error('未配置 API 地址（请检查 js/config.js）');
    const opts = options || {};
    const headers = Object.assign({}, opts.headers || {});
    // 登录/注册用 text/plain，避免手机浏览器 CORS 预检（OPTIONS）失败。
    if (opts.body && !headers['Content-Type'] && !headers['content-type']) {
      headers['Content-Type'] = 'text/plain;charset=UTF-8';
    }
    const ctrl = typeof AbortController === 'function' ? new AbortController() : null;
    const ms = timeoutMs || 30000;
    const timer = setTimeout(() => { try { ctrl && ctrl.abort(); } catch (_) {} }, ms);
    try {
      const res = await fetch(base + path, {
        method: opts.method || 'GET',
        headers,
        body: opts.body,
        credentials: 'omit',
        cache: 'no-store',
        mode: 'cors',
        signal: ctrl ? ctrl.signal : undefined,
      });
      const data = await res.json().catch(() => ({}));
      return { res, data };
    } catch (e) {
      throw new Error(friendlyNetError(e));
    } finally {
      clearTimeout(timer);
    }
  }

  async function pingHealth() {
    const base = apiBase();
    if (!base) return { ok: false, error: '未配置 API_BASE' };
    try {
      const res = await fetch(base + '/health', { method: 'GET', credentials: 'omit', cache: 'no-store', mode: 'cors' });
      const data = await res.json().catch(() => ({}));
      return { ok: !!res.ok && data.ok !== false, status: res.status, data };
    } catch (e) {
      return { ok: false, error: String(e && e.message || e) };
    }
  }

  async function login(email, password) {
    const body = email && String(email).includes('@')
      ? { email: String(email).trim(), password }
      : { password: password || email };
    const { res, data } = await fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(data.error || '登录失败');
    if (!data.token) throw new Error('后台未返回登录凭证');
    setToken(data.token);
    return data;
  }

  async function register(email, password, inviteCode) {
    const { res, data } = await fetchJson('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email: String(email || '').trim(),
        password,
        inviteCode: String(inviteCode || '').trim(),
      }),
    });
    if (!res.ok) throw new Error(data.error || '注册失败');
    if (!data.token) throw new Error('后台未返回登录凭证');
    setToken(data.token);
    return data;
  }

  async function checkAuth() {
    const base = apiBase();
    const token = getToken();
    if (!base || !token) return false;
    try {
      const { res } = await fetchJson('/api/auth/check', {
        headers: { Authorization: 'Bearer ' + token },
      }, 8000);
      if (!res.ok) { clearToken(); return false; }
      return true;
    } catch (_) {
      return false;
    }
  }

  async function me() {
    const token = getToken();
    if (!apiBase() || !token) return null;
    try {
      const { res, data } = await fetchJson('/api/auth/me', {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) return null;
      return data;
    } catch (_) {
      return null;
    }
  }

  function logout(opts) {
    opts = opts || {};
    if (!opts.force) {
      const busy = typeof global.shouldConfirmLeave === 'function' && global.shouldConfirmLeave();
      const tip = busy
        ? '当前有未保存内容或测算结果，确定退出登录并离开？'
        : '确定退出登录并返回登录页？';
      if (!confirm(tip)) return;
    }
    global.__ALLOW_LEAVE = true;
    if (typeof global.markChartSaved === 'function') global.markChartSaved();
    clearToken();
    location.href = 'index.html';
  }

  global.MingliAuth = { getToken, setToken, clearToken, login, register, checkAuth, me, logout, pingHealth, apiBase };
})(window);
