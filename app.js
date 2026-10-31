'use strict';

/* ---------- Grundlagen ---------- */
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => {
  const a = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const r = crypto.getRandomValues(new Uint8Array(15));
  return Array.from(r, b => a[b % 36]).join('');
};
const validId = id => /^[a-z0-9]{15}$/.test(id);

const CATS = {
  buch: { label: 'Bücher', one: 'Buch' },
  spiel: { label: 'Spiele', one: 'Gesellschaftsspiel' },
  werkzeug: { label: 'Werkzeug', one: 'Werkzeug' },
  edv: { label: 'EDV', one: 'EDV-Artikel' },
  sonstiges: { label: 'Sonstiges', one: 'Gegenstand' },
};

const ICON = {
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 8v8M11 8v8M14 8v8M17 8v8"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>',
  spark: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/></svg>',
  close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  qr: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/></svg>',
};

let items = [];
let settings = { digits: 5 };
const listState = { q: '', cat: 'alle', sort: 'nummer', scroll: 0, ai: null };
let ai = { provider: 'openai', keys: {} };   // bleibt nur auf diesem Gerät
const AI_PROVIDERS = {
  openai: { label: 'ChatGPT (OpenAI)', model: 'gpt-6-luna', where: 'platform.openai.com', placeholder: 'sk-…', budget: 700000 },
  anthropic: { label: 'Claude (Anthropic)', model: 'claude-haiku-5-5', where: 'console.anthropic.com', placeholder: 'sk-ant-…', budget: 280000 },
};
const aiKeyNow = () => ai.keys[ai.provider] || '';
let currentView = '';

