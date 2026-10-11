const APP_VERSION = 'v1.0';

// ---------- 저장 ----------
const KEY = 'fridge-items';
const HIST_KEY = 'fridge-history';
const SET_KEY = 'fridge-settings';

const load = (k, def) => { try { return JSON.parse(localStorage.getItem(k)) ?? def; } catch { return def; } };
let items = load(KEY, []);
let history = load(HIST_KEY, []); // 다 먹음/버림 기록 { type, name, date }
let settings = { soonDays: 3, ...load(SET_KEY, {}) };
const saveItems = () => localStorage.setItem(KEY, JSON.stringify(items));
const saveHistory = () => localStorage.setItem(HIST_KEY, JSON.stringify(history));
const saveSettings = () => localStorage.setItem(SET_KEY, JSON.stringify(settings));

// ---------- 날짜 ----------
const pad = (n) => String(n).padStart(2, '0');
const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromStr = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const today = () => toStr(new Date());
const addDays = (s, n) => { const d = fromStr(s); d.setDate(d.getDate() + n); return toStr(d); };
const daysLeft = (exp) => Math.round((fromStr(exp) - fromStr(today())) / 86400000);
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const prettyDate = (s) => { const d = fromStr(s); return `${d.getMonth() + 1}/${d.getDate()}(${WEEK[d.getDay()]})`; };

function status(exp) {
  const n = daysLeft(exp);
  if (n < 0) return 'expired';
  if (n <= settings.soonDays) return 'soon';
  return 'ok';
}
function badgeText(exp) {
  const n = daysLeft(exp);
  if (n === 0) return 'D-Day';
  if (n < 0) return `${-n}일 지남`;
  return `D-${n}`;
}

// ---------- 자주 사는 재료 (기본 유통기한 일수) ----------
const PRESETS = [
  ['우유', '🥛', '냉장', 7], ['계란', '🥚', '냉장', 21], ['두부', '🧈', '냉장', 5],
  ['요거트', '🥣', '냉장', 10], ['치즈', '🧀', '냉장', 21], ['햄', '🥓', '냉장', 7],
  ['닭고기', '🍗', '냉장', 2], ['돼지고기', '🥩', '냉장', 3], ['소고기', '🥩', '냉장', 3],
  ['생선', '🐟', '냉장', 2], ['김치', '🥬', '냉장', 30], ['대파', '🌿', '냉장', 7],
  ['양파', '🧅', '실온', 21], ['감자', '🥔', '실온', 21], ['당근', '🥕', '냉장', 14],
  ['양배추', '🥬', '냉장', 14], ['상추', '🥗', '냉장', 5], ['오이', '🥒', '냉장', 7],
  ['토마토', '🍅', '냉장', 7], ['버섯', '🍄', '냉장', 5], ['사과', '🍎', '냉장', 21],
  ['바나나', '🍌', '실온', 5], ['빵', '🍞', '실온', 4], ['만두', '🥟', '냉동', 90],
  ['냉동밥', '🍚', '냉동', 30], ['아이스크림', '🍦', '냉동', 180],
];
const EMOJIS = '🥬🥗🥒🥕🧅🧄🥔🌽🍅🍆🫑🌶️🥦🍄🌿🍎🍐🍊🍋🍌🍉🍇🍓🫐🍑🥝🥭🍍🥥🥛🧈🧀🥚🥓🥩🍗🍖🐟🦐🦑🦀🍞🥐🥯🍚🍜🥟🍱🥘🍲🥫🧃🧋🍺🍷🥤🍦🍰🍫🫙🧂🥣❓'.match(/\p{Extended_Pictographic}️?/gu);

// ---------- 화면 ----------
const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let place = 'all';
let query = '';

