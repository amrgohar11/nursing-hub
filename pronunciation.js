// pronunciation.js — مدرب النطق الطبي: سماع + تسجيل + تقييم + ترجمة ما قلته من القاموس
const $ = (id) => document.getElementById(id);
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

let terms = [];                 // {en, ar, note, key}
const index = new Map();        // key (normalized en) → term
let current = null;
let recog = null, recorder = null, stream = null, playbackUrl = null;
let heard = [], recErr = '', active = false;

/* ───────── أدوات ───────── */
const clean = (s) => s.replace(/\(.*?\)/g, ' ').replace(/\s+/g, ' ').trim();           // "Intravenous (IV)" → "Intravenous"
const norm = (s) => s.toLowerCase().replace(/\(.*?\)/g, ' ').replace(/[^a-z0-9\s']/g, ' ').replace(/\s+/g, ' ').trim();
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const status = (t) => { $('ph-status').textContent = t; };

function sim(a, b) {            // تشابه 0..1 (Levenshtein)
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}

/* ستايل بسيط للعناصر اللي بتتولد من الـ JS */
document.head.appendChild(Object.assign(document.createElement('style'), { textContent: `
  .ph-t-en{font-size:26px;font-weight:900;direction:ltr;text-align:center;color:var(--primary,#0d9488);margin:0}
  .ph-t-ar{font-size:20px;font-weight:800;text-align:center;margin:6px 0 0}
  .ph-t-note{text-align:center;color:var(--text-muted,#64748b);margin:6px 0 0;line-height:1.7}
  .ph-tr{margin-top:14px;padding:14px;border-radius:14px;border:1px dashed var(--primary,#0d9488)}
  .ph-tr h3{margin:0 0 8px;font-size:16px}
  .ph-tr p{margin:4px 0;line-height:1.8}
  .ph-tr .en{direction:ltr;unicode-bidi:embed;font-weight:800}
  .ph-alt{direction:ltr;text-align:left;color:var(--text-muted,#64748b);font-size:14px}
` }));

/* ───────── تحميل القاموس من terms.html ───────── */
async function loadTerms() {
  try {
    const res = await fetch('terms.html', { cache: 'no-cache' });
    if (!res.ok) throw new Error(res.status);
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    terms = [...doc.querySelectorAll('.subject-card')].map((c) => {
      const en = c.querySelector('.subject-name-ar')?.textContent.trim() || '';
      return { en, ar: c.querySelector('.subject-desc')?.textContent.trim() || '',
               note: c.querySelector('small')?.textContent.trim() || '', key: norm(en) };
    }).filter((t) => t.en && t.key);
    if (!terms.length) throw new Error('empty');
    terms.forEach((t) => index.set(t.key, t));

    const sel = $('ph-term-select');
    sel.replaceChildren(...terms.map((t, i) => Object.assign(new Option(`${t.en} — ${t.ar}`, i))));
    ['ph-speak', 'ph-next'].forEach((id) => ($(id).disabled = false));
    pick(0);
  } catch (e) {
    console.error(e);
    $('ph-term-select').replaceChildren(new Option('تعذر تحميل القاموس', ''));
    $('ph-term-card').replaceChildren(el('p', 'ph-muted', 'تأكد إن terms.html في نفس المجلد وإن الصفحة بتتفتح من نفس الموقع (مش file://).'));
  }
}

function pick(i) {
  current = terms[i];
  $('ph-term-select').value = i;
  $('ph-term-card').replaceChildren(
    el('p', 'ph-t-en', current.en), el('p', 'ph-t-ar', current.ar), el('p', 'ph-t-note', current.note));
  resetResult();
}

function resetResult() {
  $('ph-transcript').textContent = 'لم يتم تسجيل محاولة بعد.';
  $('ph-score').hidden = true;
  $('ph-translation')?.remove();
  $('ph-playback').hidden = true;
}

/* ───────── النطق ───────── */
function speak() {
  if (!current || !('speechSynthesis' in window)) return status('المتصفح مش بيدعم النطق الصوتي.');
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(clean(current.en));
  u.lang = 'en-US'; u.rate = 0.85;
  const v = speechSynthesis.getVoices().find((x) => /^en[-_]US/i.test(x.lang)) || speechSynthesis.getVoices().find((x) => /^en/i.test(x.lang));
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

/* ───────── التسجيل والتعرف ───────── */
async function start() {
  if (!current) return;
  if (!SR) return status('التعرف على الكلام مش مدعوم في المتصفح ده. جرّب Chrome أو Edge.');
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: true }); }
  catch (_) { return status('لازم تسمح باستخدام الميكروفون.'); }

  resetResult();
  heard = []; recErr = ''; active = true;

  try {                                   // تسجيل الصوت للإعادة (لو فشل مش مشكلة)
    const chunks = [];
    recorder = new MediaRecorder(stream);
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    recorder.onstop = () => {
      stream?.getTracks().forEach((t) => t.stop());
      if (!chunks.length) return;
      if (playbackUrl) URL.revokeObjectURL(playbackUrl);
      playbackUrl = URL.createObjectURL(new Blob(chunks, { type: recorder.mimeType }));
      Object.assign($('ph-playback'), { src: playbackUrl, hidden: false });
    };
    recorder.start();
  } catch (_) { recorder = null; }

  recog = new SR();
  recog.lang = 'en-US'; recog.interimResults = false; recog.maxAlternatives = 5; recog.continuous = false;
  recog.onresult = (e) => { heard = [...e.results[e.results.length - 1]].map((a) => a.transcript.trim()).filter(Boolean); };
  recog.onerror = (e) => { recErr = e.error; };
  recog.onend = finish;
  recog.start();

  $('ph-start').disabled = true; $('ph-stop').disabled = false;
  status(`بسجّل... انطق: ${clean(current.en)}`);
}

