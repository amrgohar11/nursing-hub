
// main.js
import { db, auth } from './firebase-config.js';
import {
  collection,
  getDocs,
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { daysUntil } from './lib.js';

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  enablePush,
  pushSupported,
  pushEnabled,
  isIOS,
  isStandalone
} from './notifications.js';

const subjectsGrid = document.getElementById('subjects-grid');

// === 1. Skeleton Loading ===
function showSkeleton() {
  if (!subjectsGrid) return;

  let skeletonHTML = '';

  for (let i = 0; i < 6; i++) {
    skeletonHTML += `
      <div class="subject-card skeleton-card">
        <div class="skeleton skeleton-icon"></div>
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short"></div>
      </div>
    `;
  }

  subjectsGrid.innerHTML = skeletonHTML;
}

// === 2. Error Handling ===
function showError(message) {
  if (!subjectsGrid) return;

  subjectsGrid.innerHTML = `
    <div style="grid-column: 1/-1; text-align: center; padding: 40px;">
      <div style="font-size: 50px; margin-bottom: 15px;">⚠️</div>
      <p style="color: #ef4444; font-weight: bold; margin-bottom: 15px;">
        ${message || 'حدث خطأ في تحميل البيانات'}
      </p>
      <button onclick="location.reload()" style="padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">
        حاول تاني
      </button>
    </div>
  `;
}

// === 3. تحميل المواد ===
async function loadSubjects() {
  if (!subjectsGrid) return;

  showSkeleton();

  try {
    const querySnapshot = await getDocs(collection(db, "subjects"));

    if (querySnapshot.empty) {
      subjectsGrid.innerHTML = `
        <p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">
          لا توجد مواد حتى الآن. قم بإضافتها من لوحة التحكم.
        </p>
      `;
      return;
    }

    subjectsGrid.innerHTML = '';

    let index = 0;

    querySnapshot.forEach((subjectDoc) => {
      const subject = subjectDoc.data();

      const card = document.createElement('a');

      card.href = `subject.html?id=${subjectDoc.id}`;
      card.className = 'subject-card';
      card.dataset.year = subject.year || '';
      card.dataset.term = subject.term || '';

      const d = daysUntil(subject.examDate);

      const examHTML = (d !== null && d >= 0)
        ? `<p style="font-size:12px; font-weight:800; color: var(--primary-dark);">
            ⏳ ${d === 0 ? 'الامتحان النهاردة' : 'فاضل ' + d + ' يوم على الامتحان'}
          </p>`
        : '';

      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'all 0.5s ease';

      card.innerHTML = `
        <div class="subject-icon">${subject.icon || '📚'}</div>
        <h2 class="subject-name-ar">${subject.nameAr}</h2>
        <p class="subject-name-en">${subject.name}</p>
        <p class="subject-desc">${subject.description || 'لا يوجد وصف لهذه المادة.'}</p>
        ${examHTML}
        <div class="subject-footer">
          <span class="subject-count">عرض المحاضرات</span>
          <span class="subject-btn">دخول &larr;</span>
        </div>
      `;

      subjectsGrid.appendChild(card);

      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 + (index * 150));

      index++;
    });

    buildFilters();

  } catch (error) {
    console.error("Error loading subjects:", error);
    showError("حدث خطأ في تحميل المواد. تأكد من اتصالك بالإنترنت.");
  }
}

loadSubjects();

// === 4. البحث في المواد ===
const searchToggle = document.getElementById('search-toggle');
const searchWrapper = document.getElementById('search-wrapper');
const searchInput = document.getElementById('search-input');

if (searchToggle) {
  searchToggle.addEventListener('click', () => {
    searchWrapper.classList.toggle('active');

    if (searchWrapper.classList.contains('active')) {
      searchInput.focus();
    }
  });
}

const filterState = {
  year: localStorage.getItem('filterYear') || '',
  term: localStorage.getItem('filterTerm') || ''
};

function applyFilters() {
  const q = (searchInput?.value || '').toLowerCase();

  document.querySelectorAll('#subjects-grid .subject-card').forEach(card => {
    const ok = card.textContent.toLowerCase().includes(q)
      && (!filterState.year || card.dataset.year === filterState.year)
      && (!filterState.term || card.dataset.term === filterState.term);

    card.style.display = ok ? 'flex' : 'none';
  });
}

if (searchInput) {
  searchInput.addEventListener('input', applyFilters);
}

