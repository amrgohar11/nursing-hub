// dashboard.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login-student.html';
    return;
  }

  const studentDoc = await getDoc(doc(db, "students", user.uid));
  
  if (studentDoc.exists()) {
    const data = studentDoc.data();
    const endDate = data.subscriptionEnd.toDate();
    const now = new Date();
    const isActive = endDate > now;

    document.getElementById('student-name').textContent = data.name;
    document.getElementById('expiry-date').textContent = endDate.toLocaleDateString('ar-EG');
    
    const statusContainer = document.getElementById('status-container');
    const detailsContainer = document.getElementById('details-container');
    const statusText = document.getElementById('status-text');
    const renewBtn = document.getElementById('renew-btn');

    detailsContainer.classList.remove('hidden');

    if (isActive) {
      statusContainer.innerHTML = '<span class="status-badge status-active">✅ اشتراك نشط</span>';
      statusText.textContent = "نشط";
      statusText.style.color = "#10b981";
      renewBtn.style.display = "none";
    } else {
      statusContainer.innerHTML = '<span class="status-badge status-expired">❌ اشتراك منتهي</span>';
      statusText.textContent = "منتهي";
      statusText.style.color = "#ef4444";
      renewBtn.style.display = "block";
      document.querySelector('.action-btn').style.opacity = '0.5';
      document.querySelector('.action-btn').style.pointerEvents = 'none';
    }
  }
});

document.getElementById('logout-btn').addEventListener('click', async (e) => {
  e.preventDefault();
  await signOut(auth);
  window.location.href = 'index.html';
});