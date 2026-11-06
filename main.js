// main.js
import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const subjectsGrid = document.getElementById('subjects-grid');

// === 1. تحميل المواد ===
async function loadSubjects() {
  if (!subjectsGrid) return;

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

      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 100 + (index * 150)); 

      index++;
    });
  } catch (error) {
    console.error("Error loading subjects: ", error);
    subjectsGrid.innerHTML = '<p style="color:red; text-align:center; grid-column: 1/-1;">حدث خطأ في تحميل البيانات.</p>';
  }
}

loadSubjects();

// === 2. تحميل آخر المحاضرات اللي شفتها ===
async function loadRecentLectures() {
  const recentContainer = document.getElementById('recent-lectures');
  if (!recentContainer) return;

  onAuthStateChanged(auth, async (user) => {
    if (!user) return;

    try {
      const studentDoc = await getDoc(doc(db, "students", user.uid));
      if (studentDoc.exists()) {
        const data = studentDoc.data();
        const completed = data.completedLectures || [];
        
        if (completed.length > 0) {
          recentContainer.innerHTML = '';
          
          // عرض آخر 3 محاضرات
          const recent = completed.slice(-3).reverse();
          
          for (const lecId of recent) {
            // بنلف على المواد كلها عشان نلاقي المحاضرة دي فين
            const subjectsSnap = await getDocs(collection(db, "subjects"));
            let found = false;
            
            for (const subDoc of subjectsSnap.docs) {
              const lecRef = doc(db, "subjects", subDoc.id, "lectures", lecId);
              const lecSnap = await getDoc(lecRef);
              
              if (lecSnap.exists()) {
                const lecData = lecSnap.data();
                const subData = subDoc.data();
                
                const card = document.createElement('a');
                card.href = `lecture.html?subjectId=${subDoc.id}&file=${lecData.fileName}&id=${lecId}`;
                card.className = 'subject-card';
                card.innerHTML = `
                  <div style="font-size: 30px; margin-bottom: 10px;">📄</div>
                  <h3 class="subject-name-ar">${lecData.title}</h3>
                  <p style="color: var(--text-muted); font-size: 14px; margin-top: 5px;">${subData.nameAr}</p>
                `;
                recentContainer.appendChild(card);
                found = true;
                break;
              }
            }
            
            if (!found) {
              const card = document.createElement('div');
              card.className = 'subject-card';
              card.innerHTML = `<h3>📄 محاضرة</h3><p style="color:#666;">تفاصيل غير متاحة</p>`;
              recentContainer.appendChild(card);
            }
          }
        } else {
          recentContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #64748b; padding: 20px;">لسه مخلصتش محاضرات. ابدأ مذاكرة الآن!</p>';
        }
      }
    } catch (error) {
      console.error("Error loading recent lectures:", error);
      recentContainer.innerHTML = '<p style="color: red; text-align: center;">حدث خطأ في تحميل المحاضرات.</p>';
    }
  });
}

loadRecentLectures();

// === 3. كود الوضع الليلي ===
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