/* ---------- Speicher (IndexedDB, bleibt auf dem Gerät) ---------- */
const DB = (() => {
  let dbp;
  const open = () => dbp || (dbp = new Promise((res, rej) => {
    const r = indexedDB.open('inventar', 1);
    r.onupgradeneeded = () => {
      r.result.createObjectStore('items', { keyPath: 'id' });
      r.result.createObjectStore('meta');
    };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const tx = async (store, mode, fn) => {
    const db = await open();
    return new Promise((res, rej) => {
      const t = db.transaction(store, mode);
      const req = fn(t.objectStore(store));
      t.oncomplete = () => res(req ? req.result : undefined);
      t.onerror = () => rej(t.error);
      t.onabort = () => rej(t.error);
    });
  };
  return {
    all: () => tx('items', 'readonly', s => s.getAll()),
    put: it => tx('items', 'readwrite', s => s.put(it)),
    putMany: list => tx('items', 'readwrite', s => { list.forEach(it => s.put(it)); return null; }),
    del: id => tx('items', 'readwrite', s => s.delete(id)),
    clear: () => tx('items', 'readwrite', s => s.clear()),
    getMeta: k => tx('meta', 'readonly', s => s.get(k)),
    setMeta: (k, v) => tx('meta', 'readwrite', s => s.put(v, k)),
  };
})();

async function saveItem(it) {
  it.updatedAt = Date.now();
  await DB.put(it);
  const i = items.findIndex(x => x.id === it.id);
  if (i >= 0) items[i] = it; else items.push(it);
  await Sync.queue('put', it.id);
}

async function deleteItem(id) {
  await DB.del(id);
  items = items.filter(x => x.id !== id);
  await Sync.queue('del', id);
}

/* ---------- Gemeinsamer Speicher (PocketBase) ---------- */
const Sync = (() => {
  let pb = null;
  let pending = [];           // [{op:'put'|'del', id}]
  let flushing = false;
  let state = 'local';        // local | syncing | ok | offline | error | login
  let lastSync = null;
  let unsub = null;
  const listeners = new Set();

  const setState = st => { state = st; listeners.forEach(f => f()); };
  const pendingIds = () => new Set(pending.map(p => p.id));
  const toRecord = it => { const data = { ...it }; delete data.id; return { data }; };
  const fromRecord = r => ({ ...(r.data || {}), id: r.id });

  async function init() {
    pending = (await DB.getMeta('queue')) || [];
    const server = await DB.getMeta('server');
    if (server && server.url && window.PocketBase) {
      connectClient(server.url);
      if (pb.authStore.isValid) start(); else setState('login');
    }
    window.addEventListener('online', () => sync());
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') sync(); });
  }

  function connectClient(url) {
    pb = new window.PocketBase(url.replace(/\/+$/, ''));
    pb.autoCancellation(false);
  }

  async function login(url, email, password) {
    connectClient(url);
    await pb.collection('users').authWithPassword(email, password);
    await DB.setMeta('server', { url: pb.baseURL || url });
    await start(true);
  }

  async function logout() {
    if (unsub) { try { await unsub(); } catch { /* egal */ } unsub = null; }
    if (pb) pb.authStore.clear();
    await DB.setMeta('server', null);
    pb = null;
    setState('local');
  }

  async function start(firstLogin) {
    // Alte Einträge aus der reinen Handy-Version bekommen gültige IDs
    for (const it of [...items]) {
      if (validId(it.id)) continue;
      const neu = { ...it, id: uid() };
      await DB.del(it.id); await DB.put(neu);
      items = items.map(x => x.id === it.id ? neu : x);
      pending = pending.filter(p => p.id !== it.id);
      pending.push({ op: 'put', id: neu.id });
    }
    await DB.setMeta('queue', pending);
    await sync(firstLogin);
    subscribe();
  }

  async function subscribe() {
    if (!pb || unsub) return;
    try {
      unsub = await pb.collection('items').subscribe('*', async e => {
        if (pendingIds().has(e.record.id)) return;
        if (e.action === 'delete') {
          await DB.del(e.record.id);
          items = items.filter(x => x.id !== e.record.id);
        } else {
          const it = fromRecord(e.record);
          await DB.put(it);
          const i = items.findIndex(x => x.id === it.id);
          if (i >= 0) items[i] = it; else items.push(it);
        }
        refreshView();
      });
    } catch { /* Live-Aktualisierung ist ein Extra */ }
  }

  async function queue(op, id) {
    pending = pending.filter(p => p.id !== id);
    pending.push({ op, id });
    await DB.setMeta('queue', pending);
    flush();
  }

  async function flush() {
    if (!pb || !pb.authStore.isValid || flushing) return;
    if (!navigator.onLine) { setState('offline'); return; }
    flushing = true;
    setState('syncing');
    try {
      while (pending.length) {
        const job = pending[0];
        if (job.op === 'del') {
          try { await pb.collection('items').delete(job.id); }
          catch (e) { if (e.status !== 404) throw e; }
        } else {
          const it = items.find(x => x.id === job.id);
          if (it) {
            try { await pb.collection('items').update(it.id, toRecord(it)); }
            catch (e) {
              if (e.status === 404) await pb.collection('items').create({ id: it.id, ...toRecord(it) });
              else throw e;
            }
          }
        }
        pending.shift();
        await DB.setMeta('queue', pending);
      }
      lastSync = new Date();
      setState('ok');
    } catch (e) {
      handleError(e);
    } finally {
      flushing = false;
    }
  }

  function handleError(e) {
    if (e && e.status === 401) { pb.authStore.clear(); setState('login'); }
    else if (e && e.status === 403) setState('rules');
    else if (!navigator.onLine || (e && e.status === 0)) setState('offline');
    else setState('error');
  }

  let syncing = false;
  async function sync(firstLogin) {
    if (!pb || !pb.authStore.isValid || syncing) return;
    syncing = true;
    try { await doSync(firstLogin); } finally { syncing = false; }
  }

  async function doSync(firstLogin) {
    if (!navigator.onLine) { setState('offline'); return; }
    setState('syncing');
    try {
      const recs = await pb.collection('items').getFullList({ batch: 500 });
      const remote = new Map(recs.map(r => [r.id, fromRecord(r)]));
      const waiting = pendingIds();
      const synced = await DB.getMeta('synced');
      // Beim allerersten Verbinden werden die Handy-Daten hochgeladen statt verworfen
      if (firstLogin || !synced) {
        for (const it of items) if (!remote.has(it.id) && !waiting.has(it.id)) pending.push({ op: 'put', id: it.id });
        await DB.setMeta('queue', pending);
        await DB.setMeta('synced', true);
      }
      const keep = pendingIds();
      const merged = [];
      for (const [id, it] of remote) merged.push(keep.has(id) ? (items.find(x => x.id === id) || it) : it);
      for (const it of items) if (!remote.has(it.id) && keep.has(it.id)) merged.push(it);
      await DB.clear();
      await DB.putMany(merged);
      items = merged;
      refreshView();
      lastSync = new Date();
      setState('ok');
      await flush();
    } catch (e) {
      handleError(e);
    }
  }

  return {
    init, login, logout, queue, sync,
    onChange: f => listeners.add(f),
    get state() { return state; },
    get pending() { return pending.length; },
    get lastSync() { return lastSync; },
    get user() { return pb && pb.authStore.record ? (pb.authStore.record.email || pb.authStore.record.name || '') : ''; },
    get url() { return pb ? pb.baseURL : ''; },
  };
})();

function syncLabel() {
  const n = Sync.pending ? (Sync.pending === 1 ? '1 Änderung wartet' : `${Sync.pending} Änderungen warten`) : '';
  switch (Sync.state) {
    case 'local': return 'Nur auf diesem Gerät';
    case 'syncing': return 'Wird abgeglichen …';
    case 'ok': return n || 'Gemeinsam gespeichert';
    case 'offline': return n ? `Offline, ${n}` : 'Offline';
    case 'login': return 'Bitte neu anmelden (Einstellungen)';
    case 'rules': return 'Server verweigert den Zugriff (API-Regeln prüfen)';
    default: return n ? `Abgleich fehlgeschlagen, ${n}` : 'Abgleich fehlgeschlagen';
  }
}

function refreshView() {
  if (currentView === 'list') {
    if (document.activeElement && document.activeElement.id === 'q') { renderRows(); return; }
    listState.scroll = window.scrollY;
    renderList();
  } else if (currentView === 'item') {
    const id = location.hash.split('/')[2];
    renderDetail(id);
  }
}

Sync.onChange(() => {
  const el = $('#sync');
  if (el) { el.textContent = syncLabel(); el.dataset.state = Sync.state; }
  if (currentView === 'settings' && $('#sync-panel')) renderSyncPanel();
});

/* ---------- Hilfen ---------- */
function toast(msg, ms = 2800) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.t);
  toast.t = setTimeout(() => t.classList.remove('show'), ms);
}

const fmtNum = n => (n === null || n === undefined || n === '') ? '' : String(n).padStart(settings.digits, '0');
const tagHtml = (n, big) => n === null || n === undefined || n === ''
  ? `<span class="tag none${big ? ' big' : ''}">ohne Nr.</span>`
  : `<span class="tag${big ? ' big' : ''}">${fmtNum(n)}</span>`;

function parseSticker(text) {
  const m = String(text).match(/\d+/g);
  if (!m) return null;
  const raw = m.length === 1 ? m[0] : m[m.length - 1];
  return { num: parseInt(raw, 10), raw };
}

const fmtDate = t => new Date(t).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
function sinceText(t) {
  const d = Math.floor((new Date().setHours(0, 0, 0, 0) - new Date(t).setHours(0, 0, 0, 0)) / 86400000);
  return d <= 0 ? 'seit heute' : d === 1 ? 'seit gestern' : `seit ${d} Tagen`;
}
function borrowerNames() {
  const set = new Set();
  items.forEach(it => { if (it.loan) set.add(it.loan.name); (it.loans || []).forEach(l => set.add(l.name)); });
  return [...set].sort((a, b) => a.localeCompare(b, 'de'));
}

const byNumber = n => items.find(x => x.number === n);
const maxNumber = () => items.reduce((m, x) => (typeof x.number === 'number' && x.number > m ? x.number : m), -1);

function initials(t) {
  return esc((t || '?').trim().charAt(0).toUpperCase() || '?');
}

function coverHtml(it, cls) {
  const square = it.category !== 'buch' ? ' square' : '';
  const chain = [it.photo, it.cover, ...String(it.coverAlt || '').split('|')].filter(Boolean);
  const src = chain[0];
  const alt = chain.slice(1).join('|');
  if (!src) return `<div class="${cls}${square}">${initials(it.title)}</div>`;
  return `<div class="${cls}${square}" data-initial="${initials(it.title)}"><img src="${esc(src)}" ${alt ? `data-alt="${esc(alt)}"` : ''} alt="" loading="lazy" referrerpolicy="no-referrer"></div>`;
}

// Kaputte Cover: Ersatzbild versuchen, sonst Anfangsbuchstabe zeigen
document.addEventListener('error', e => {
  const img = e.target;
  if (!(img instanceof HTMLImageElement) || !img.closest('.thumb, .cover-lg')) return;
  if (img.dataset.alt) {
    const [next, ...rest] = img.dataset.alt.split('|');
    if (rest.length) img.dataset.alt = rest.join('|'); else delete img.dataset.alt;
    img.src = next; return;
  }
  const box = img.parentElement;
  box.textContent = box.dataset.initial ? new DOMParser().parseFromString(box.dataset.initial, 'text/html').body.textContent : '?';
}, true);

/* ---------- Dialoge ---------- */
function ask({ message, input = false, okLabel = 'OK', inputmode = 'text', danger = false }) {
  return new Promise(res => {
    const d = $('#dialog'), inp = $('#dlg-input'), ok = $('#dlg-ok'), cancel = $('#dlg-cancel');
    $('#dlg-msg').textContent = message;
    inp.hidden = !input; inp.value = ''; inp.inputMode = inputmode;
    ok.textContent = okLabel;
    ok.className = 'btn ' + (danger ? 'danger' : 'primary');
    d.hidden = false;
    setTimeout(() => (input ? inp : ok).focus(), 50);
    const done = v => { d.hidden = true; ok.onclick = cancel.onclick = inp.onkeydown = null; res(v); };
    ok.onclick = () => done(input ? inp.value : true);
    cancel.onclick = () => done(input ? null : false);
    inp.onkeydown = e => { if (e.key === 'Enter') { e.preventDefault(); ok.click(); } };
  });
}
const askConfirm = (message, okLabel = 'OK', danger = false) => ask({ message, okLabel, danger });
const askText = (message, inputmode = 'numeric') => ask({ message, input: true, okLabel: 'Übernehmen', inputmode });

/* ---------- ISBN ---------- */
const cleanIsbn = s => String(s || '').toUpperCase().replace(/[^0-9X]/g, '');

function validIsbn(s) {
  if (/^\d{13}$/.test(s)) {
    let sum = 0;
    for (let i = 0; i < 12; i++) sum += +s[i] * (i % 2 ? 3 : 1);
    return (10 - sum % 10) % 10 === +s[12];
  }
  if (/^\d{9}[\dX]$/.test(s)) {
    let sum = 0;
    for (let i = 0; i < 9; i++) sum += +s[i] * (10 - i);
    return (sum + (s[9] === 'X' ? 10 : +s[9])) % 11 === 0;
  }
  return false;
}

function toIsbn13(s) {
  if (s.length !== 10) return s;
  const b = '978' + s.slice(0, 9);
  let sum = 0;
  for (let i = 0; i < 12; i++) sum += +b[i] * (i % 2 ? 3 : 1);
  return b + ((10 - sum % 10) % 10);
}

async function fetchJson(url, ms = 9000) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try {
    const r = await fetch(url, { signal: c.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}

function htmlToText(h) {
  const prepared = String(h).replace(/<br\s*\/?>/gi, '\n').replace(/<\/p>/gi, '\n\n');
  return new DOMParser().parseFromString(prepared, 'text/html').body.textContent.replace(/\n{3,}/g, '\n\n').trim();
}

const year = d => (String(d || '').match(/\d{4}/) || [''])[0];

async function lookupGoogle(isbn) {
  const d = await fetchJson(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
  if (!d.items || !d.items.length) return null;
  let v = d.items[0].volumeInfo || {};
  try {
    const full = await fetchJson(d.items[0].selfLink);
    if (full.volumeInfo) v = { ...v, ...full.volumeInfo };
  } catch { /* Kurzdaten reichen auch */ }
  const img = v.imageLinks || {};
  let cover = img.large || img.medium || img.small || img.thumbnail || img.smallThumbnail || '';
  cover = cover.replace(/^http:/, 'https:').replace('&edge=curl', '');
  return {
    title: v.subtitle ? `${v.title} – ${v.subtitle}` : (v.title || ''),
    author: (v.authors || []).join(', '),
    year: year(v.publishedDate),
    publisher: v.publisher || '',
    description: v.description ? htmlToText(v.description) : '',
    pages: v.pageCount ? String(v.pageCount) : '',
    cover,
  };
}

async function lookupOpenLibrary(isbn) {
  const d = await fetchJson(`https://openlibrary.org/api/books?bibkeys=ISBN:${isbn}&jscmd=data&format=json`);
  const b = d[`ISBN:${isbn}`];
  if (!b) return null;
  return {
    title: b.subtitle ? `${b.title} – ${b.subtitle}` : (b.title || ''),
    author: (b.authors || []).map(a => a.name).join(', '),
    year: year(b.publish_date),
    publisher: (b.publishers || []).map(p => p.name).join(', '),
    description: typeof b.excerpts?.[0]?.text === 'string' ? b.excerpts[0].text : '',
    pages: b.number_of_pages ? String(b.number_of_pages) : '',
    cover: (b.cover && (b.cover.large || b.cover.medium)) || '',
  };
}

function jsonp(url, ms = 9000) {
  return new Promise((res, rej) => {
    const cb = '__jp' + Math.random().toString(36).slice(2);
    const sc = document.createElement('script');
    const done = () => { clearTimeout(t); delete window[cb]; sc.remove(); };
    const t = setTimeout(() => { done(); rej(new Error('timeout')); }, ms);
    window[cb] = d => { done(); res(d); };
    sc.onerror = () => { done(); rej(new Error('jsonp')); };
    sc.src = url + (url.includes('?') ? '&' : '?') + 'callback=' + cb;
    document.head.appendChild(sc);
  });
}

const flipName = n => /,/.test(n) ? n.split(',').map(x => x.trim()).reverse().join(' ') : n;

// Deutscher Bibliotheksverbund (hbz) über lobid.org: findet auch viele Kinderbücher
async function lookupLobid(isbn) {
  const d = await jsonp(`https://lobid.org/resources/search?q=isbn:${isbn}&format=json&size=1`);
  const b = d && d.member && d.member[0];
  if (!b) return null;
  const contrib = (b.contribution || []).filter(c => c.agent && c.agent.label);
  const authors = contrib.filter(c => /Autor|Verfasser/i.test((c.role && c.role.label) || ''));
  const pub = (b.publication || [])[0] || {};
  const other = Array.isArray(b.otherTitleInformation) ? b.otherTitleInformation[0] : '';
  return {
    title: [b.title, other].filter(Boolean).join(' – '),
    author: (authors.length ? authors : contrib.slice(0, 2)).map(c => flipName(c.agent.label)).join(', '),
    year: year(pub.startDate),
    publisher: (pub.publishedBy || []).join(', '),
    pages: ((String(b.extent || '').match(/(\d+)\]?\s*(S\.|Seiten|ungezählte)/) || [])[1]) || '',
    description: '',
    cover: '',
  };
}

async function lookupIsbn(isbn) {
  const res = await Promise.allSettled([lookupGoogle(isbn), lookupLobid(isbn), lookupOpenLibrary(isbn)]);
  if (res.every(r => r.status === 'rejected')) throw new Error('offline');
  const [G, L, O] = res.map(r => (r.status === 'fulfilled' ? r.value : null));
  if (!G && !L && !O) return null;
  const pick = (k, order = [G, L, O]) => { for (const x of order) if (x && x[k]) return x[k]; return ''; };
  const covers = [O && O.cover, G && G.cover,
    `https://portal.dnb.de/opac/mvb/cover?isbn=${isbn}`,
    `https://covers.openlibrary.org/b/isbn/${isbn}-L.jpg?default=false`].filter(Boolean);
  return {
    title: pick('title'), author: pick('author'),
    year: pick('year', [L, G, O]), publisher: pick('publisher', [L, G, O]),
    description: pick('description'), pages: pick('pages'),
    cover: covers[0], coverAlt: covers.slice(1).join('|'),
  };
}

/* ---------- Scanner ---------- */
let scanner = null;
let scanMode = 'any';
let scanCallback = null;

const SCAN_HINTS = {
  any: 'Buch-Barcode oder Inventaraufkleber vor die Kamera halten',
  isbn: 'Barcode auf der Buchrückseite vor die Kamera halten',
  sticker: 'QR-Code des Inventaraufklebers vor die Kamera halten',
};

function openScanner(mode, onResult) {
  const L = window.__Html5QrcodeLibrary__;
  if (!L) { manualEntry(mode, onResult, window.PREVIEW ? 'In der Vorschau ist die Kamera gesperrt. In deiner eigenen App scannst du hier.' : 'Der Scanner ist gerade nicht verfügbar.'); return; }
  scanMode = mode;
  scanCallback = onResult;
  $('#scan-hint').textContent = SCAN_HINTS[mode];
  $('#scanner').hidden = false;
  const F = L.Html5QrcodeSupportedFormats;
  const formats = mode === 'isbn' ? [F.EAN_13, F.EAN_8, F.UPC_A]
    : mode === 'sticker' ? [F.QR_CODE]
    : [F.QR_CODE, F.EAN_13, F.EAN_8, F.UPC_A];
  const s = new L.Html5Qrcode('reader', {
    formatsToSupport: formats, verbose: false,
    experimentalFeatures: { useBarCodeDetectorIfSupported: true },
  });
  scanner = s;
  let done = false;
  s.startP = s.start(
    { facingMode: 'environment' },
    {
      fps: 12,
      qrbox: (w, h) => {
        const m = Math.min(w, h);
        return mode === 'sticker'
          ? { width: Math.max(80, Math.floor(m * 0.7)), height: Math.max(80, Math.floor(m * 0.7)) }
          : { width: Math.max(120, Math.floor(w * 0.85)), height: Math.max(80, Math.floor(Math.min(h * 0.45, w * 0.45))) };
      },
    },
    (text, res) => {
      if (done) return;
      done = true;
      if (navigator.vibrate) navigator.vibrate(60);
      const fmt = res && res.result && res.result.format ? res.result.format.formatName : '';
      closeScanner().then(() => onResult(text, fmt));
    },
    () => {}
  ).catch(err => {
    closeScanner();
    const msg = String(err && err.message || err);
    manualEntry(mode, onResult, window.PREVIEW
      ? 'In der Vorschau ist die Kamera gesperrt. In deiner eigenen App scannst du hier.'
      : /permission|NotAllowed/i.test(msg)
        ? 'Kein Kamerazugriff. Erlaube die Kamera für diese Seite in den Einstellungen deines Handys.'
        : 'Die Kamera ließ sich nicht starten.');
  });
}

async function closeScanner() {
  const s = scanner;
  scanner = null;
  $('#scanner').hidden = true;
  if (!s) return;
  try { await s.startP; } catch { /* egal */ }
  try { if (s.isScanning) await s.stop(); } catch { /* egal */ }
  try { s.clear(); } catch { /* egal */ }
}

$('#scan-cancel').addEventListener('click', () => closeScanner());
async function manualEntry(mode, cb, reason) {
  const label = mode === 'isbn' ? 'ISBN eintippen' : mode === 'sticker' ? 'Inventarnummer vom Aufkleber eintippen' : 'ISBN oder Inventarnummer eintippen';
  const v = await askText(reason ? `${reason}\n\n${label}:` : `${label}:`);
  if (!v || !v.trim()) return;
  const digits = cleanIsbn(v);
  const fmt = mode === 'sticker' ? 'QR_CODE' : mode === 'isbn' ? 'EAN_13' : (digits.length >= 10 ? 'EAN_13' : 'QR_CODE');
  cb && cb(v.trim(), fmt);
}

$('#scan-type').addEventListener('click', async () => {
  const mode = scanMode, cb = scanCallback;
  await closeScanner();
  manualEntry(mode, cb);
});

function looksLikeIsbn(text, fmt) {
  if (fmt === 'QR_CODE') return false;
  const c = cleanIsbn(text);
  return /^97[89]\d{10}$/.test(c) || (fmt && fmt !== 'QR_CODE' && validIsbn(c));
}

// Universal-Scan von der Startseite: Aufkleber öffnet den Eintrag, Buch-Barcode legt an
function universalScan() {
  openScanner('any', async (text, fmt) => {
    if (looksLikeIsbn(text, fmt)) {
      const isbn = toIsbn13(cleanIsbn(text));
      const hits = items.filter(x => x.isbn === isbn);
      const hit = hits.find(x => x.loan) || hits[0];
      if (hit) {
        if (!hit.loan) toast('Dieses Buch ist schon im Inventar.');
        openScanned(hit);
        return;
      }
      location.hash = `#/new?cat=buch&isbn=${isbn}`;
      return;
    }
    const st = parseSticker(text);
    if (!st) { toast('Diesen Code kenne ich nicht.'); return; }
    learnDigits(st.raw);
    const hit = byNumber(st.num);
    if (hit) { openScanned(hit); return; }
    if (await askConfirm(`Nummer ${fmtNum(st.num)} ist noch frei. Neuen Eintrag mit dieser Nummer anlegen?`, 'Anlegen')) {
      location.hash = `#/new?cat=buch&num=${st.num}&scan=isbn`;
    }
  });
}

// Ausgeliehenes beim Scannen direkt zurückbuchen
async function returnItem(it) {
  const entry = { name: it.loan.name, from: it.loan.since, to: Date.now() };
  await saveItem({ ...it, loan: null, loans: [...(it.loans || []), entry] });
  toast(`Zurückgegeben von ${entry.name}.`);
}

async function openScanned(it) {
  if (it.loan && await askConfirm(`„${it.title || 'Dieser Eintrag'}“ ist bei ${it.loan.name} ausgeliehen (${sinceText(it.loan.since)}). Jetzt zurückbuchen?`, 'Zurückbuchen')) {
    await returnItem(it);
  }
  location.hash = `#/item/${it.id}`;
}

// Beim ersten gescannten Aufkleber die Stellenzahl (z. B. 00123) übernehmen
function learnDigits(raw) {
  if (settings.learned || !/^\d+$/.test(raw) || raw.length < 2 || raw.length > 8) return;
  settings.digits = raw.length;
  settings.learned = true;
  DB.setMeta('settings', settings);
}

/* ---------- KI-Suche ---------- */
function aiPrompt(query, budget) {
  let len = 300, rows;
  do {
    rows = items.map(it => JSON.stringify({
      id: it.id, nr: fmtNum(it.number), art: CATS[it.category]?.one || '', titel: it.title || '',
      von: it.author || it.brand || it.publisher || '', jahr: it.year || '',
      inhalt: (it.description || '').slice(0, len), notiz: (it.notes || '').slice(0, Math.min(120, len)),
    }));
    len = Math.floor(len * 0.7);
  } while (budget && rows.join('\n').length > budget && len > 20);
  return `Du hilfst, in einem privaten Inventar (Bücher, Gesellschaftsspiele, Werkzeug, EDV) Einträge anhand einer frei formulierten Beschreibung zu finden.

Suchanfrage: "${query}"

Inventar, ein Eintrag pro Zeile:
${rows.join('\n')}

Nutze Titel, Autor, Inhaltstext und dein Wissen über bekannte Bücher und Spiele. Gib höchstens 5 passende Einträge zurück, den besten zuerst. Wenn nichts wirklich passt, gib eine leere Liste zurück.
Antworte nur mit JSON in genau dieser Form, ohne weiteren Text:
{"treffer":[{"id":"<id aus der Liste>","grund":"kurze Begründung auf Deutsch, höchstens 15 Wörter"}]}`;
}

async function aiSearch(query) {
  if (window.PREVIEW) {
    const prompt = aiPrompt(query, 200000);
    const sample = window.claude ? await window.claude.use('sample') : null;
    if (!sample) throw { code: 'unavailable' };
    return sample.json(prompt, { modelTier: 'quick' });
  }
  const key = aiKeyNow();
  if (!key) throw { code: 'nokey' };
  if (!navigator.onLine) throw { code: 'offline' };
  const P = AI_PROVIDERS[ai.provider];
  const prompt = aiPrompt(query, P.budget);
  let r;
  try {
    r = ai.provider === 'openai'
      ? await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
          body: JSON.stringify({ model: P.model, max_completion_tokens: 4000, messages: [{ role: 'user', content: prompt }] }),
        })
      : await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true',
          },
          body: JSON.stringify({ model: P.model, max_tokens: 800, messages: [{ role: 'user', content: prompt }] }),
        });
  } catch { throw { code: 'offline' }; }
  if (!r.ok) throw { code: r.status === 401 ? 'badkey' : r.status === 429 ? 'rate_limited' : r.status === 402 ? 'credit' : 'http' };
  const d = await r.json();
  const text = ai.provider === 'openai'
    ? ((d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || '')
    : (d.content || []).filter(b => b.type === 'text').map(b => b.text).join('');
  const clean = text.replace(/```json|```/g, '').trim();
  const m = clean.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : clean);
}

