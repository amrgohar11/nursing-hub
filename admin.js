// admin.js
import { db, auth } from './firebase-config.js';
import { doc, setDoc, getDoc, collection, getDocs, deleteDoc, updateDoc, increment, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { esc, callNotify } from './lib.js';

// === 0. الحماية (التحقق من الأدمن) ===
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login.html';
    return;
  }
  
  // بنجيب الـ Token عشان نشوف هل فيه Custom Claim اسمه admin
  const tokenResult = await user.getIdTokenResult();
  
  if (tokenResult.claims.admin === true) {
    // لو أدمن، نظهر المحتوى
    document.getElementById('admin-main').style.display = 'block';
  } else {
    // لو مش أدمن، نطرده للرئيسية
    alert('غير مصرح لك بالدخول!');
    window.location.href = 'index.html';
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
  const year = parseInt(document.getElementById('sub-year').value) || null;
  const term = parseInt(document.getElementById('sub-term').value) || null;
  const examDate = document.getElementById('sub-exam').value || null;

  msgSub.textContent = 'جاري الإضافة...';
  msgSub.style.color = '#0077b6';

  try {
    await setDoc(doc(db, "subjects", id), {
      name, nameAr, description, icon: icon || '📚', year, term, examDate, createdAt: new Date()
    });
    msgSub.textContent = 'تم إضافة المادة بنجاح! ✅';
    msgSub.style.color = 'green';
    formSubject.reset();
    loadDashboardData();
    loadSubjectsTable();
  } catch (error) {
    msgSub.textContent = 'حدث خطأ! ❌';
    msgSub.style.color = 'red';
  }
});