function buildFilters() {
  if (document.getElementById('filters-bar')) return;

  const cards = [...document.querySelectorAll('#subjects-grid .subject-card')];

  const years = [
    ...new Set(cards.map(c => c.dataset.year).filter(Boolean))
  ].sort();

  if (!years.length) return;

  const bar = document.createElement('div');

  bar.id = 'filters-bar';
  bar.style.cssText = 'display:flex; gap:10px; flex-wrap:wrap; margin-bottom:20px;';

  const sel = `
    padding:10px 14px;
    border-radius:12px;
    border:1px solid var(--border);
    background:var(--white);
    color:var(--text);
    font-family:inherit;
    font-weight:700;
  `;

  bar.innerHTML = `
    <select id="filter-year" style="${sel}">
      <option value="">كل الفرق</option>
      ${years.map(y => `<option value="${y}">الفرقة ${y}</option>`).join('')}
    </select>

    <select id="filter-term" style="${sel}">
      <option value="">كل الترمات</option>
      <option value="1">الترم الأول</option>
      <option value="2">الترم الثاني</option>
    </select>
  `;

  subjectsGrid.before(bar);

  const ys = bar.querySelector('#filter-year');
  const ts = bar.querySelector('#filter-term');

  ys.value = filterState.year;
  ts.value = filterState.term;

  ys.addEventListener('change', () => {
    filterState.year = ys.value;
    localStorage.setItem('filterYear', ys.value);
    applyFilters();
  });

  ts.addEventListener('change', () => {
    filterState.term = ts.value;
    localStorage.setItem('filterTerm', ts.value);
    applyFilters();
  });

  applyFilters();
}

// === 5. تحميل الإعلان ===
async function loadAnnouncement() {
  const announcementContent = document.getElementById('announcement-content');
  const announcementBox = document.getElementById('announcement-box');

  if (!announcementContent || !announcementBox) return;

  try {
    const docRef = doc(db, "settings", "announcement");
    const docSnap = await getDoc(docRef);

    if (docSnap.exists() && docSnap.data().text) {
      announcementContent.textContent = docSnap.data().text;
      announcementBox.style.display = 'block';
    } else {
      announcementBox.style.display = 'none';
    }

  } catch (e) {
    announcementBox.style.display = 'none';
  }
}

loadAnnouncement();

// === 6. كود الوضع الليلي ===
const themeToggleBtn = document.getElementById('theme-toggle');
const currentTheme = localStorage.getItem('theme') || 'light';

document.documentElement.setAttribute('data-theme', currentTheme);

if (themeToggleBtn) {
  themeToggleBtn.textContent = currentTheme === 'dark' ? '☀️' : '🌙';

  themeToggleBtn.addEventListener('click', () => {
    const theme = document.documentElement.getAttribute('data-theme');

    const newTheme = theme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);

    themeToggleBtn.textContent = newTheme === 'dark' ? '☀️' : '🌙';
  });
}

// === 7. شريط تفعيل الإشعارات في الصفحة الرئيسية ===
async function initHomePushBanner(user) {
  const banner = document.getElementById('push-banner');
  const enableBtn = document.getElementById('push-banner-enable');
  const laterBtn = document.getElementById('push-banner-later');
  const message = document.getElementById('push-banner-message');

  if (!banner || !enableBtn || !laterBtn || !message) return;

  // مخفي افتراضياً إلى أن نتأكد من أهلية المستخدم
  banner.style.display = 'none';

  // لا نعرضه لو المستخدم غير مسجل
  if (!user) return;

  try {
    // استبعاد الأدمن
    const tokenResult = await user.getIdTokenResult();

    if (tokenResult.claims.admin === true) {
      return;
    }

    // التأكد من وجود حساب طالب
    const studentSnap = await getDoc(doc(db, 'students', user.uid));

    if (!studentSnap.exists()) return;

    const studentData = studentSnap.data();

    // التأكد من أن الاشتراك نشط
    const endDate = studentData.subscriptionEnd?.toDate
      ? studentData.subscriptionEnd.toDate()
      : null;

    if (!endDate || endDate < new Date()) return;

    // لا نكرر ظهور الشريط بعد اختيار لاحقاً خلال نفس الجلسة
    if (sessionStorage.getItem('pushBannerDismissed') === 'true') {
      return;
    }

    // لا نعرض الشريط إذا كانت الإشعارات مفعلة
    if (pushEnabled()) return;

    // التأكد من دعم المتصفح
    const supported = await pushSupported();

    if (!supported) return;

    // iPhone يحتاج تثبيت الموقع على الشاشة الرئيسية
    if (isIOS() && !isStandalone()) {
      message.textContent =
        'على iPhone: ثبّت الموقع على الشاشة الرئيسية من مشاركة ← Add to Home Screen، ثم افتحه من هناك لتفعيل الإشعارات.';

      message.style.display = 'block';
      enableBtn.style.display = 'none';
      banner.style.display = 'block';

      laterBtn.onclick = () => {
        sessionStorage.setItem('pushBannerDismissed', 'true');
        banner.style.display = 'none';
      };

      return;
    }

    // إظهار الشريط للطالب المؤهل فقط
    banner.style.display = 'block';

    enableBtn.onclick = async () => {
      enableBtn.disabled = true;
      enableBtn.textContent = 'جاري التفعيل...';

      message.style.display = 'none';
      message.textContent = '';

      try {
        await enablePush();

        if (pushEnabled()) {
          banner.style.display = 'none';
          sessionStorage.removeItem('pushBannerDismissed');
        } else {
          message.textContent =
            'لم يكتمل التفعيل. تأكد من السماح بالإشعارات من إعدادات المتصفح ثم حاول مرة أخرى.';

          message.style.display = 'block';
          enableBtn.disabled = false;
          enableBtn.textContent = 'حاول التفعيل مرة أخرى';
        }

      } catch (error) {
        console.error('[Home Push Banner] Enable error:', error);

        if (
          error.message === 'denied' ||
          Notification.permission === 'denied'
        ) {
          message.textContent =
            'إذن الإشعارات مرفوض. افتح إعدادات الموقع في المتصفح واسمح بالإشعارات يدوياً.';

          enableBtn.style.display = 'none';
        } else {
          message.textContent =
            'حصل خطأ أثناء تفعيل الإشعارات. تأكد من اتصالك بالإنترنت وحاول مرة أخرى.';

          enableBtn.disabled = false;
          enableBtn.textContent = 'حاول مرة أخرى';
        }

        message.style.display = 'block';
      }
    };

    // إخفاء الشريط مؤقتاً
    laterBtn.onclick = () => {
      sessionStorage.setItem('pushBannerDismissed', 'true');
      banner.style.display = 'none';
    };

  } catch (error) {
    console.error('[Home Push Banner] Initialization error:', error);
    banner.style.display = 'none';
  }
}