function render() {
  const all = items.slice().sort((a, b) => a.exp.localeCompare(b.exp) || a.name.localeCompare(b.name));
  $('#cnt-expired').textContent = all.filter((i) => status(i.exp) === 'expired').length;
  $('#cnt-soon').textContent = all.filter((i) => status(i.exp) === 'soon').length;
  $('#cnt-total').textContent = all.length;
  $('#soon-label').textContent = `${settings.soonDays}일 이내`;

  const shown = all.filter((i) => (place === 'all' || i.place === place) && (!query || i.name.includes(query) || (i.memo || '').includes(query)));
  const list = $('#list');
  if (!items.length) {
    list.innerHTML = '<div class="empty"><div class="big">🧊</div>냉장고가 비어 있어요.<br>오른쪽 아래 <b>＋</b>를 눌러 재료를 넣어보세요.</div>';
    return;
  }
  if (!shown.length) {
    list.innerHTML = '<div class="empty">해당하는 재료가 없어요.</div>';
    return;
  }
  const groups = [
    ['expired', 'bad', '기한 지남 · 빨리 확인하세요'],
    ['soon', 'warn', `곧 끝나요 · ${settings.soonDays}일 이내`],
    ['ok', '', '여유 있어요'],
  ];
  const cls = { expired: 'bad', soon: 'warn', ok: 'ok' };
  list.innerHTML = groups.map(([st, c, title]) => {
    const g = shown.filter((i) => status(i.exp) === st);
    if (!g.length) return '';
    return `<div class="section-title ${c}" id="sec-${st}">${title} (${g.length})</div>` + g.map((i) => `
      <button class="item" data-id="${i.id}">
        <span class="emoji">${esc(i.emoji || '🥬')}</span>
        <span class="info">
          <div class="name">${esc(i.name)}${i.qty ? ` <span style="font-weight:500;color:var(--muted)">${esc(i.qty)}</span>` : ''}</div>
          <div class="sub">${esc(i.place)} · ${prettyDate(i.exp)}까지${i.memo ? ` · ${esc(i.memo)}` : ''}</div>
        </span>
        <span class="badge ${cls[st]}">${badgeText(i.exp)}</span>
      </button>`).join('');
  }).join('');
}

// ---------- 시트 열고 닫기 ----------
const openSheet = (id) => $(id).classList.add('open');
const closeSheet = (el) => { el.classList.remove('open'); document.activeElement?.blur(); };
document.querySelectorAll('.sheet-bg').forEach((bg) => {
  bg.addEventListener('click', (e) => { if (e.target === bg || e.target.closest('[data-close]')) closeSheet(bg); });
});

// ---------- 재료 추가/수정 ----------
let editingId = null;
let formPlace = '냉장';

function setPlace(v) {
  formPlace = v;
  document.querySelectorAll('#f-place button').forEach((b) => b.classList.toggle('on', b.dataset.v === v));
}
function updateExpHint() {
  const v = $('#f-exp').value;
  if (!v) { $('#exp-hint').textContent = ''; return; }
  const n = daysLeft(v);
  $('#exp-hint').textContent = n === 0 ? '오늘까지예요' : n < 0 ? `${-n}일 지났어요` : `오늘부터 ${n}일 남았어요`;
}

function openForm(item) {
  editingId = item?.id ?? null;
  $('#sheet-title').textContent = item ? '재료 수정' : '재료 추가';
  $('#presets-wrap').hidden = !!item;
  $('#edit-actions').hidden = !item;
  $('#f-name').value = item?.name ?? '';
  $('#emoji-btn').textContent = item?.emoji ?? '🥬';
  setPlace(item?.place ?? '냉장');
  $('#f-exp').value = item?.exp ?? addDays(today(), 7);
  $('#f-qty').value = item?.qty ?? '';
  $('#f-buy').value = item?.buy ?? today();
  $('#f-memo').value = item?.memo ?? '';
  document.querySelectorAll('.preset').forEach((p) => p.classList.remove('on'));
  updateExpHint();
  $('#item-sheet .sheet').scrollTop = 0;
  openSheet('#item-sheet');
}

$('#presets').innerHTML = PRESETS.map(([n, e], i) => `<button type="button" class="preset" data-i="${i}">${e} ${n}</button>`).join('');
$('#presets').addEventListener('click', (e) => {
  const b = e.target.closest('.preset');
  if (!b) return;
  const [n, emo, pl, days] = PRESETS[b.dataset.i];
  document.querySelectorAll('.preset').forEach((p) => p.classList.toggle('on', p === b));
  $('#f-name').value = n;
  $('#emoji-btn').textContent = emo;
  setPlace(pl);
  $('#f-exp').value = addDays($('#f-buy').value || today(), days);
  updateExpHint();
});

$('#f-place').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) setPlace(b.dataset.v); });
$('#quick-exp').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $('#f-exp').value = addDays(today(), Number(b.dataset.d));
  updateExpHint();
});
$('#f-exp').addEventListener('change', updateExpHint);

$('#item-form').addEventListener('submit', (e) => {
  e.preventDefault();
  const name = $('#f-name').value.trim();
  const exp = $('#f-exp').value;
  if (!name) { $('#f-name').focus(); return; }
  if (!exp) { $('#f-exp').focus(); return; }
  const data = {
    name, exp,
    emoji: $('#emoji-btn').textContent,
    place: formPlace,
    qty: $('#f-qty').value.trim(),
    buy: $('#f-buy').value,
    memo: $('#f-memo').value.trim(),
  };
  if (editingId) {
    Object.assign(items.find((i) => i.id === editingId), data);
    toast(`${name} 수정했어요`);
  } else {
    items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ...data });
    toast(`${name} 넣었어요`);
  }
  saveItems();
  render();
  closeSheet($('#item-sheet'));
});