// === 2. جلب المواد للمنسدلة ===
async function loadSubjectsForDropdown() {
  const select = document.getElementById('lec-subject-id');
  if (!select) return;
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
      views: 0,
      createdAt: new Date()
    });
    msgLec.textContent = 'تم إضافة المحاضرة! ✅';
    if (confirm('تبعت إشعار للطلاب بالمحاضرة الجديدة؟')) notifyPush({ type: 'lecture', subjectId, lectureId: lecId, fileName, title });
    msgLec.style.color = 'green';
    formLecture.reset();
    loadDashboardData();
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
  if (tableBody) tableBody.innerHTML = '';

  for (const subjectDoc of subjectsSnap.docs) {
    const subject = subjectDoc.data();
    const lecturesSnap = await getDocs(collection(db, "subjects", subjectDoc.id, "lectures"));
    
    totalLectures += lecturesSnap.size;

    lecturesSnap.forEach((lecDoc) => {
      const lec = lecDoc.data();
      totalViews += (lec.views || 0);

      if (tableBody) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><strong>${lec.title}</strong></td>
          <td><span class="badge badge-subject">${subject.icon || ''} ${subject.nameAr}</span></td>
          <td><span class="badge badge-file">${lec.fileName}</span></td>
          <td>${lec.views || 0}</td>
          <td><button class="btn-delete" onclick="deleteLecture('${subjectDoc.id}', '${lecDoc.id}')">حذف</button></td>
        `;
        tableBody.appendChild(tr);
      }
    });
  }

  const elSub = document.getElementById('total-subjects');
  const elLec = document.getElementById('total-lectures');
  const elViews = document.getElementById('total-views');
  if (elSub) elSub.textContent = totalSubjects;
  if (elLec) elLec.textContent = totalLectures;
  if (elViews) elViews.textContent = totalViews;
  
  loadSubjectsForDropdown();
}

// === 6. حذف محاضرة ===
window.deleteLecture = async (subjectId, lectureId) => {
  if (confirm('هل أنت متأكد من حذف هذه المحاضرة؟')) {
    try {
      await deleteDoc(doc(db, "subjects", subjectId, "lectures", lectureId));
      alert('تم الحذف بنجاح!');
      loadDashboardData();
    } catch (error) {
      alert('حدث خطأ أثناء الحذف!');
    }
  }
};

// === 7. إدارة الطلاب والاشتراكات ===
async function loadStudents() {
  const tableBody = document.getElementById('students-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">جاري تحميل الطلاب...</td></tr>';

  try {
    const studentsSnap = await getDocs(collection(db, "students"));
    tableBody.innerHTML = '';

    if (studentsSnap.empty) {
      tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا يوجد طلاب مسجلين حتى الآن.</td></tr>';
      return;
    }

    studentsSnap.forEach((docSnap) => {
      const student = docSnap.data();
      const studentId = docSnap.id;
      
      const endDate = student.subscriptionEnd ? student.subscriptionEnd.toDate() : null;
      const isActive = endDate && endDate > new Date();
      const dateStr = endDate ? endDate.toLocaleDateString('ar-EG') : 'غير محدد';

      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${student.name}</strong></td>
        <td>${student.email}</td>
        <td>${dateStr}</td>
        <td>
          <span class="badge" style="background: ${isActive ? '#d1fae5' : '#fee2e2'}; color: ${isActive ? '#065f46' : '#991b1b'};">
            ${isActive ? 'نشط' : 'منتهي'}
          </span>
        </td>
        <td style="display: flex; gap: 5px;">
          <button class="btn-delete" style="background: #0284c7; color: white;" onclick="renewStudent('${studentId}')">تجديد</button>
          <button class="btn-delete" style="background: #f59e0b; color: white;" onclick="stopStudent('${studentId}')">إيقاف</button>
          <button class="btn-delete" onclick="deleteStudent('${studentId}')">حذف</button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

  } catch (error) {
    console.error("Error loading students:", error);
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:red;">حدث خطأ أثناء التحميل.</td></tr>';
  }
}

window.renewStudent = async (studentId) => {
  const monthsInput = prompt('اكتب عدد الشهور اللي عايز تجدد بيها (مثال: 3، 6، 12):', '3');
  if (monthsInput === null || monthsInput === '') return;

  const months = parseInt(monthsInput);
  if (isNaN(months) || months <= 0) {
    alert('من فضلك اكتب رقم صحيح للشهور!');
    return;
  }

  const newDate = new Date();
  newDate.setMonth(newDate.getMonth() + months);

  try {
    await updateDoc(doc(db, "students", studentId), {
      subscriptionEnd: newDate
    });
    alert(`تم تجديد الاشتراك لمدة ${months} شهر بنجاح!`);
    loadStudents();
  } catch (error) {
    console.error(error);
    alert('حدث خطأ أثناء التجديد!');
  }
};

window.stopStudent = async (studentId) => {
  if (!confirm('هل أنت متأكد من إيقاف اشتراك هذا الطالب؟')) return;
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 1);

  try {
    await updateDoc(doc(db, "students", studentId), {
      subscriptionEnd: pastDate
    });
    alert('تم إيقاف الاشتراك!');
    loadStudents();
  } catch (error) {
    alert('حدث خطأ!');
  }
};

window.deleteStudent = async (studentId) => {
  if (!confirm('هل أنت متأكد من حذف هذا الطالب نهائياً؟')) return;
  try {
    await deleteDoc(doc(db, "students", studentId));
    alert('تم حذف الطالب!');
    loadStudents();
  } catch (error) {
    alert('حدث خطأ أثناء الحذف!');
  }
};

// === 8. إدارة الإعلان ===
const announcementForm = document.getElementById('announcement-form');
const announcementText = document.getElementById('announcement-text');
const announcementMsg = document.getElementById('announcement-msg');

async function loadAnnouncement() {
  if (!announcementText) return;
  const docRef = doc(db, "settings", "announcement");
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    announcementText.value = docSnap.data().text || '';
  }
}
loadAnnouncement();

announcementForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = announcementText.value.trim();
  announcementMsg.textContent = 'جاري الحفظ...';
  announcementMsg.style.color = '#0077b6';

  try {
    await setDoc(doc(db, "settings", "announcement"), { text: text });
    announcementMsg.textContent = 'تم حفظ الإعلان! ✅';
    if (text && confirm('تبعت إشعار للطلاب بالإعلان؟')) notifyPush({ type: 'announcement', text });
    announcementMsg.style.color = 'green';
  } catch (error) {
    announcementMsg.textContent = 'حدث خطأ! ❌';
    announcementMsg.style.color = 'red';
  }
});

// === 9. إدارة المواد (عرض وحذف) ===
async function loadSubjectsTable() {
  const tableBody = document.getElementById('subjects-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">جاري تحميل المواد...</td></tr>';

  try {
    const subjectsSnap = await getDocs(collection(db, "subjects"));
    tableBody.innerHTML = '';

    if (subjectsSnap.empty) {
      tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;">لا توجد مواد حتى الآن.</td></tr>';
      return;
    }

    for (const subjectDoc of subjectsSnap.docs) {
      const subject = subjectDoc.data();
      const lecturesSnap = await getDocs(collection(db, "subjects", subjectDoc.id, "lectures"));
      
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${subject.icon || ''} ${subject.nameAr}</strong></td>
        <td>${subject.name}</td>
        <td>${subject.year ? 'ف' + subject.year : '-'} / ${subject.term ? 'ت' + subject.term : '-'}</td>
        <td>${subject.examDate || '-'}</td>
        <td>${lecturesSnap.size}</td>
        <td style="display:flex; gap:5px;">
          <button class="btn-delete" style="background:#0284c7; color:white;" onclick="editSubjectMeta('${subjectDoc.id}')">الفرقة/الترم</button>
          <button class="btn-delete" style="background:#f59e0b; color:white;" onclick="editExam('${subjectDoc.id}')">الامتحان</button>
          <button class="btn-delete" onclick="deleteSubject('${subjectDoc.id}')">حذف</button>
        </td>
      `;
      tableBody.appendChild(tr);
    }
  } catch (error) {
    console.error("Error loading subjects table:", error);
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:red;">حدث خطأ.</td></tr>';
  }
}

