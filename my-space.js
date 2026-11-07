// my-space.js
import { auth, db } from './firebase-config.js';
import { doc, getDoc, updateDoc, deleteDoc, collection, getDocs, query, orderBy, limit } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { esc, dayKey, effectiveStreak, syncLeaderboard } from './lib.js';
import { enablePush, disablePush, pushSupported, pushEnabled, isIOS, isStandalone } from './notifications.js';

const $ = (id) => document.getElementById(id);
let uid = null, student = {};

const lectureHref = (b, id) =>
  `lecture.html?subjectId=${encodeURIComponent(b.subjectId)}&file=${encodeURIComponent(b.fileName)}&id=${encodeURIComponent(id)}`;

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  uid = user.uid;
  const snap = await getDoc(doc(db, 'students', uid));
  student = snap.exists() ? snap.data() : {};
  renderStreak(); renderBadges(); renderBoardControls();
  initPush(); loadBookmarks(); loadNotes(); loadBoard();
});

// ---------- الستريك والهدف ----------
function renderStreak() {
  $('streak-now').textContent = effectiveStreak(student.streak);
  $('streak-best').textContent = `أطول ستريك: ${student.streak?.best || 0} يوم`;
  const goal = student.dailyGoal || 0;
  const done = student.todayStudy?.day === dayKey() ? student.todayStudy.count : 0;
  $('goal-select').value = String(goal);
  $('goal-bar').style.width = goal ? Math.min(100, (done / goal) * 100) + '%' : '0%';
  $('goal-text').textContent = goal ? `${Math.min(done, goal)} من ${goal} محاضرة النهاردة` : 'حدد هدف يومي عشان تتابع تقدمك';
}
$('goal-select').addEventListener('change', async (e) => {
  const v = parseInt(e.target.value, 10) || 0;
  student.dailyGoal = v || null;
  await updateDoc(doc(db, 'students', uid), { dailyGoal: v || null });
  renderStreak();
});

function renderBadges() {
  const b = student.badges || [];
  $('badges').innerHTML = b.length
    ? b.map((x) => `<span class="badge-chip">${esc(x)}</span>`).join('')
    : '<div class="empty">خلّص أول محاضرة وهتاخد أول شارة 🌱</div>';
}

// ---------- الإشعارات ----------
async function initPush() {
  const btn = $('push-btn'), hint = $('push-hint');
  if (isIOS() && !isStandalone()) {
    hint.textContent = 'على iPhone: ثبّت الموقع على الشاشة الرئيسية (مشاركة ← Add to Home Screen) وافتحه من هناك، بعدين فعّل الإشعارات.';
    btn.style.display = 'none'; return;
  }
  if (!(await pushSupported())) { hint.textContent = 'متصفحك مش بيدعم الإشعارات.'; btn.style.display = 'none'; return; }
  const paint = () => {
    const on = pushEnabled();
    btn.textContent = on ? 'إلغاء الإشعارات' : 'تفعيل الإشعارات';
    btn.className = on ? 'btn ghost' : 'btn';
    hint.textContent = on ? 'الإشعارات مفعّلة ✅ (محاضرات جديدة، إعلانات، وردود على تعليقاتك)' : 'هتوصلك إشعارات لما تنزل محاضرة جديدة أو يتغير الإعلان أو حد يرد عليك.';
  };
  paint();
  btn.onclick = async () => {
    btn.disabled = true;
    try {
      if (pushEnabled()) await disablePush(); else await enablePush();
    } catch (e) {
      hint.textContent = e.message === 'denied' ? 'الإذن مرفوض — فعّله من إعدادات المتصفح.' : 'حصل خطأ في التفعيل، جرب تاني.';
      btn.disabled = false; return;
    }
    btn.disabled = false; paint();
  };
}

