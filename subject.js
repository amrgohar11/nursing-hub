// subject.js
import { db } from './firebase-config.js';
import { doc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const urlParams = new URLSearchParams(window.location.search);
const subjectId = urlParams.get('id');

async function loadSubjectData() {
  if (!subjectId) {
    document.getElementById('subject-name-ar').innerText = "خطأ: لم يتم تحديد المادة";
    return;
  }

  try {
    // 1. جلب بيانات المادة
    const subjectRef = doc(db, "subjects", subjectId);
    const subjectSnap = await getDoc(subjectRef);

    if (!subjectSnap.exists()) {
      document.getElementById('subject-name-ar').innerText = "المادة غير موجودة!";
      return;
    }

    const subject = subjectSnap.data();
    
    // عرض بيانات المادة
    document.getElementById('subject-name-ar').innerText = subject.nameAr;
    document.getElementById('subject-name-en').innerText = subject.name;
    if(subject.icon) document.getElementById('subject-icon').innerText = subject.icon;

    // 2. جلب المحاضرات
    const lecturesRef = collection(db, "subjects", subjectId, "lectures");
    const lecturesSnapshot = await getDocs(lecturesRef);
    
    const lecturesList = document.getElementById('lectures-list');
    lecturesList.innerHTML = '';

    if (lecturesSnapshot.empty) {
      lecturesList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">لا توجد محاضرات في هذه المادة حتى الآن.</p>';
      return;
    }

    // عرض المحاضرات
    lecturesSnapshot.forEach((doc) => {
      const lecture = doc.data();

      const lectureLink = document.createElement('a');
      // ✅ هنا التعديل: بنبعت اسم الملف (fileName) عشان صفحة lecture.html تعرف تجيبه
      lectureLink.href = `lecture.html?subjectId=${subjectId}&file=${lecture.fileName}`;
      lectureLink.className = 'lecture-item';
      
      lectureLink.innerHTML = `
        <div class="lecture-title">
          <span>📄</span> ${lecture.title}
        </div>
        <span class="lecture-action">فتح &larr;</span>
      `;

      lecturesList.appendChild(lectureLink);
    });

  } catch (error) {
    console.error("Error:", error);
    document.getElementById('subject-name-ar').innerText = "حدث خطأ أثناء التحميل";
  }
}

loadSubjectData();