// 桔利冰冰 · 站点交互
// 2026-11-05：封面期间预热三维冰碗；抽签揭晓统一手绘菜单插画；详情去掉固定说明句。
const products = window.JILI_PRODUCTS;
const categoryLabels = { "ice": "刨冰与绵绵冰", "soup": "潮汕甜汤", "snack": "炸物小食", "drink": "冰饮" };
let menuCategory = "all";
const fortunes = window.JILI_FORTUNES.map(f => ({ ...f, product: products.find(p => p.id === f.id) }));
const $ = s => document.querySelector(s);
let seen = [], drawn = null, drawing = false, entered = false, modelStarted = false;

function page(id) {
  if (!['home', 'draw', 'menu', 'visit', 'detail'].includes(id)) id = 'home';
  if (id === 'detail') restoreDetail();
  document.querySelectorAll('.page').forEach(x => x.hidden = x.id !== id);
  document.querySelectorAll('nav button').forEach(x => {
    const on = x.dataset.page === (id === 'detail' ? 'menu' : id);
    x.classList.toggle('active', on);
    if (on) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current');
  });
  window.scrollTo(0, 0);
  window.dispatchEvent(new Event('resize'));
  if (window.__viewerSetLoop) window.__viewerSetLoop(id === 'home');
  if (id === 'home' && entered) loadModel();
}
function navigate(id) { if (location.hash.slice(1) === id) page(id); else location.hash = id; }
window.addEventListener('hashchange', () => { if (entered) page(location.hash.slice(1) || 'home'); });
document.querySelectorAll('[data-page]').forEach(x => x.onclick = () => navigate(x.dataset.page));

// 产品详情：只展示用户确认的品名、品类与手绘菜单插画，不写价格、配方或供应说明。
function fillDetail(p) {
  if (!p) return;
  $('#detailName').textContent = p.name;
  $('#detailPhoto').src = p.art;
  $('#detailPhoto').alt = p.name + '手绘菜单插画';
  $('#detailCategory').textContent = '桔利冰冰 · ' + categoryLabels[p.category];
  try { sessionStorage.setItem('jili:lastProduct', p.id); } catch { }
}
function restoreDetail() {
  let id = null;
  try { id = sessionStorage.getItem('jili:lastProduct'); } catch { }
  const p = products.find(x => x.id === id);
  if (p) fillDetail(p);
}
function detail(p) { if (!p) return; fillDetail(p); navigate('detail'); }
$('#featureOpen').onclick = () => detail(products.find(p => p.id === 'grape'));

function renderMenu(category = menuCategory) {
  menuCategory = category;
  const query = $('#menuSearch').value.trim();
  const list = products.filter(p => (category === 'all' || p.category === category) && p.name.includes(query));
  $('#cards').innerHTML = list.map(p => `<button class="card menu-art-card" data-id="${p.id}" aria-label="查看${p.name}"><span class="card-image"><img loading="lazy" src="${p.art}" alt="${p.name}手绘菜单插画"></span><h2>${p.name}</h2><span class="card-bottom"><span>${categoryLabels[p.category]}</span><span>翻看这款 ↗</span></span></button>`).join('');
  document.querySelectorAll('.card').forEach(x => x.onclick = () => detail(products.find(p => p.id === x.dataset.id)));
  $('#categoryNote').hidden = list.length > 0;
  $('#categoryNote h2').textContent = '还没找到这一款';
  $('#categoryNote p').textContent = '试试其他名字，或切换到全部菜单。';
  $('#menuCount').textContent = list.length + ' 款，慢慢挑。';
  document.querySelectorAll('[data-category]').forEach(x => x.setAttribute('aria-pressed', x.dataset.category === category));
}
document.querySelectorAll('[data-category]').forEach(x => x.onclick = () => renderMenu(x.dataset.category));
$('#menuSearch').addEventListener('input', () => renderMenu());
$('#clearSearch').onclick = () => { $('#menuSearch').value = ''; renderMenu('all'); };
renderMenu();

function draw() {
  if (drawing) return;
  playShakeSound(); drawing = true;
  $('#shake').disabled = true;
  $('#slip').hidden = true; $('#revealArea').hidden = true;
  $('.fortune-stage').hidden = false; $('#shake').hidden = false; $('.jar-caption').hidden = false;
  let pool = fortunes.filter(p => !seen.includes(p.id));
  if (!pool.length) { seen = []; pool = fortunes; }
  drawn = pool[Math.floor(Math.random() * pool.length)];
  seen.push(drawn.id);
  $('#shake').classList.add('shaking');
  setTimeout(() => {
    $('#shake').classList.remove('shaking');
    $('#shake').hidden = true; $('.jar-caption').hidden = true;
    $('#slipTitle').textContent = drawn.slip;
    $('#slipText').textContent = drawn.line;
    $('#slip').hidden = false;
    $('#shake').disabled = false; drawing = false;
    $('#reveal').focus({ preventScroll: true });
  }, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 700);
}
$('#shake').onclick = draw;
$('#again').onclick = draw;
// 揭晓统一使用手绘菜单插画；fortunes.js 的 img 字段保留为历史签文数据，不参与渲染。
$('#reveal').onclick = () => {
  if (!drawn) return;
  $('#revealName').textContent = drawn.name;
  $('#revealPhoto').src = drawn.product.art;
  $('#revealPhoto').alt = drawn.name + '手绘菜单插画';
  $('#revealPhoto').classList.add('is-art');
  $('#revealKind').textContent = '签中甜品';
  $('#revealLine').textContent = drawn.line;
  $('#slip').hidden = true;
  $('.fortune-stage').hidden = true;
  $('#revealArea').hidden = false;
  $('#revealDetail').focus({ preventScroll: true });
};
$('#revealDetail').onclick = () => { if (drawn) detail(drawn.product); };