const AI_ERRORS = {
  nokey: 'Für die KI-Suche fehlt noch der API-Schlüssel. Du hinterlegst ihn unter Einstellungen.',
  badkey: 'Der API-Schlüssel wurde abgelehnt. Prüf ihn unter Einstellungen.',
  offline: 'Für die KI-Suche brauchst du Internet.',
  rate_limited: 'Gerade zu viele Anfragen oder das Guthaben ist aufgebraucht. Prüf dein Guthaben beim Anbieter.',
  credit: 'Das Guthaben beim KI-Anbieter ist aufgebraucht.',
  not_granted: 'Die KI-Anfrage wurde nicht erlaubt.',
  unavailable: 'Die KI-Suche ist hier gerade nicht verfügbar.',
};

async function runAiSearch() {
  const q = listState.q.trim();
  if (!q) return;
  listState.ai = { q, loading: true };
  renderRows();
  try {
    const res = await aiSearch(q);
    const hits = (res && Array.isArray(res.treffer) ? res.treffer : [])
      .map(h => ({ it: items.find(x => x.id === h.id), why: String(h.grund || '') }))
      .filter(h => h.it);
    if (listState.ai && listState.ai.q === q) listState.ai = { q, hits };
  } catch (e) {
    if (listState.ai && listState.ai.q === q) listState.ai = { q, error: AI_ERRORS[e && e.code] || 'Die KI-Suche hat nicht geklappt. Versuch es noch einmal.', code: e && e.code };
  }
  if (currentView === 'list') renderRows();
}

