/* NexusOps Billing - shared helpers: storage, auth, page shell, toast, confirm dialog.
   Demo only. All data lives in the browser (localStorage); there is no server. */
(function () {
  'use strict';

  // GitHub Pages serves every project of one account from the same origin,
  // so every storage key carries an app-specific prefix.
  var P = 'nexusops_billing_v1_';
  var KEYS = {
    session: P + 'session',
    customers: P + 'customers',
    invoices: P + 'invoices',
    settings: P + 'settings',
    nextInvoice: P + 'next_invoice',
    fails: P + 'login_fails',
    lock: P + 'login_lock'
  };

  // Demo credentials (fake, public). Do not reuse this password anywhere else.
  var DEMO = { email: 'admin@nexusops.io', password: 'Nexus@2026', name: 'Admin User' };
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (e) { return fallback; }
  }
  function write(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }

  function pad(n, w) { var s = String(n); while (s.length < w) s = '0' + s; return s; }
  function isoDate(d) { return d.getFullYear() + '-' + pad(d.getMonth() + 1, 2) + '-' + pad(d.getDate(), 2); }
  function today() { return isoDate(new Date()); }
  function addDays(iso, n) {
    var d = new Date(iso + 'T00:00:00');
    d.setDate(d.getDate() + n);
    return isoDate(d);
  }
  function round2(n) { return Math.round((n + Number.EPSILON) * 100) / 100; }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getSettings() {
    return read(KEYS.settings, { company: 'NexusOps Ltd', taxRate: 10, currency: 'USD' });
  }
  function money(n) {
    var cur = getSettings().currency || 'USD';
    try { return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(n); }
    catch (e) { return cur + ' ' + Number(n).toFixed(2); }
  }

  function seed() {
    if (read(KEYS.customers, null) === null) {
      write(KEYS.customers, [
        { id: 'C-001', name: 'Acme Corp', email: 'billing@acme.test', phone: '+1 555 0101' },
        { id: 'C-002', name: 'Globex Ltd', email: 'accounts@globex.test', phone: '+1 555 0102' }
      ]);
    }
    if (read(KEYS.settings, null) === null) {
      write(KEYS.settings, { company: 'NexusOps Ltd', taxRate: 10, currency: 'USD' });
    }
    if (read(KEYS.invoices, null) === null) {
      var t = today();
      write(KEYS.invoices, [{
        id: 'INV-0001', customerId: 'C-001', issueDate: t, dueDate: addDays(t, 14),
        lines: [{ description: 'Consulting', qty: 10, rate: 100 }],
        subtotal: 1000, taxRate: 10, tax: 100, total: 1100, status: 'Sent', payments: []
      }]);
      write(KEYS.nextInvoice, 2);
    }
  }
  function resetDemoData() {
    [KEYS.customers, KEYS.invoices, KEYS.settings, KEYS.nextInvoice].forEach(function (k) {
      try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
    });
    seed();
  }

  // An invoice that was sent and is past its due date is shown as Overdue.
  function effectiveStatus(inv) {
    if (inv.status === 'Sent' && inv.dueDate < today()) return 'Overdue';
    return inv.status;
  }
  function badge(status) {
    var cls = 'badge-' + String(status).toLowerCase().replace(/\s+/g, '-');
    return '<span class="badge ' + cls + '">' + esc(status) + '</span>';
  }

  /* ---------- auth ---------- */
  function getSession() {
    try {
      var raw = sessionStorage.getItem(KEYS.session) || localStorage.getItem(KEYS.session);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }
  // "Remember me" keeps the session in localStorage; otherwise it ends with the tab.
  function setSession(user, persist) {
    var json = JSON.stringify(user);
    try {
      if (persist) { localStorage.setItem(KEYS.session, json); }
      else { sessionStorage.setItem(KEYS.session, json); }
    } catch (e) { /* ignore */ }
  }
  function clearSession() {
    try { sessionStorage.removeItem(KEYS.session); localStorage.removeItem(KEYS.session); } catch (e) { /* ignore */ }
  }
  function requireAuth() {
    var s = getSession();
    if (!s) { location.replace('login.html'); return null; }
    return s;
  }
  function logout() { clearSession(); location.href = 'login.html'; }

  /* ---------- toast ---------- */
  function toast(message, type) {
    var region = document.getElementById('toast-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'toast-region';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    var el = document.createElement('div');
    el.className = 'toast ' + (type === 'error' ? 'toast-error' : 'toast-success');
    el.textContent = message;
    region.appendChild(el);
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 4500);
  }

  /* ---------- confirm dialog ---------- */
  function confirmDialog(message, confirmLabel) {
    return new Promise(function (resolve) {
      var dlg = document.createElement('dialog');
      dlg.id = 'confirm-dialog';
      dlg.setAttribute('aria-labelledby', 'confirm-message');
      dlg.innerHTML =
        '<h2 id="confirm-title">Please confirm</h2>' +
        '<p id="confirm-message">' + esc(message) + '</p>' +
        '<div class="dialog-actions">' +
        '<button type="button" class="btn" id="confirm-no">Cancel</button>' +
        '<button type="button" class="btn btn-primary" id="confirm-yes">' + esc(confirmLabel || 'Confirm') + '</button>' +
        '</div>';
      document.body.appendChild(dlg);
      function done(v) { dlg.close(); dlg.remove(); resolve(v); }
      dlg.querySelector('#confirm-yes').addEventListener('click', function () { done(true); });
      dlg.querySelector('#confirm-no').addEventListener('click', function () { done(false); });
      dlg.addEventListener('cancel', function (e) { e.preventDefault(); done(false); });
      dlg.showModal();
    });
  }

  /* ---------- page shell (sidebar + top bar) ---------- */
  var NAV = [
    ['dashboard', 'Dashboard', 'dashboard.html'],
    ['customers', 'Customers', 'customers.html'],
    ['invoices', 'Billing', 'invoices.html'],
    ['settings', 'Settings', 'settings.html']
  ];
  function mountShell(active) {
    var session = requireAuth();
    if (!session) return false;
    seed();
    var side = document.getElementById('sidebar');
    var top = document.getElementById('topbar');
    if (side) {
      side.innerHTML = '<span class="brand">NexusOps Billing</span><nav aria-label="Main">' +
        NAV.map(function (n) {
          return '<a href="' + n[2] + '"' + (n[0] === active ? ' aria-current="page"' : '') + '>' + n[1] + '</a>';
        }).join('') + '</nav>';
    }
    if (top) {
      top.innerHTML = '<span class="who">' + esc(getSettings().company) + '</span>' +
        '<span><span id="user-name" class="who">' + esc(session.name || session.email) + '</span> ' +
        '<button type="button" class="btn btn-sm" id="logout">Logout</button></span>';
      document.getElementById('logout').addEventListener('click', logout);
    }
    return true;
  }

  window.NX = {
    KEYS: KEYS, DEMO: DEMO, EMAIL_RE: EMAIL_RE,
    read: read, write: write, today: today, addDays: addDays, round2: round2, esc: esc,
    getSettings: getSettings, money: money, seed: seed, resetDemoData: resetDemoData,
    effectiveStatus: effectiveStatus, badge: badge,
    getSession: getSession, setSession: setSession, requireAuth: requireAuth, logout: logout,
    toast: toast, confirm: confirmDialog, mountShell: mountShell
  };
})();
