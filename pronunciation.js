const $ = (id) => document.getElementById(id);

const select = $('ph-term-select');
const termCard = $('ph-term-card');
const speakBtn = $('ph-speak');
const nextBtn = $('ph-next');
const startBtn = $('ph-start');
const stopBtn = $('ph-stop');
const statusEl = $('ph-status');
const transcriptEl = $('ph-transcript');
const scoreEl = $('ph-score');
const playback = $('ph-playback');

let terms = [];
let selectedTerm = null;
let recorder = null;
let mediaStream = null;
let chunks = [];
let recognition = null;
let recognizedText = '';
let recognitionAvailable = false;
let audioUrl = null;

function normalize(text) {
  return (text || '').toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function similarity(expected, actual) {
  const a = normalize(expected).split(' ').filter(Boolean);
  const b = normalize(actual).split(' ').filter(Boolean);
  if (!a.length || !b.length) return 0;
  const remaining = [...b];
  let matches = 0;
  for (const word of a) {
    const index = remaining.indexOf(word);
    if (index !== -1) {
      matches++;
      remaining.splice(index, 1);
    }
  }
  return Math.round((matches / a.length) * 100);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function renderTerm() {
  if (!selectedTerm) return;
  termCard.innerHTML = '';
  const en = document.createElement('p');
  en.className = 'ph-term-en';
  en.dir = 'ltr';
  en.textContent = selectedTerm.english;
  const ar = document.createElement('p');
  ar.className = 'ph-term-ar';
  ar.textContent = selectedTerm.arabic || 'لا توجد ترجمة مسجلة';
  termCard.append(en, ar);
  speakBtn.disabled = false;
}

function chooseTerm(value) {
  selectedTerm = terms.find((term) => term.id === value) || null;
  renderTerm();
  transcriptEl.textContent = 'لم يتم تسجيل محاولة لهذا المصطلح بعد.';
  scoreEl.hidden = true;
}

async function loadTerms() {
  try {
    const response = await fetch(new URL('terms.html', window.location.href));
    if (!response.ok) throw new Error('تعذر فتح صفحة القاموس.');
    const html = await response.text();
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const cards = [...parsed.querySelectorAll('.subject-card')];

    terms = cards.map((card, index) => ({
      id: String(index),
      english: card.querySelector('.subject-name-ar')?.textContent.trim() || '',
      arabic: card.querySelector('.subject-desc')?.textContent.trim() || ''
    })).filter((term) => term.english);

    if (!terms.length) throw new Error('لم يتم العثور على مصطلحات. تأكد من وجود بطاقات .subject-card في terms.html.');

    select.innerHTML = '';
    for (const term of terms) {
      const option = document.createElement('option');
      option.value = term.id;
      option.textContent = term.english + (term.arabic ? ` — ${term.arabic}` : '');
      select.appendChild(option);
    }
    select.disabled = false;
    nextBtn.disabled = false;
    chooseTerm(terms[0].id);
    setStatus(`تم تحميل ${terms.length} مصطلحًا من القاموس.`);
  } catch (error) {
    select.innerHTML = '<option value="">تعذر تحميل القاموس</option>';
    setStatus(`${error.message} تأكد أن pronunciation.html وterms.html على نفس الموقع.`);
    console.error('[Pronunciation Trainer]', error);
  }
}

select.addEventListener('change', () => chooseTerm(select.value));

speakBtn.addEventListener('click', () => {
  if (!selectedTerm || !('speechSynthesis' in window)) {
    setStatus('ميزة النطق الصوتي غير مدعومة في هذا المتصفح.');
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(selectedTerm.english);
  utterance.lang = 'en-US';
  utterance.rate = 0.82;
  window.speechSynthesis.speak(utterance);
});

nextBtn.addEventListener('click', () => {
  if (!terms.length) return;
  let candidate = terms[Math.floor(Math.random() * terms.length)];
  if (terms.length > 1 && candidate.id === selectedTerm?.id) {
    candidate = terms[(terms.findIndex(t => t.id === candidate.id) + 1) % terms.length];
  }
  select.value = candidate.id;
  chooseTerm(candidate.id);
});

function setupRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const instance = new SpeechRecognition();
  instance.lang = 'en-US';
  instance.continuous = true;
  instance.interimResults = true;
  instance.onresult = (event) => {
    let text = '';
    for (let i = 0; i < event.results.length; i++) {
      text += event.results[i][0].transcript + ' ';
    }
    recognizedText = text.trim();
    transcriptEl.textContent = recognizedText || 'جارٍ انتظار الكلام...';
  };
  instance.onerror = (event) => setStatus(`مشكلة في التعرف الصوتي: ${event.error}`);
  instance.onend = () => {
    if (stopBtn.disabled === false) setStatus('انتهى التعرف الصوتي. اضغط إيقاف لإنهاء المحاولة.');
  };
  return instance;
}

async function startRecording() {
  if (!selectedTerm) return;
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    setStatus('تسجيل الصوت غير مدعوم. استخدم متصفحًا حديثًا واتصالًا آمنًا HTTPS.');
    return;
  }

  try {
    recognizedText = '';
    chunks = [];
    transcriptEl.textContent = 'جارٍ الاستماع...';
    scoreEl.hidden = true;
    mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(mediaStream);
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = URL.createObjectURL(blob);
      playback.src = audioUrl;
      playback.hidden = false;
      mediaStream?.getTracks().forEach(track => track.stop());
      mediaStream = null;
      showResult();
    };

    recorder.start();
    recognition = setupRecognition();
    if (recognition) {
      recognitionAvailable = true;
      try { recognition.start(); } catch (e) { console.warn('Recognition start:', e); }
    } else {
      recognitionAvailable = false;
    }

    startBtn.disabled = true;
    stopBtn.disabled = false;
    setStatus(recognitionAvailable
      ? 'التسجيل والتعرف الصوتي يعملان الآن. انطق المصطلح بالإنجليزية.'
      : 'التسجيل يعمل، لكن التعرف الصوتي غير مدعوم؛ لن يظهر تقييم نصي.');
  } catch (error) {
    setStatus(error.name === 'NotAllowedError'
      ? 'لم تسمح باستخدام الميكروفون. فعّل الإذن من إعدادات المتصفح.'
      : `تعذر بدء التسجيل: ${error.message}`);
  }
}