// متابعة تسجيل الدخول والتحقق من الطالب
onAuthStateChanged(auth, (user) => {
  initHomePushBanner(user);
});

// === 8. كارت "كمّل من حيث وقفت" + شريط التقدم ===
async function loadUserProgress() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const studentDoc = await getDoc(doc(db, "students", user.uid));

      if (!studentDoc.exists()) return;

      const data = studentDoc.data();
      const completed = data.completedLectures || [];

      // === 1. كارت "كمّل من حيث وقفت" ===
      if (completed.length > 0) {
        const lastLectureId = completed[completed.length - 1];

        const subjectsSnap = await getDocs(collection(db, "subjects"));

        for (const subDoc of subjectsSnap.docs) {
          const lecRef = doc(
            db,
            "subjects",
            subDoc.id,
            "lectures",
            lastLectureId
          );

          const lecSnap = await getDoc(lecRef);

          if (lecSnap.exists()) {
            const lecData = lecSnap.data();

            const continueCard = document.getElementById('continue-card');
            const continueLink = document.getElementById('continue-link');
            const continueTitle = document.getElementById('continue-title');

            if (continueCard && continueLink && continueTitle) {
              continueTitle.textContent = lecData.title;

              continueLink.href =
                `lecture.html?subjectId=${subDoc.id}&file=${lecData.fileName}&id=${lastLectureId}`;

              continueCard.style.display = 'block';
            }

            break;
          }
        }
      }

      // === 2. شريط التقدم لكل مادة ===
      const subjectsSnap = await getDocs(collection(db, "subjects"));

      for (const subDoc of subjectsSnap.docs) {
        const subjectId = subDoc.id;

        const lecturesSnap = await getDocs(
          collection(db, "subjects", subjectId, "lectures")
        );

        const totalLectures = lecturesSnap.size;
        let completedCount = 0;

        lecturesSnap.forEach((lecDoc) => {
          if (completed.includes(lecDoc.id)) {
            completedCount++;
          }
        });

        if (totalLectures > 0) {
          const percent = Math.round(
            (completedCount / totalLectures) * 100
          );

          const card = document.querySelector(
            `a[href="subject.html?id=${subjectId}"]`
          );

          if (card && !card.querySelector('.progress-bar-container')) {
            const progressHTML = `
              <div class="progress-bar-container" style="margin-top: 15px;">
                <div style="display: flex; justify-content: space-between; font-size: 12px; font-weight: bold; color: var(--text-muted); margin-bottom: 5px;">
                  <span>${completedCount} من ${totalLectures} محاضرة</span>
                  <span>${percent}%</span>
                </div>

                <div style="width: 100%; height: 8px; background: var(--border); border-radius: 5px; overflow: hidden;">
                  <div style="width: ${percent}%; height: 100%; background: linear-gradient(90deg, var(--primary), var(--success)); border-radius: 5px; transition: width 1s ease;"></div>
                </div>
              </div>
            `;

            card.insertAdjacentHTML('beforeend', progressHTML);
          }
        }
      }

    } catch (error) {
      console.error("Error loading user progress:", error);
    }
  });
}

loadUserProgress();