/* ---------- Ansicht: Liste ---------- */
function filtered() {
  const q = listState.q.trim().toLowerCase();
  const qNum = /^\d+$/.test(q) ? parseInt(q, 10) : null;
  let list = items.filter(it => listState.cat === 'alle' || (listState.cat === 'ausgeliehen' ? !!it.loan : it.category === listState.cat));
  if (q) {
    list = list.filter(it => {
      if (qNum !== null && it.number === qNum) return true;
      return [it.title, it.author, it.publisher, it.isbn, it.description, it.brand, it.model, it.serial, it.location, it.notes, fmtNum(it.number), it.loan && it.loan.name]
        .some(v => v && String(v).toLowerCase().includes(q));
    });
  }
  const s = listState.sort;
  list.sort((a, b) => {
    if (s === 'titel') return (a.title || '').localeCompare(b.title || '', 'de');
    if (s === 'neu') return (b.createdAt || 0) - (a.createdAt || 0);
    const an = typeof a.number === 'number' ? a.number : Infinity;
    const bn = typeof b.number === 'number' ? b.number : Infinity;
    return an - bn || (a.title || '').localeCompare(b.title || '', 'de');
  });
  return list;
}

function subline(it) {
  if (it.category === 'buch') return [it.author, it.year].filter(Boolean).join(', ');
  if (it.category === 'spiel') return [it.publisher, it.players && `${it.players} Spieler`, it.age && `ab ${it.age}`].filter(Boolean).join(', ') || 'Gesellschaftsspiel';
  return [it.brand, it.model].filter(Boolean).join(' ') || CATS[it.category]?.one || '';
}

function renderRows() {
  const list = filtered();
  const box = $('#rows');
  if (!items.length) {
    box.innerHTML = `<div class="empty"><h2>Noch nichts erfasst</h2><p>Scanne den Barcode auf der Rückseite eines Buches, um anzufangen.</p></div>`;
    return;
  }
  if (!list.length) {
    const ai = aiHtml();
    box.innerHTML = ai + (listState.ai ? '' : `<div class="empty"><p>Nichts gefunden. Prüf die Schreibweise${ai ? ' oder lass Claude suchen' : ' oder wähle „Alle“'}.</p></div>`);
    bindAi();
    return;
  }
  box.innerHTML = aiHtml() + (listState.ai ? '<div class="section-title">Normale Suche</div>' : '') + `<div class="list">${list.map(it => rowHtml(it)).join('')}</div>`;
  bindAi();
}

function rowHtml(it, why) {
  return `
    <a class="row${it.loan ? ' lent' : ''}" href="#/item/${esc(it.id)}">
      ${coverHtml(it, 'thumb')}
      <div><div class="row-title">${esc(it.title || 'Ohne Titel')}</div><div class="row-sub">${esc(subline(it))}</div>${it.loan ? `<div class="row-loan">Bei ${esc(it.loan.name)}, ${sinceText(it.loan.since)}</div>` : ''}${why ? `<div class="row-why">${esc(why)}</div>` : ''}</div>
      ${tagHtml(it.number)}
    </a>`;
}

