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

// === 2. البحث في المواد (مع فتح وقفل الأيقونة) ===
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

// === 3. تحميل الإعلان ===
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

// === 4. كود الوضع الليلي ===
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