function stop() {
  try { recog?.stop(); } catch (_) {}
}

function finish() {
  if (!active) return;
  active = false;
  if (recorder && recorder.state !== 'inactive') recorder.stop(); else stream?.getTracks().forEach((t) => t.stop());
  $('ph-start').disabled = false; $('ph-stop').disabled = true;
  status('تم التسجيل.');
  evaluate();
}

/* ───────── الترجمة من القاموس ───────── */
function translate(text) {
  const n = norm(text);
  if (!n) return null;
  if (index.has(n)) return { kind: 'exact', term: index.get(n) };

  let best = null, bs = 0;
  for (const t of terms) { const s = sim(n, t.key); if (s > bs) { bs = s; best = t; } }
  if (best && bs >= 0.72) return { kind: 'close', term: best, score: bs };

  const words = [...new Set(n.split(' '))].map((w) => index.get(w)).filter(Boolean);
  if (words.length) return { kind: 'words', list: words };
  return null;
}

function evaluate() {
  const tr = $('ph-transcript');
  if (!heard.length) {
    tr.textContent = recErr === 'not-allowed' ? 'المتصفح منع التعرف على الكلام. اسمح بالميكروفون.'
      : recErr === 'network' ? 'التعرف على الكلام محتاج اتصال إنترنت.'
      : 'ما سمعتش كلام واضح. جرّب تاني وقرّب من الميكروفون.';
    $('ph-score').hidden = true;
    return;
  }

  // ما سمعه المتصفح
  tr.replaceChildren(el('div', null, `سمعتك تقول: «${heard[0]}»`));
  if (heard.length > 1) tr.appendChild(el('div', 'ph-alt', 'احتمالات تانية: ' + heard.slice(1).join(' | ')));

  // التقييم مقابل المصطلح المطلوب
  const pct = Math.round(sim(norm(heard[0]), norm(current.en)) * 100);
  const label = pct >= 85 ? 'ممتاز 👏' : pct >= 65 ? 'جيد، قرّب 👍' : 'حاول تاني 🔁';
  const sc = $('ph-score');
  sc.hidden = false;
  sc.textContent = `التطابق مع «${clean(current.en)}»: ${pct}% — ${label}`;

  // الترجمة (أول احتمال له معنى في القاموس)
  let found = null, said = '';
  for (const h of heard) { found = translate(h); if (found) { said = h; break; } }
  const box = el('div', 'ph-tr'); box.id = 'ph-translation';
  box.appendChild(el('h3', null, '🌐 معنى اللي قلته'));
  if (!found) {
    box.appendChild(el('p', 'ph-muted', 'مفيش مصطلح في القاموس مطابق لكلامك. جرّب تنطق مصطلح واحد بوضوح.'));
  } else if (found.kind === 'words') {
    found.list.forEach((t) => box.appendChild(el('p', null, `${t.en} ← ${t.ar}`)));
  } else {
    const t = found.term;
    if (found.kind === 'close') box.appendChild(el('p', 'ph-muted', `أقرب مصطلح لكلامك («${said}»):`));
    box.appendChild(el('p', 'en', t.en));
    box.appendChild(el('p', null, `المعنى: ${t.ar}`));
    if (t.note) box.appendChild(el('p', 'ph-muted', t.note));
  }
  $('ph-result').appendChild(box);
}

/* ───────── الأحداث ───────── */
$('ph-term-select').addEventListener('change', (e) => e.target.value !== '' && pick(+e.target.value));
$('ph-speak').addEventListener('click', speak);
$('ph-next').addEventListener('click', () => pick(Math.floor(Math.random() * terms.length)));
$('ph-start').addEventListener('click', start);
$('ph-stop').addEventListener('click', stop);
speechSynthesis?.addEventListener?.('voiceschanged', () => {});

const tb = $('ph-theme-toggle');
const setTheme = (t) => { document.documentElement.setAttribute('data-theme', t); localStorage.setItem('theme', t); tb.textContent = t === 'dark' ? '☀️' : '🌙'; };
setTheme(localStorage.getItem('theme') || 'light');
tb.addEventListener('click', () => setTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'));

loadTerms();