function aiHtml() {
  const q = listState.q.trim();
  const ai = listState.ai;
  if (ai && ai.q === q) {
    let body;
    if (ai.loading) body = '<p class="ai-msg">Claude sucht in eurem Inventar …</p>';
    else if (ai.error) body = `<p class="ai-msg err">${esc(ai.error)}</p>${ai.code === 'nokey' || ai.code === 'badkey' ? '<a class="btn small" href="#/settings">Zu den Einstellungen</a>' : ''}`;
    else if (!ai.hits.length) body = '<p class="ai-msg">Claude hat nichts Passendes gefunden. Beschreib es anders oder ausführlicher.</p>';
    else body = `<div class="list">${ai.hits.map(h => rowHtml(h.it, h.why)).join('')}</div>`;
    return `<div class="ai-box"><div class="ai-head"><span>${ICON.spark}KI-Suche</span><button class="iconbtn" id="ai-close" aria-label="KI-Suche schließen">${ICON.close}</button></div>${body}</div>`;
  }
  if (q.length >= 3 && items.length) return `<button class="ai-ask" id="ai-go">${ICON.spark}<span>Mit KI suchen: „${esc(q)}“</span></button>`;
  return '';
}

function bindAi() {
  const go = $('#ai-go');
  if (go) go.addEventListener('click', runAiSearch);
  const cl = $('#ai-close');
  if (cl) cl.addEventListener('click', () => { listState.ai = null; renderRows(); });
}

function renderList() {
  const counts = { alle: items.length };
  Object.keys(CATS).forEach(k => counts[k] = items.filter(x => x.category === k).length);
  counts.ausgeliehen = items.filter(x => x.loan).length;
  if (listState.cat === 'ausgeliehen' && !counts.ausgeliehen) listState.cat = 'alle';
  const total = items.length;
  $('#view').innerHTML = `
    <header class="top">
      <div class="brand">
        <picture><source srcset="logo-dark.png" media="(prefers-color-scheme: dark)"><img src="logo.png" alt="Kalbacher Kobel" width="516" height="133"></picture>
        <div class="brand-row"><h1>Inventar</h1><div class="count"><span id="count">${total === 1 ? '1 Eintrag' : `${total} Einträge`}</span><span class="sync" id="sync" data-state="${Sync.state}">${esc(syncLabel())}</span></div></div>
      </div>
      <a class="iconbtn" href="#/settings" aria-label="Einstellungen">${ICON.gear}</a>
    </header>
    <div class="search">${ICON.search}<input id="q" type="search" placeholder="Suchen oder Buch beschreiben" value="${esc(listState.q)}" autocomplete="off"></div>
    <div class="filter-row"><div class="filters">
      <button class="chip" data-cat="alle" aria-pressed="${listState.cat === 'alle'}">Alle<small>${counts.alle}</small></button>
      ${Object.entries(CATS).filter(([k]) => counts[k] || k === 'buch').map(([k, c]) =>
        `<button class="chip" data-cat="${k}" aria-pressed="${listState.cat === k}">${c.label}<small>${counts[k]}</small></button>`).join('')}
      ${counts.ausgeliehen ? `<button class="chip loan" data-cat="ausgeliehen" aria-pressed="${listState.cat === 'ausgeliehen'}">Ausgeliehen<small>${counts.ausgeliehen}</small></button>` : ''}
      </div>
      <select class="sort" id="sort" aria-label="Sortierung">
        <option value="nummer"${listState.sort === 'nummer' ? ' selected' : ''}>nach Nummer</option>
        <option value="titel"${listState.sort === 'titel' ? ' selected' : ''}>nach Titel</option>
        <option value="neu"${listState.sort === 'neu' ? ' selected' : ''}>zuletzt erfasst</option>
      </select>
    </div>
    <div id="rows"></div>
    <nav class="bar"><div class="bar-inner">
      <button class="btn lime" id="scan-btn">${ICON.scan}Scannen</button>
      <a class="btn" href="#/new">${ICON.plus}Hinzufügen</a>
    </div></nav>`;
  renderRows();
  $('#q').addEventListener('input', e => {
    listState.q = e.target.value;
    if (listState.ai && listState.ai.q !== listState.q.trim()) listState.ai = null;
    renderRows();
  });
  $('#q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); if (listState.q.trim().split(/\s+/).length >= 3) runAiSearch(); } });
  $('#sort').addEventListener('change', e => { listState.sort = e.target.value; renderRows(); });
  document.querySelectorAll('.chip').forEach(b => b.addEventListener('click', () => {
    listState.cat = b.dataset.cat;
    document.querySelectorAll('.chip').forEach(x => x.setAttribute('aria-pressed', x === b));
    renderRows();
  }));
  $('#scan-btn').addEventListener('click', universalScan);
  requestAnimationFrame(() => window.scrollTo(0, listState.scroll));
}

/* ---------- Ansicht: Detail ---------- */
function renderDetail(id) {
  const it = items.find(x => x.id === id);
  if (!it) { location.hash = '#/'; return; }
  const book = it.category === 'buch';
  const facts = book
    ? [['Erscheinungsjahr', it.year], ['Verlag', it.publisher], ['ISBN', it.isbn], ['Seiten', it.pages]]
    : it.category === 'spiel'
    ? [['Kategorie', 'Gesellschaftsspiel'], ['Verlag', it.publisher], ['Spieler', it.players], ['Alter', it.age ? `ab ${it.age} Jahren` : ''], ['Spieldauer', it.duration ? `${it.duration} Minuten` : '']]
    : [['Kategorie', CATS[it.category]?.one], ['Hersteller', it.brand], ['Modell', it.model], ['Seriennummer', it.serial],
       ['Kaufdatum', it.purchaseDate ? new Date(it.purchaseDate).toLocaleDateString('de-DE') : ''], ['Kaufpreis', it.price ? `${it.price} €` : '']];
  const shown = facts.filter(f => f[1]);
  $('#view').innerHTML = `
    <a class="back" href="#/">${ICON.back}Inventar</a>
    <div class="detail-head">
      ${coverHtml(it, 'cover-lg')}
      <div>
        <h1>${esc(it.title || 'Ohne Titel')}</h1>
        ${book && it.author ? `<div class="by">${esc(it.author)}</div>` : ''}
        ${tagHtml(it.number, true)}
      </div>
    </div>
    <div class="loan-box${it.loan ? ' out' : ''}">
      ${it.loan ? `
        <div class="loan-head">
          <div><div class="loan-title">Ausgeliehen an ${esc(it.loan.name)}</div><div class="loan-sub">${sinceText(it.loan.since)}, am ${fmtDate(it.loan.since)}</div></div>
          <div class="loan-btns">
            <button class="iconbtn hist-btn" id="hist-btn" aria-expanded="false" aria-controls="history" aria-label="Verlauf anzeigen">${ICON.clock}</button>
            <button class="btn primary" id="return">Rückgabe</button>
          </div>
        </div>` : `
        <div class="loan-label">
          <label for="loan-name">Ausleihen an</label>
          <button class="iconbtn hist-btn" id="hist-btn" aria-expanded="false" aria-controls="history" aria-label="Verlauf anzeigen">${ICON.clock}${(it.loans || []).length ? `<span class="hist-count">${it.loans.length}</span>` : ''}</button>
        </div>
        <div class="inline">
          <input id="loan-name" list="borrowers" placeholder="Name" autocomplete="off" enterkeyhint="done">
          <button class="btn primary" id="lend">Ausleihen</button>
        </div>
        <datalist id="borrowers">${borrowerNames().map(n => `<option value="${esc(n)}">`).join('')}</datalist>`}
      <div id="history" class="history-box" hidden>
        <div class="history-title">Verlauf</div>
        ${it.loan || (it.loans || []).length ? `<ul class="history">
          ${it.loan ? `<li class="now"><span>${esc(it.loan.name)}</span><span>seit ${fmtDate(it.loan.since)}</span></li>` : ''}
          ${[...(it.loans || [])].sort((a, b) => b.from - a.from).map(l =>
            `<li><span>${esc(l.name)}</span><span>${fmtDate(l.from)} bis ${fmtDate(l.to)}</span></li>`).join('')}
        </ul>` : '<p class="history-empty">Noch nie verliehen.</p>'}
      </div>
    </div>
    ${shown.length ? `<dl class="facts">${shown.map(([k, v]) => `<dt>${k}</dt><dd>${esc(v)}</dd>`).join('')}</dl>` : '<div style="height:16px"></div>'}
    ${it.description ? `<div class="section-title">Inhalt</div><div class="blurb">${esc(it.description)}</div>` : ''}
    ${it.notes ? `<div class="section-title">Notizen</div><div class="blurb">${esc(it.notes)}</div>` : ''}

    <div class="actions">
      <a class="btn primary" href="#/edit/${esc(it.id)}">Bearbeiten</a>
      <button class="btn danger" id="del">Löschen</button>
    </div>`;
  const lend = async () => {
    const name = $('#loan-name').value.trim();
    if (!name) { toast('Gib ein, an wen du das ausleihst.'); $('#loan-name').focus(); return; }
    await saveItem({ ...it, loan: { name, since: Date.now() } });
    toast(`An ${name} ausgeliehen.`);
    renderDetail(it.id);
  };
  $('#hist-btn').addEventListener('click', e => {
    const box = $('#history');
    box.hidden = !box.hidden;
    e.currentTarget.setAttribute('aria-expanded', String(!box.hidden));
  });
  if ($('#lend')) {
    $('#lend').addEventListener('click', lend);
    $('#loan-name').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); lend(); } });
  }
  if ($('#return')) $('#return').addEventListener('click', async () => {
    await returnItem(it);
    renderDetail(it.id);
  });
  $('#del').addEventListener('click', async () => {
    if (!await askConfirm(`„${it.title || 'Eintrag'}“ wirklich löschen?`, 'Löschen', true)) return;
    await deleteItem(it.id);
    toast('Gelöscht.');
    location.hash = '#/';
  });
}