window.deleteSubject = async (subjectId) => {
  if (!confirm('هل أنت متأكد من حذف هذه المادة وكل محاضراتها؟ لا يمكن التراجع!')) return;

  try {
    const lecturesSnap = await getDocs(collection(db, "subjects", subjectId, "lectures"));
    const deletePromises = [];
    lecturesSnap.forEach((lecDoc) => {
      deletePromises.push(deleteDoc(doc(db, "subjects", subjectId, "lectures", lecDoc.id)));
    });
    await Promise.all(deletePromises);

    await deleteDoc(doc(db, "subjects", subjectId));

    alert('تم حذف المادة وكل محاضراتها بنجاح!');
    loadSubjectsTable();
    loadDashboardData();
  } catch (error) {
    console.error(error);
    alert('حدث خطأ أثناء الحذف!');
  }
};

// === 10. تشغيل الداشبورد أول ما الصفحة تفتح ===
loadDashboardData();
loadStudents();
loadSubjectsTable();

// === 11. كود الوضع الليلي ===
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

// === 12. إشعارات Push ===
function notifyPush(payload) { return callNotify(auth.currentUser, payload); }

// === 13. فرقة/ترم وموعد الامتحان ===
window.editSubjectMeta = async (subjectId) => {
  const y = prompt('رقم الفرقة (1-4) — اتركه فاضي للمسح:');
  if (y === null) return;
  const t = prompt('رقم الترم (1 أو 2) — اتركه فاضي للمسح:');
  if (t === null) return;
  const year = parseInt(y) || null, term = parseInt(t) || null;
  if ((year && (year < 1 || year > 4)) || (term && (term < 1 || term > 2))) return alert('قيم غير صحيحة!');
  try { await updateDoc(doc(db, "subjects", subjectId), { year, term }); loadSubjectsTable(); }
  catch (e) { alert('حدث خطأ!'); }
};

window.editExam = async (subjectId) => {
  const d = prompt('موعد الامتحان بصيغة YYYY-MM-DD (مثال 2027-01-15) — فاضي للمسح:');
  if (d === null) return;
  if (d && !/^\d{4}-\d{2}-\d{2}$/.test(d.trim())) return alert('الصيغة غلط!');
  try { await updateDoc(doc(db, "subjects", subjectId), { examDate: d.trim() || null }); loadSubjectsTable(); }
  catch (e) { alert('حدث خطأ!'); }
};

// === 14. بلاغات الأخطاء ===
async function loadReports() {
  const body = document.getElementById('reports-table-body');
  if (!body) return;
  try {
    const snap = await getDocs(query(collection(db, "reports"), orderBy("createdAt", "desc")));
    const open = snap.docs.filter(d => d.data().status !== 'done').length;
    document.getElementById('reports-count').textContent = open;
    if (snap.empty) { body.innerHTML = '<tr><td colspan="5" style="text-align:center;">لا توجد بلاغات.</td></tr>'; return; }
    body.innerHTML = snap.docs.map(d => {
      const r = d.data();
      const href = `lecture.html?subjectId=${encodeURIComponent(r.subjectId)}&file=${encodeURIComponent(r.fileName)}&id=${encodeURIComponent(r.lectureId)}`;
      const done = r.status === 'done';
      return `<tr>
        <td><a href="${href}" target="_blank">${esc(r.lectureTitle)}</a></td>
        <td style="max-width:300px;">${esc(r.text)}</td>
        <td>${esc(r.userName)}</td>
        <td><span class="badge" style="background:${done ? '#d1fae5' : '#fee2e2'}; color:${done ? '#065f46' : '#991b1b'};">${done ? 'تم الحل' : 'مفتوح'}</span></td>
        <td style="display:flex; gap:5px;">
          ${done ? '' : `<button class="btn-delete" style="background:#10b981; color:white;" onclick="resolveReport('${d.id}')">تم</button>`}
          <button class="btn-delete" onclick="deleteReport('${d.id}')">حذف</button>
        </td></tr>`;
    }).join('');
  } catch (e) { console.error(e); }
}
window.resolveReport = async (id) => { await updateDoc(doc(db, "reports", id), { status: 'done' }); loadReports(); };
window.deleteReport = async (id) => { if (confirm('حذف البلاغ؟')) { await deleteDoc(doc(db, "reports", id)); loadReports(); } };
loadReports();
