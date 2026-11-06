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
    const subjectRef = doc(db, "subjects", subjectId);
    const subjectSnap = await getDoc(subjectRef);

    if (!subjectSnap.exists()) {
      document.getElementById('subject-name-ar').innerText = "المادة غير موجودة!";
      return;
    }

    const subject = subjectSnap.data();
    
    document.getElementById('subject-name-ar').innerText = subject.nameAr;
    document.getElementById('subject-name-en').innerText = subject.name;
    if(subject.icon) document.getElementById('subject-icon').innerText = subject.icon;

    const lecturesRef = collection(db, "subjects", subjectId, "lectures");
    const lecturesSnapshot = await getDocs(lecturesRef);
    
    const lecturesList = document.getElementById('lectures-list');
    lecturesList.innerHTML = '';

    if (lecturesSnapshot.empty) {
      lecturesList.innerHTML = '<p style="text-align: center; color: #64748b; padding: 20px;">لا توجد محاضرات في هذه المادة حتى الآن.</p>';
      return;
    }

    lecturesSnapshot.forEach((doc) => {
      const lecture = doc.data();

      const lectureLink = document.createElement('a');
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

// === كود الوضع الليلي ===
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