const address = '广东省揭阳市榕城区进贤门街道永革社区北环城路5号南侧第5间';
$('#mapLink').href = 'https://uri.amap.com/search?keyword=' + encodeURIComponent(address) + '&city=' + encodeURIComponent('揭阳') + '&view=map';
$('#copyAddress').onclick = async () => {
  try { await navigator.clipboard.writeText(address); $('#addressStatus').textContent = '地址已复制，可以粘贴到地图里。'; }
  catch { $('#addressStatus').textContent = '请长按或选中上方地址复制。'; }
};

// 三维冰碗：低性能 / 省流设备仍回退实拍。
function modelFallback(message) {
  $('#bowl').classList.remove('model-active');
  $('#viewerStatus').textContent = message;
  $('#btn-rotate').hidden = true; $('#btn-reset').hidden = true; $('#retryModel').hidden = false;
}
let modelTimer;
function loadModel(force = false) {
  if (modelStarted) return;
  const slow = (navigator.deviceMemory && navigator.deviceMemory <= 2) || (navigator.connection && navigator.connection.saveData);
  if (slow && !force) { modelFallback('先看实拍，也可加载三维冰碗'); return; }
  modelStarted = true;
  $('#viewerStatus').textContent = '冰碗准备中…';
  const script = document.createElement('script');
  script.src = 'model/viewer.js';
  script.id = 'modelScript';
  script.onerror = () => modelFallback('暂时没加载出来，先看看实拍');
  document.body.appendChild(script);
  modelTimer = setTimeout(() => { if (!window.__viewerReady) modelFallback('加载有些慢，可稍后重试'); }, 18000);
}
$('#retryModel').onclick = () => {
  if (!modelStarted) { loadModel(true); return; }
  location.href = location.pathname + '?preview=home&modelRetry=1';
};
window.addEventListener('jili-model-ready', () => {
  clearTimeout(modelTimer);
  $('#bowl').classList.add('model-active');
  $('#viewerStatus').textContent = '拖动冰碗，转一转';
  $('#btn-rotate').hidden = false; $('#btn-reset').hidden = false; $('#retryModel').hidden = true;
  // 模型若在别的页面才加载完，立即暂停渲染，避免后台空转。
  if (window.__viewerSetLoop) window.__viewerSetLoop(!$('#home').hidden);
});
window.addEventListener('error', e => { if (e.filename?.includes('viewer.js')) modelFallback('三维暂不可用，先看看实拍'); });

// 关键改动：封面还在展示时就加载并跑起模型，进入首页时只做淡入，不再"卡"出冰碗。
function warmModel() {
  const start = () => loadModel(new URLSearchParams(location.search).has('modelRetry'));
  if ('requestIdleCallback' in window) requestIdleCallback(start, { timeout: 1200 });
  else setTimeout(start, 350);
}

async function enter(skip = false) {
  if (entered) return;
  entered = true;
  const cover = $('#cover'), site = $('#site');
  site.classList.remove('site-pending');
  site.removeAttribute('aria-hidden');
  document.body.classList.remove('is-cover');
  page(location.hash.slice(1) || 'home');
  if (!skip && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    cover.classList.add('leaving');
    await new Promise(r => setTimeout(r, 460));
  }
  cover.hidden = true;
}
window.addEventListener('message', event => {
  if (event.source === $('#cover iframe').contentWindow && event.data === 'enter-jili') enter();
});
if (new URLSearchParams(location.search).get('preview') === 'home') enter(true);
warmModel();

let shakeAudio = null, soundEnabled = true;
$('#soundToggle').onclick = () => {
  soundEnabled = !soundEnabled;
  $('#soundToggle').setAttribute('aria-pressed', String(soundEnabled));
  $('#soundToggle').textContent = '声音：' + (soundEnabled ? '开' : '关');
};
function playShakeSound() {
  if (!soundEnabled) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (!Audio) return;
    shakeAudio ??= new Audio();
    shakeAudio.resume().catch(() => { });
    for (let i = 0; i < 7; i++) {
      const t = shakeAudio.currentTime + i * .075, o = shakeAudio.createOscillator(), g = shakeAudio.createGain();
      o.type = 'triangle';
      o.frequency.setValueAtTime(530 + (i % 3) * 120, t);
      o.frequency.exponentialRampToValueAtTime(180, t + .055);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.035, t + .003);
      g.gain.exponentialRampToValueAtTime(.0001, t + .065);
      o.connect(g); g.connect(shakeAudio.destination);
      o.start(t); o.stop(t + .07);
    }
  } catch { }
}