// ---------- المفضلة ----------
async function loadBookmarks() {
  const box = $('bookmarks');
  const snap = await getDocs(query(collection(db, 'students', uid, 'bookmarks'), orderBy('createdAt', 'desc')));
  if (snap.empty) { box.innerHTML = '<div class="empty">لسه مفيش محاضرات في المفضلة. دوس ☆ جوه أي محاضرة.</div>'; return; }
  box.innerHTML = snap.docs.map((d) => { const b = d.data(); return `
    <div class="row"><a href="${lectureHref(b, d.id)}">📄 ${esc(b.title)}</a>
    <button class="btn danger" data-del-bm="${esc(d.id)}">حذف</button></div>`; }).join('');
}
$('bookmarks').addEventListener('click', async (e) => {
  const id = e.target.dataset.delBm; if (!id) return;
  await deleteDoc(doc(db, 'students', uid, 'bookmarks', id)); loadBookmarks();
});

// ---------- الملاحظات ----------
async function loadNotes() {
  const box = $('notes');
  const snap = await getDocs(query(collection(db, 'students', uid, 'notes'), orderBy('updatedAt', 'desc')));
  if (snap.empty) { box.innerHTML = '<div class="empty">لسه مكتبتش ملاحظات. دوس 📝 جوه أي محاضرة.</div>'; return; }
  box.innerHTML = snap.docs.map((d) => { const n = d.data(); return `
    <div class="row"><a href="${lectureHref(n, d.id)}">📝 ${esc(n.title)}<small>${esc((n.text || '').slice(0, 120))}</small></a>
    <button class="btn danger" data-del-note="${esc(d.id)}">حذف</button></div>`; }).join('');
}
$('notes').addEventListener('click', async (e) => {
  const id = e.target.dataset.delNote; if (!id) return;
  if (!confirm('حذف الملاحظة؟')) return;
  await deleteDoc(doc(db, 'students', uid, 'notes', id)); loadNotes();
});

// ---------- لوحة الشرف ----------
function renderBoardControls() {
  $('nick').value = student.nickname || '';
  $('board-toggle').textContent = student.showOnBoard ? 'اخرج من لوحة الشرف' : 'انضم للوحة الشرف';
  $('board-toggle').className = student.showOnBoard ? 'btn ghost' : 'btn';
}
$('board-toggle').addEventListener('click', async () => {
  const msg = $('board-msg'); msg.textContent = '';
  try {
    if (student.showOnBoard) {
      await deleteDoc(doc(db, 'leaderboard', uid));
      await updateDoc(doc(db, 'students', uid), { showOnBoard: false });
      student.showOnBoard = false;
    } else {
      const nick = $('nick').value.trim();
      if (nick.length < 2 || nick.length > 20) { msg.textContent = 'الاسم المستعار من 2 لـ 20 حرف.'; return; }
      await updateDoc(doc(db, 'students', uid), { nickname: nick, showOnBoard: true });
      student.nickname = nick; student.showOnBoard = true;
      await syncLeaderboard(uid, student);
    }
    renderBoardControls(); loadBoard();
  } catch (e) { console.error(e); msg.textContent = 'حصل خطأ، جرب تاني.'; }
});
async function loadBoard() {
  const box = $('board');
  try {
    const snap = await getDocs(query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(20)));
    if (snap.empty) { box.innerHTML = '<div class="empty">اللوحة فاضية — كن أول المنضمين!</div>'; return; }
    const medals = ['🥇', '🥈', '🥉'];
    box.innerHTML = snap.docs.map((d, i) => { const x = d.data(); return `
      <div class="row ${d.id === uid ? 'me' : ''}"><span>${medals[i] || (i + 1) + '.'} ${esc(x.nickname)}</span>
      <span class="muted">${x.score || 0} محاضرة · 🔥${x.streak || 0}</span></div>`; }).join('');
  } catch (e) { box.innerHTML = '<div class="empty">تعذر تحميل اللوحة.</div>'; }
}

// ---------- الوضع الليلي ----------
const tbtn = $('theme-toggle');
const theme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', theme);
tbtn.textContent = theme === 'dark' ? '☀️' : '🌙';
tbtn.addEventListener('click', () => {
  const n = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', n);
  localStorage.setItem('theme', n);
  tbtn.textContent = n === 'dark' ? '☀️' : '🌙';
});
