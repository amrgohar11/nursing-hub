// main.js
import { db, auth } from './firebase-config.js';
import { collection, getDocs, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

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
      <p style="color: #ef4444; font-weight: bold; margin-bottom: 15px;">${message || 'حدث خطأ في تحميل البيانات'}</p>
      <button onclick="location.reload()" style="padding: 10px 20px; background: var(--primary); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: bold;">حاول تاني</button>
    </div>
  `;
}

// === 3. تحميل المواد ===
async function loadSubjects() {
  if (!subjectsGrid) return;

  // نعرض الـ Skeleton الأول
  showSkeleton();

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
    if (searchWrapper.classList.contains('active')) searchInput.focus();
  });
}

if (searchInput) {
  searchInput.addEventListener('input', function(e) {
    const searchTerm = e.target.value.toLowerCase();
    const cards = document.querySelectorAll('#subjects-grid .subject-card');
    
    cards.forEach(card => {
      const text = card.textContent.toLowerCase();
      if (text.includes(searchTerm)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
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