function stopRecording() {
  if (recognition) {
    try { recognition.stop(); } catch (_) {}
    recognition = null;
  }
  if (recorder && recorder.state !== 'inactive') recorder.stop();
  startBtn.disabled = false;
  stopBtn.disabled = true;
  setStatus('تم إيقاف التسجيل.');
}

function showResult() {
  if (!recognitionAvailable || !recognizedText) {
    transcriptEl.textContent = recognizedText || 'لم يستطع المتصفح تحويل التسجيل إلى نص. يمكنك تشغيل التسجيل والاستماع إليه.';
    scoreEl.hidden = true;
    return;
  }
  const score = similarity(selectedTerm.english, recognizedText);
  transcriptEl.textContent = recognizedText;
  scoreEl.textContent = `تطابق الكلمات التقريبي: ${score}%`;
  scoreEl.hidden = false;
}

startBtn.addEventListener('click', startRecording);
stopBtn.addEventListener('click', stopRecording);

const themeButton = $('ph-theme-toggle');
const savedTheme = localStorage.getItem('theme') || document.documentElement.getAttribute('data-theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);
themeButton.textContent = savedTheme === 'dark' ? '☀️' : '🌙';
themeButton.addEventListener('click', () => {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('theme', next);
  themeButton.textContent = next === 'dark' ? '☀️' : '🌙';
});

window.addEventListener('beforeunload', () => {
  mediaStream?.getTracks().forEach(track => track.stop());
  if (audioUrl) URL.revokeObjectURL(audioUrl);
});

loadTerms();
