// main.js
import { db } from './firebase-config.js';
import { collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const subjectsGrid = document.getElementById('subjects-grid');

async function loadSubjects() {
  try {
    const querySnapshot = await getDocs(collection(db, "subjects"));
    
    if (querySnapshot.empty) {
      subjectsGrid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 40px;">لا توجد مواد حتى الآن. قم بإضافتها من لوحة التحكم.</p>';
      return;
    }

    subjectsGrid.innerHTML = ''; 

    let index = 0;
    querySnapshot.forEach((doc) => {
      const subject = doc.data();
      const card = document.createElement('a');
      card.href = `subject.html?id=${doc.id}`;
      card.className = 'subject-card';
      
      // إضافة أنيميشن الظهور (Fade In) مع تأخير بسيط لكل كارت
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';
      card.style.transition = 'all 0.5s ease';
      
      card.innerHTML = `
        <div class="subject-icon">${subject.icon || '📚'}</div>
        <h2 class="subject-name-ar">${subject.nameAr}</h2>
        <p class="subject-name-en">${subject.name}</p>
        <p class="subject-desc">${subject.description || 'لا يوجد وصف لهذه المادة.'}</p>
        <div class="subject-footer">
          <span class="subject-count">عرض المحاضرات</span>
          <span class="subject-btn">دخول &larr;</span>
        </div>
      `;

      subjectsGrid.appendChild(card);

      // تفعيل الأنيميشن بعد ما الكارت يتضاف للصفحة
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 + (index * 150)); // كل كارت يظهر بعد اللي قبله بـ 150 ملي ثانية

      index++;
    });
  } catch (error) {
    console.error("Error loading subjects: ", error);
    subjectsGrid.innerHTML = '<p style="color:red; text-align:center; grid-column: 1/-1;">حدث خطأ في تحميل البيانات.</p>';
  }
}

loadSubjects();