/* ---------- Ansicht: Formular ---------- */
let draft = null;

function field(key, label, opts = {}) {
  const v = draft[key] ?? '';
  const type = opts.type || 'text';
  if (type === 'textarea') return `<div class="field"><label for="f-${key}">${label}</label><textarea id="f-${key}" data-k="${key}">${esc(v)}</textarea></div>`;
  return `<div class="field"><label for="f-${key}">${label}</label><input id="f-${key}" data-k="${key}" type="${type}" value="${esc(v)}" ${opts.attrs || ''}></div>`;
}

function renderForm(id, params) {
  const editing = id ? items.find(x => x.id === id) : null;
  if (id && !editing) { location.hash = '#/'; return; }
  if (!draft || draft._for !== (id || 'new:' + params.toString())) {
    draft = editing ? { ...editing } : {
      id: uid(), category: params.get('cat') || 'buch', createdAt: Date.now(),
      number: params.has('num') ? parseInt(params.get('num'), 10) : null,
      isbn: params.get('isbn') || '',
    };
    draft._for = id || 'new:' + params.toString();
    draft._series = params.get('series') === '1';
  }
  const book = draft.category === 'buch';
  const isNew = !editing;

  $('#view').innerHTML = `
    <a class="back" href="${editing ? `#/item/${esc(editing.id)}` : '#/'}">${ICON.back}${editing ? 'Zurück' : 'Inventar'}</a>
    <div class="form">
      <h1>${isNew ? `Neu: ${CATS[draft.category].one}` : 'Bearbeiten'}</h1>
      <div class="field"><label for="f-category">Kategorie</label>
        <select id="f-category">${Object.entries(CATS).map(([k, c]) => `<option value="${k}"${k === draft.category ? ' selected' : ''}>${c.one}</option>`).join('')}</select>
      </div>

      ${book ? `
      <div class="panel isbn">
        <div class="field" style="margin:0"><label for="f-isbn">ISBN</label>
          <div class="inline">
            <input id="f-isbn" data-k="isbn" inputmode="numeric" value="${esc(draft.isbn || '')}" placeholder="978…">
            <button class="btn small" id="isbn-scan" aria-label="ISBN scannen">${ICON.scan}</button>
            <button class="btn small primary" id="isbn-go">Suchen</button>
          </div>
        </div>
        <div class="status" id="isbn-status"></div>
      </div>` : ''}

      <div class="panel">
        <div class="field" style="margin:0"><label for="f-number">Inventarnummer (Aufkleber)</label>
          <div class="inline">
            <input id="f-number" inputmode="numeric" value="${draft.number === null || draft.number === undefined ? '' : esc(fmtNum(draft.number))}" placeholder="z. B. ${fmtNum(Math.max(0, maxNumber() + 1))}">
            <button class="btn small" id="num-scan" aria-label="Aufkleber scannen">${ICON.qr}</button>
          </div>
        </div>
        <div class="status" id="num-status"></div>
      </div>

      ${book ? `
        ${field('title', 'Titel')}
        ${field('author', 'Autor')}
        <div class="grid2">${field('year', 'Erscheinungsjahr', { attrs: 'inputmode="numeric"' })}${field('pages', 'Seiten', { attrs: 'inputmode="numeric"' })}</div>
        ${field('publisher', 'Verlag')}
        ${field('description', 'Inhalt', { type: 'textarea' })}
      ` : draft.category === 'spiel' ? `
        ${field('title', 'Titel')}
        ${field('publisher', 'Verlag')}
        <div class="grid2">${field('players', 'Spieler (z. B. 2–4)')}${field('age', 'Alter ab', { attrs: 'inputmode="numeric"' })}</div>
        ${field('duration', 'Spieldauer (Minuten)', { attrs: 'inputmode="numeric"' })}
        ${field('description', 'Beschreibung', { type: 'textarea' })}
      ` : `
        ${field('title', 'Bezeichnung')}
        <div class="grid2">${field('brand', 'Hersteller')}${field('model', 'Modell')}</div>
        ${field('serial', 'Seriennummer')}
        <div class="grid2">${field('purchaseDate', 'Kaufdatum', { type: 'date' })}${field('price', 'Kaufpreis (€)', { attrs: 'inputmode="decimal"' })}</div>
      `}
      ${field('notes', 'Notizen', { type: 'textarea' })}

      <div class="field"><label>${book ? 'Eigenes Foto (ersetzt das Cover)' : 'Foto'}</label>
        <div class="photo-row">
          ${coverHtml(draft, 'cover-lg')}
          <div class="btns">
            <button class="btn small" id="photo-take">Foto aufnehmen</button>
            ${draft.photo ? '<button class="btn small danger" id="photo-del">Foto entfernen</button>' : ''}
          </div>
        </div>
      </div>

      <div class="actions">
        <button class="btn primary" id="save">Speichern</button>
        ${isNew && book ? '<button class="btn" id="save-next">Speichern und nächstes Buch</button>' : ''}
      </div>
    </div>`;

  // Eingaben direkt in den Entwurf übernehmen
  document.querySelectorAll('[data-k]').forEach(el => el.addEventListener('input', () => { draft[el.dataset.k] = el.value; }));
  $('#f-category').addEventListener('change', e => { draft.category = e.target.value; renderForm(id, params); });
  $('#f-number').addEventListener('change', e => setNumber(e.target.value.trim() === '' ? null : e.target.value, false));

  if (book) {
    $('#isbn-go').addEventListener('click', () => doLookup());
    $('#f-isbn').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doLookup(); } });
    $('#isbn-scan').addEventListener('click', () => openScanner('isbn', text => {
      draft.isbn = cleanIsbn(text);
      $('#f-isbn').value = draft.isbn;
      doLookup(true);
    }));
  }
  $('#num-scan').addEventListener('click', () => scanSticker());
  $('#photo-take').addEventListener('click', () => $('#photo-input').click());
  const del = $('#photo-del');
  if (del) del.addEventListener('click', () => { delete draft.photo; renderForm(id, params); });
  $('#save').addEventListener('click', () => submit(false));
  const sn = $('#save-next');
  if (sn) sn.addEventListener('click', () => submit(true));

  showNumberStatus();

  // Automatische Schritte beim Öffnen
  if (draft._auto !== true) {
    draft._auto = true;
    if (book && draft.isbn && !draft.title) doLookup(!draft.number);
    else if (book && params.get('scan') === 'isbn' && !draft.isbn) setTimeout(() => $('#isbn-scan').click(), 250);
  }
}

function showNumberStatus() {
  const el = $('#num-status');
  if (!el) return;
  el.className = 'status';
  if (draft.number === null || draft.number === undefined) { el.textContent = 'Noch keine Nummer vergeben.'; return; }
  const other = items.find(x => x.number === draft.number && x.id !== draft.id);
  if (other) { el.className = 'status err'; el.textContent = `Achtung: Diese Nummer gehört schon zu „${other.title || 'einem anderen Eintrag'}“.`; }
  else { el.className = 'status ok'; el.textContent = 'Nummer ist frei.'; }
}

function setNumber(val, fromScan) {
  if (val === null) { draft.number = null; showNumberStatus(); return; }
  const st = parseSticker(val);
  if (!st) { toast('Das ist keine gültige Nummer.'); return; }
  if (fromScan) learnDigits(st.raw);
  draft.number = st.num;
  const inp = $('#f-number');
  if (inp) inp.value = fmtNum(st.num);
  showNumberStatus();
}

function scanSticker() {
  openScanner('sticker', text => setNumber(text, true));
}

async function doLookup(thenSticker) {
  const status = $('#isbn-status');
  const isbnRaw = cleanIsbn(draft.isbn);
  status.className = 'status';
  if (!validIsbn(isbnRaw)) { status.className = 'status err'; status.textContent = 'Die ISBN ist nicht gültig. Prüf die Ziffern.'; return; }
  const isbn = toIsbn13(isbnRaw);
  draft.isbn = isbn;
  $('#f-isbn').value = isbn;
  const dup = items.find(x => x.isbn === isbn && x.id !== draft.id);
  if (!navigator.onLine) { status.className = 'status err'; status.textContent = 'Kein Internet. Trag die Angaben von Hand ein oder such später.'; return; }
  status.textContent = 'Suche in den Buchdatenbanken …';
  $('#isbn-go').disabled = true;
  try {
    const r = await lookupIsbn(isbn);
    if (!r) { status.className = 'status err'; status.textContent = 'Zu dieser ISBN wurde nichts gefunden. Trag die Angaben bitte von Hand ein.'; return; }
    for (const k of ['title', 'author', 'year', 'publisher', 'description', 'pages', 'cover', 'coverAlt']) if (r[k]) draft[k] = r[k];
    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const id = location.hash.startsWith('#/edit/') ? location.hash.split('/')[2].split('?')[0] : null;
    renderForm(id, params);
    const s2 = $('#isbn-status');
    s2.className = dup ? 'status err' : 'status ok';
    s2.textContent = dup ? `Gefunden. Hinweis: Du hast dieses Buch schon (Nr. ${fmtNum(dup.number) || 'ohne'}).` : `Gefunden: ${draft.title}`;
    if (thenSticker && (draft.number === null || draft.number === undefined)) setTimeout(scanSticker, 400);
  } catch {
    status.className = 'status err';
    status.textContent = 'Die Buchdatenbanken sind gerade nicht erreichbar. Versuch es gleich noch einmal.';
  } finally {
    const b = $('#isbn-go');
    if (b) b.disabled = false;
  }
}

async function submit(next) {
  if (!String(draft.title || '').trim() && !draft.isbn) { toast('Gib mindestens einen Titel oder eine ISBN ein.'); return; }
  const other = (draft.number !== null && draft.number !== undefined) ? items.find(x => x.number === draft.number && x.id !== draft.id) : null;
  if (other && !await askConfirm(`Nummer ${fmtNum(draft.number)} gehört schon zu „${other.title}“. Trotzdem speichern?`, 'Trotzdem speichern')) return;
  const it = { ...draft };
  delete it._for; delete it._auto; delete it._series;
  if (it.category === 'buch') { delete it.brand; delete it.model; delete it.serial; delete it.purchaseDate; delete it.price; }
  await saveItem(it);
  const savedId = it.id;
  draft = null;
  toast('Gespeichert.');
  if (next) location.hash = `#/new?cat=buch&scan=isbn&series=1&t=${Date.now()}`;
  else location.hash = `#/item/${savedId}`;
}

