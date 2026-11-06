// admin.js
import { db, auth } from './firebase-config.js';
import { doc, setDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// === 0. الحماية (التحقق من تسجيل الدخول) ===
onAuthStateChanged(auth, (user) => {
  if (!user) {
    // لو مفيش حد مسجل دخول، يطرده لصفحة اللوجين
    window.location.href = 'login.html';
  }
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
    loadSubjectsForDropdown(); // نحدث القائمة المنسدلة
  } catch (error) {
    console.error(error);
    msgSub.textContent = 'حدث خطأ! تأكد من الـ Firebase Rules ❌';
    msgSub.style.color = 'red';
  }
});

// === 2. جلب المواد للمنسدلة (Dropdown) ===
async function loadSubjectsForDropdown() {
  const select = document.getElementById('lec-subject-id');
  select.innerHTML = '<option value="">-- اختر المادة --</option>';
  
  try {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    querySnapshot.forEach((doc) => {
      const subject = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = `${subject.icon || ''} ${subject.nameAr}`;
      select.appendChild(option);
    });
  } catch (error) {
    console.error("Error loading subjects: ", error);
  }
}

// === 3. إضافة محاضرة جديدة ===
const formLecture = document.getElementById('add-lecture-form');
const msgLec = document.getElementById('msg-lec');

formLecture.addEventListener('submit', async (e) => {
  e.preventDefault();
  const subjectId = document.getElementById('lec-subject-id').value;
  const title = document.getElementById('lec-title').value.trim();
  const fileName = document.getElementById('lec-file').value.trim();

  if (!subjectId) {
    alert('الرجاء اختيار المادة أولاً!');
    return;
  }

  msgLec.textContent = 'جاري الإضافة...';
  msgLec.style.color = '#0077b6';

  try {
    const lecId = Date.now().toString(); // ID عشوائي للمحاضرة
    
    await setDoc(doc(db, "subjects", subjectId, "lectures", lecId), {
      title: title,
      fileName: fileName,
      createdAt: new Date()
    });

    msgLec.textContent = 'تم إضافة المحاضرة بنجاح! ✅';
    msgLec.style.color = 'green';
    formLecture.reset();
    
  } catch (error) {
    console.error(error);
    msgLec.textContent = 'حدث خطأ! ❌';
    msgLec.style.color = 'red';
  }
});

// === 4. تسجيل الخروج ===
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    await signOut(auth);
    window.location.href = 'index.html';
  });
}

// تشغيل جلب المواد أول ما الصفحة تفتح
loadSubjectsForDropdown();