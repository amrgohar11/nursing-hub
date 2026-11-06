// admin.js
import { db, auth } from './firebase-config.js';
import { doc, setDoc, collection, getDocs, deleteDoc, updateDoc, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// === 0. الحماية ===
onAuthStateChanged(auth, (user) => {
  if (!user) window.location.href = 'login.html';
});

// === 1. إضافة مادة جديدة ===
const formSubject = document.getElementById('add-subject-form');
const msgSub = document.getElementById('msg');

formSubject.addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('sub-id').value.trim();
  const name = document.getElementById('sub-name').value.trim();
  const nameAr = document.getElementById('sub-name-ar').value.trim();
  const description = document.getElementById('sub-desc').value.trim();
  const icon = document.getElementById('sub-icon').value.trim();

  msgSub.textContent = 'جاري الإضافة...';
  msgSub.style.color = '#0077b6';

  try {
    await setDoc(doc(db, "subjects", id), {
      name, nameAr, description, icon: icon || '📚', createdAt: new Date()
    });
    msgSub.textContent = 'تم إضافة المادة بنجاح! ✅';
    msgSub.style.color = 'green';
    formSubject.reset();
    loadDashboardData(); // تحديث الإحصائيات والجدول
  } catch (error) {
    msgSub.textContent = 'حدث خطأ! ❌';
    msgSub.style.color = 'red';
  }
});

// === 2. جلب المواد للمنسدلة ===
async function loadSubjectsForDropdown() {
  const select = document.getElementById('lec-subject-id');
  select.innerHTML = '<option value="">-- اختر المادة --</option>';
  const querySnapshot = await getDocs(collection(db, "subjects"));
  querySnapshot.forEach((doc) => {
    const subject = doc.data();
    const option = document.createElement('option');
    option.value = doc.id;
    option.textContent = `${subject.icon || ''} ${subject.nameAr}`;
    select.appendChild(option);
  });
}

// === 3. إضافة محاضرة ===
const formLecture = document.getElementById('add-lecture-form');
const msgLec = document.getElementById('msg-lec');

formLecture.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subjectId = document.getElementById('lec-subject-id').value;
  const title = document.getElementById('lec-title').value.trim();
  const fileName = document.getElementById('lec-file').value.trim();

  if (!subjectId) return alert('اختر المادة أولاً!');

  msgLec.textContent = 'جاري الإضافة...';
  msgLec.style.color = '#0077b6';

  try {
    const lecId = Date.now().toString();
    await setDoc(doc(db, "subjects", subjectId, "lectures", lecId), {
      title: title,
      fileName: fileName,
      views: 0, // عشان نحسب عدد المشاهدات
      createdAt: new Date()
    });
    msgLec.textContent = 'تم إضافة المحاضرة! ✅';
    msgLec.style.color = 'green';
    formLecture.reset();
    loadDashboardData(); // تحديث الجدول
  } catch (error) {
    msgLec.textContent = 'حدث خطأ! ❌';
    msgLec.style.color = 'red';
  }
});

// === 4. تسجيل الخروج ===
document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
  e.preventDefault();
  await signOut(auth);
  window.location.href = 'index.html';
});

// === 5. تحميل الإحصائيات والجدول ===
async function loadDashboardData() {
  const subjectsSnap = await getDocs(collection(db, "subjects"));
  let totalSubjects = subjectsSnap.size;
  let totalLectures = 0;
  let totalViews = 0;

  const tableBody = document.getElementById('lectures-table-body');
  tableBody.innerHTML = '';

  for (const subjectDoc of subjectsSnap.docs) {
    const subject = subjectDoc.data();
    const lecturesSnap = await getDocs(collection(db, "subjects", subjectDoc.id, "lectures"));
    
    totalLectures += lecturesSnap.size;

    lecturesSnap.forEach((lecDoc) => {
      const lec = lecDoc.data();
      totalViews += (lec.views || 0); // بنجمع المشاهدات

      // إضافة صف في الجدول
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${lec.title}</strong></td>
        <td><span class="badge badge-subject">${subject.icon || ''} ${subject.nameAr}</span></td>
        <td><span class="badge badge-file">${lec.fileName}</span></td>
        <td>${lec.views || 0}</td>
        <td><button class="btn-delete" onclick="deleteLecture('${subjectDoc.id}', '${lecDoc.id}')">حذف</button></td>
      `;
      tableBody.appendChild(tr);
    });
  }

  // تحديث الكروت
  document.getElementById('total-subjects').textContent = totalSubjects;
  document.getElementById('total-lectures').textContent = totalLectures;
  document.getElementById('total-views').textContent = totalViews;
  
  loadSubjectsForDropdown();
}

// === 6. حذف محاضرة (دالة عامة عشان تتنادى من HTML) ===
window.deleteLecture = async (subjectId, lectureId) => {
  if (confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) {
    try {
      await deleteDoc(doc(db, "subjects", subjectId, "lectures", lectureId));
      alert('تم الحذف بنجاح!');
      loadDashboardData(); // نحدث الجدول
    } catch (error) {
      alert('حدث خطأ أثناء الحذف!');
    }
  }
};

// === 7. تشغيل الداشبورد أول ما الصفحة تفتح ===
loadDashboardData();

// === 8. كود الوضع الليلي ===
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