function removeItem(type) {
  const idx = items.findIndex((i) => i.id === editingId);
  if (idx < 0) return;
  const [removed] = items.splice(idx, 1);
  history.push({ type, name: removed.name, date: today() });
  saveItems(); saveHistory(); render();
  closeSheet($('#item-sheet'));
  toast(type === 'eat' ? `${removed.name} 다 먹었어요 👍` : `${removed.name} 버렸어요`, () => {
    items.splice(idx, 0, removed);
    history.pop();
    saveItems(); saveHistory(); render();
  });
}
$('#eat-btn').addEventListener('click', () => removeItem('eat'));
$('#toss-btn').addEventListener('click', () => removeItem('toss'));

$('#list').addEventListener('click', (e) => {
  const b = e.target.closest('.item');
  if (b) openForm(items.find((i) => i.id === b.dataset.id));
});
$('#add-btn').addEventListener('click', () => openForm(null));

// ---------- 이모지 ----------
$('#emoji-grid').innerHTML = EMOJIS.map((e) => `<button type="button">${e}</button>`).join('');
$('#emoji-btn').addEventListener('click', () => openSheet('#emoji-sheet'));
$('#emoji-grid').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $('#emoji-btn').textContent = b.textContent;
  closeSheet($('#emoji-sheet'));
});

// ---------- 탭, 검색, 요약 ----------
$('#tabs').addEventListener('click', (e) => {
  const b = e.target.closest('.tab');
  if (!b) return;
  place = b.dataset.place;
  document.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t === b));
  render();
});
$('#search').addEventListener('input', (e) => { query = e.target.value.trim(); render(); });
document.querySelectorAll('[data-jump]').forEach((b) => b.addEventListener('click', () => {
  const sec = document.getElementById(`sec-${b.dataset.jump}`);
  if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  else window.scrollTo({ top: 0, behavior: 'smooth' });
}));

// ---------- 설정 ----------
function renderSettings() {
  document.querySelectorAll('#soon-days button').forEach((b) => b.classList.toggle('on', Number(b.dataset.v) === settings.soonDays));
  const month = today().slice(0, 7);
  const h = history.filter((x) => x.date.startsWith(month));
  const eat = h.filter((x) => x.type === 'eat').length;
  const toss = h.filter((x) => x.type === 'toss').length;
  $('#month-stats').innerHTML = `다 먹음 <b style="color:var(--ok)">${eat}</b> · 버림 <b style="color:var(--bad)">${toss}</b>`;
  $('#version').textContent = `fridge ${APP_VERSION}`;
}
$('#open-settings').addEventListener('click', () => { renderSettings(); openSheet('#settings-sheet'); });
$('#soon-days').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  settings.soonDays = Number(b.dataset.v);
  saveSettings(); renderSettings(); render();
});

$('#export-btn').addEventListener('click', async () => {
  const json = JSON.stringify({ app: 'fridge', version: APP_VERSION, items, history, settings }, null, 2);
  const file = new File([json], `fridge-backup-${today()}.json`, { type: 'application/json' });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); } catch { /* 취소 */ }
    return;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(file);
  a.download = file.name;
  a.click();
  URL.revokeObjectURL(a.href);
});
$('#import-btn').addEventListener('click', () => $('#import-file').click());
$('#import-file').addEventListener('change', async (e) => {
  const f = e.target.files[0];
  e.target.value = '';
  if (!f) return;
  try {
    const data = JSON.parse(await f.text());
    if (!Array.isArray(data.items)) throw new Error();
    if (!confirm(`재료 ${data.items.length}개로 바꿀까요? 지금 기록은 덮어써져요.`)) return;
    items = data.items;
    history = Array.isArray(data.history) ? data.history : [];
    if (data.settings) settings = { ...settings, ...data.settings };
    saveItems(); saveHistory(); saveSettings();
    render(); renderSettings();
    toast('백업을 불러왔어요');
  } catch {
    alert('백업 파일을 읽을 수 없어요.');
  }
});

// ---------- 토스트 ----------
let toastTimer;
let undoFn = null;
function toast(msg, undo) {
  $('#toast-msg').textContent = msg;
  undoFn = undo || null;
  $('#toast-undo').hidden = !undo;
  $('#toast').classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $('#toast').classList.remove('show'), undo ? 4000 : 2000);
}
$('#toast-undo').addEventListener('click', () => {
  undoFn?.();
  undoFn = null;
  $('#toast').classList.remove('show');
});

// ---------- 시작 ----------
render();
// 날짜가 바뀌었거나 앱으로 돌아왔을 때 D-day 다시 계산
document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