// Foto aufnehmen und verkleinern
$('#photo-input').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file || !draft) return;
  try {
    const bmp = await createImageBitmap(file);
    const max = 900;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * k);
    c.height = Math.round(bmp.height * k);
    c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
    draft.photo = c.toDataURL('image/jpeg', 0.8);
    const params = new URLSearchParams((location.hash.split('?')[1]) || '');
    const id = location.hash.startsWith('#/edit/') ? location.hash.split('/')[2].split('?')[0] : null;
    renderForm(id, params);
  } catch {
    toast('Das Foto konnte nicht gelesen werden.');
  }
});

/* ---------- Ansicht: Einstellungen ---------- */
async function shareOrDownload(name, text, type) {
  const blob = new Blob([text], { type });
  try {
    const file = new File([blob], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return;
    }
  } catch (err) { if (err && err.name === 'AbortError') return; }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
}

const stamp = () => new Date().toISOString().slice(0, 10);

function toCsv() {
  const cols = [['Nummer', it => fmtNum(it.number)], ['Kategorie', it => CATS[it.category]?.one || ''], ['Titel', it => it.title],
    ['Autor', it => it.author], ['Jahr', it => it.year], ['Verlag', it => it.publisher], ['ISBN', it => it.isbn],
    ['Hersteller', it => it.brand], ['Modell', it => it.model], ['Seriennummer', it => it.serial],
    ['Kaufdatum', it => it.purchaseDate], ['Kaufpreis', it => it.price], ['Spieler', it => it.players], ['Alter ab', it => it.age], ['Notizen', it => it.notes],
    ['Ausgeliehen an', it => it.loan ? it.loan.name : ''], ['Ausgeliehen seit', it => it.loan ? fmtDate(it.loan.since) : '']];
  const cell = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const sorted = [...items].sort((a, b) => (a.number ?? 1e9) - (b.number ?? 1e9));
  return '\uFEFF' + [cols.map(c => cell(c[0])).join(';'), ...sorted.map(it => cols.map(c => cell(c[1](it))).join(';'))].join('\r\n');
}

async function renderSettings() {
  let persisted = null;
  try { persisted = navigator.storage && navigator.storage.persisted ? await navigator.storage.persisted() : null; } catch { /* egal */ }
  const max = maxNumber();
  $('#view').innerHTML = `
    <a class="back" href="#/">${ICON.back}Inventar</a>
    <div class="settings">
      <h1>Einstellungen</h1>

      <div class="panel" id="sync-panel"></div>

      <div class="panel">
        <h2>KI-Suche</h2>
        ${window.PREVIEW ? '<p>In der Vorschau nutzt die KI-Suche dein Claude-Konto. In deiner eigenen App brauchst du dafür einen API-Schlüssel.</p>' : `
        <p>Damit kannst du ein Buch beschreiben, statt den Titel zu kennen. Der API-Schlüssel bleibt nur auf diesem Gerät. Bei einer Suche werden Titel und Inhaltstexte eures Inventars an den Anbieter geschickt, jede Suche kostet etwas Guthaben.</p>
        <div class="field"><label for="ai-provider">Anbieter</label>
          <select id="ai-provider">${Object.entries(AI_PROVIDERS).map(([k, v]) => `<option value="${k}"${k === ai.provider ? ' selected' : ''}>${v.label}</option>`).join('')}</select>
        </div>
        <div class="field" style="margin:0"><label for="ai-key">API-Schlüssel von ${AI_PROVIDERS[ai.provider].where}</label>
          <input id="ai-key" type="password" autocomplete="off" autocapitalize="off" placeholder="${aiKeyNow() ? 'gespeichert' : AI_PROVIDERS[ai.provider].placeholder}">
        </div>
        <button class="btn" id="ai-save">${aiKeyNow() ? 'Schlüssel ersetzen' : 'Schlüssel speichern'}</button>
        ${aiKeyNow() ? '<button class="btn danger" id="ai-del">Schlüssel entfernen</button>' : ''}`}
      </div>

      <div class="panel">
        <h2>Inventarnummern</h2>
        <p>${max >= 0 ? `Höchste vergebene Nummer: ${fmtNum(max)}. Nächste: ${fmtNum(max + 1)}.` : 'Noch keine Nummer vergeben.'}</p>
        <div class="field" style="margin:0"><label for="digits">Stellen auf dem Aufkleber (mit führenden Nullen)</label>
          <input id="digits" type="number" min="1" max="8" inputmode="numeric" value="${settings.digits}">
        </div>
      </div>

      <div class="panel">
        <h2>Sicherung</h2>
        <p>${Sync.state === 'local' ? 'Deine Daten liegen nur auf diesem Gerät. Mach regelmäßig eine Sicherung und leg sie z. B. in iCloud oder Google Drive ab.' : 'Eine Sicherungsdatei ist zusätzlich nützlich, z. B. vor einem Serverumzug.'}</p>
        <button class="btn primary" id="exp-json">Sicherung speichern</button>
        <button class="btn" id="imp-json">Sicherung einspielen</button>
        <button class="btn" id="exp-csv">Als Tabelle exportieren (Excel)</button>
      </div>

      <div class="panel">
        <h2>Speicher</h2>
        <p>${persisted === true ? 'Der Speicher ist dauerhaft gesichert.' : 'Der Browser darf den Speicher bei Platzmangel leeren. Leg die App auf den Homescreen und tippe hier, um ihn dauerhaft zu sichern.'}</p>
        ${persisted === true ? '' : '<button class="btn" id="persist">Speicher dauerhaft sichern</button>'}
      </div>

      <div class="panel">
        <h2>Alles löschen</h2>
        <p>Entfernt alle ${items.length} Einträge${Sync.state === 'local' ? ' von diesem Gerät' : ', auch auf allen anderen Geräten'}.</p>
        <button class="btn danger" id="wipe">Alle Einträge löschen</button>
      </div>
    </div>`;

  renderSyncPanel();
  const aiSave = $('#ai-save');
  if (aiSave) aiSave.addEventListener('click', async () => {
    const v = $('#ai-key').value.trim();
    if (!v) { toast('Gib zuerst einen Schlüssel ein.'); return; }
    ai.keys[ai.provider] = v; await DB.setMeta('ai', ai);
    toast('Schlüssel gespeichert.'); renderSettings();
  });
  const aiProv = $('#ai-provider');
  if (aiProv) aiProv.addEventListener('change', async e => { ai.provider = e.target.value; await DB.setMeta('ai', ai); renderSettings(); });
  const aiDel = $('#ai-del');
  if (aiDel) aiDel.addEventListener('click', async () => {
    delete ai.keys[ai.provider]; await DB.setMeta('ai', ai);
    toast('Schlüssel entfernt.'); renderSettings();
  });
  $('#digits').addEventListener('change', e => {
    const d = Math.min(8, Math.max(1, parseInt(e.target.value, 10) || 5));
    settings.digits = d; settings.learned = true;
    DB.setMeta('settings', settings);
    e.target.value = d;
    toast('Gespeichert.');
  });
  $('#exp-json').addEventListener('click', () => shareOrDownload(`inventar-${stamp()}.json`,
    JSON.stringify({ app: 'inventar', version: 1, exported: new Date().toISOString(), settings, items }, null, 1), 'application/json'));
  $('#exp-csv').addEventListener('click', () => shareOrDownload(`inventar-${stamp()}.csv`, toCsv(), 'text/csv'));
  $('#imp-json').addEventListener('click', () => $('#import-input').click());
  const p = $('#persist');
  if (p) p.addEventListener('click', async () => {
    const ok = navigator.storage && navigator.storage.persist ? await navigator.storage.persist() : false;
    toast(ok ? 'Speicher ist jetzt dauerhaft gesichert.' : 'Der Browser hat abgelehnt. Leg die App auf den Homescreen und versuch es dort.');
    renderSettings();
  });
  $('#wipe').addEventListener('click', async () => {
    if (!await askConfirm('Wirklich alle Einträge löschen?', 'Alle löschen', true)) return;
    if (!await askConfirm('Ganz sicher? Das lässt sich ohne Sicherung nicht rückgängig machen.', 'Endgültig löschen', true)) return;
    for (const it of [...items]) await deleteItem(it.id);
    toast('Alle Einträge gelöscht.');
    location.hash = '#/';
  });
}

function renderSyncPanel() {
  const box = $('#sync-panel');
  if (!box) return;
  if (Sync.state === 'local' || Sync.state === 'login') {
    box.innerHTML = `
      <h2>Gemeinsamer Speicher</h2>
      <p>${Sync.state === 'login' ? 'Deine Anmeldung ist abgelaufen. Melde dich neu an.' : 'Verbinde die App mit eurem Server, damit ihr beide denselben Bestand seht.'}</p>
      <div class="field"><label for="srv-url">Serveradresse</label><input id="srv-url" type="url" inputmode="url" autocapitalize="off" autocorrect="off" placeholder="https://…" value="${esc(Sync.url || '')}"></div>
      <div class="field"><label for="srv-mail">E-Mail</label><input id="srv-mail" type="email" autocomplete="username" autocapitalize="off"></div>
      <div class="field"><label for="srv-pw">Passwort</label><input id="srv-pw" type="password" autocomplete="current-password"></div>
      <div class="status" id="srv-status"></div>
      <button class="btn primary" id="srv-go">Verbinden</button>`;
    $('#srv-go').addEventListener('click', async () => {
      const url = $('#srv-url').value.trim(), mail = $('#srv-mail').value.trim(), pw = $('#srv-pw').value;
      const st = $('#srv-status');
      if (!/^https:\/\//.test(url) && !/^http:\/\/(localhost|127\.)/.test(url)) { st.className = 'status err'; st.textContent = 'Die Adresse muss mit https:// beginnen.'; return; }
      if (!mail || !pw) { st.className = 'status err'; st.textContent = 'Gib E-Mail und Passwort ein.'; return; }
      st.className = 'status'; st.textContent = 'Verbinde …';
      $('#srv-go').disabled = true;
      try {
        await Sync.login(url, mail, pw);
        toast('Verbunden. Ihr nutzt jetzt denselben Bestand.');
        renderSettings();
      } catch (e) {
        st.className = 'status err';
        st.textContent = e && e.status === 400 ? 'E-Mail oder Passwort stimmt nicht.'
          : 'Der Server ist nicht erreichbar. Prüf die Adresse und deine Internetverbindung.';
        const b = $('#srv-go'); if (b) b.disabled = false;
      }
    });
    return;
  }
  const t = Sync.lastSync ? Sync.lastSync.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }) : '';
  box.innerHTML = `
    <h2>Gemeinsamer Speicher</h2>
    <p>Angemeldet als ${esc(Sync.user)} bei ${esc(Sync.url)}.<br>${esc(syncLabel())}${t && Sync.state === 'ok' ? `, zuletzt um ${t}` : ''}.</p>
    <button class="btn" id="srv-sync">Jetzt abgleichen</button>
    <button class="btn" id="srv-out">Abmelden</button>`;
  $('#srv-sync').addEventListener('click', () => Sync.sync());
  $('#srv-out').addEventListener('click', async () => {
    if (Sync.pending && !await askConfirm(`${Sync.pending} Änderungen sind noch nicht auf dem Server. Trotzdem abmelden?`, 'Abmelden', true)) return;
    await Sync.logout();
    toast('Abgemeldet. Die Daten bleiben auf diesem Gerät.');
    renderSettings();
  });
}

$('#import-input').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const list = Array.isArray(data) ? data : data.items;
    if (!Array.isArray(list)) throw new Error('format');
    const valid = list.filter(x => x && typeof x === 'object' && x.id).map(x => validId(x.id) ? x : { ...x, id: uid() });
    if (!await askConfirm(`${valid.length} Einträge einspielen? Gleiche Einträge werden überschrieben.`, 'Einspielen')) return;
    await DB.putMany(valid);
    for (const it of valid) { items = items.filter(x => x.id !== it.id); items.push(it); await Sync.queue('put', it.id); }
    if (data.settings && data.settings.digits) { settings = { ...settings, ...data.settings }; await DB.setMeta('settings', settings); }
    items = await DB.all();
    toast(`${valid.length} Einträge eingespielt.`);
    location.hash = '#/';
  } catch {
    toast('Diese Datei ist keine Inventar-Sicherung.');
  }
});

/* ---------- Navigation ---------- */
function route() {
  if (currentView === 'list') listState.scroll = window.scrollY;
  closeScanner();
  const h = location.hash.slice(1) || '/';
  const [path, qs] = h.split('?');
  const params = new URLSearchParams(qs || '');
  const parts = path.split('/').filter(Boolean);
  if (parts[0] !== 'new' && parts[0] !== 'edit') draft = null;
  if (!parts.length) {
    if (listState.ai && (listState.ai.error || listState.ai.loading)) listState.ai = null;
    currentView = 'list'; renderList(); return;
  }
  currentView = parts[0];
  window.scrollTo(0, 0);
  if (parts[0] === 'item') renderDetail(parts[1]);
  else if (parts[0] === 'edit') renderForm(parts[1], params);
  else if (parts[0] === 'new') renderForm(null, params);
  else if (parts[0] === 'settings') renderSettings();
  else { currentView = 'list'; renderList(); }
}

window.addEventListener('hashchange', route);

(async function start() {
  try {
    items = await DB.all();
    const s = await DB.getMeta('settings');
    if (s) settings = { ...settings, ...s };
    const savedAi = await DB.getMeta('ai');
    if (savedAi) ai = { provider: savedAi.provider || 'openai', keys: savedAi.keys || {} };
  } catch {
    $('#view').innerHTML = '<div class="empty"><h2>Speicher nicht verfügbar</h2><p>Öffne die App nicht im privaten Modus des Browsers.</p></div>';
    return;
  }
  route();
  Sync.init();
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
})();
