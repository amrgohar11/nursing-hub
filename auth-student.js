// auth-student.js
import { auth, db } from './firebase-config.js';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

window.toggleAuth = (type) => {
  document.getElementById('login-section').classList.toggle('hidden', type === 'signup');
  document.getElementById('signup-section').classList.toggle('hidden', type === 'login');
};

document.getElementById('signup-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  const msg = document.getElementById('signup-msg');

  msg.textContent = "جاري الإنشاء...";
  msg.className = "success-msg";

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 3);

    await setDoc(doc(db, "students", user.uid), {
      name: name,
      email: email,
      subscriptionEnd: expiryDate,
      createdAt: new Date()
    });

    msg.textContent = "تم إنشاء الحساب بنجاح! جاري تحويلك...";
    msg.className = "success-msg";
    setTimeout(() => { window.location.href = 'student-dashboard.html'; }, 1500);

  } catch (error) {
    msg.textContent = "حدث خطأ: " + error.message;
    msg.className = "error-msg";
  }
});

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  const msg = document.getElementById('login-msg');

  msg.textContent = "جاري التحقق...";
  msg.className = "success-msg";

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const studentDoc = await getDoc(doc(db, "students", user.uid));
    
    if (studentDoc.exists()) {
      const studentData = studentDoc.data();
      const endDate = studentData.subscriptionEnd.toDate();
      const now = new Date();

      if (endDate < now) {
        msg.textContent = "انتهى اشتراكك! يرجى التجديد للمتابعة.";
        msg.className = "error-msg";
        
        // نظهر زرار التجديد
        const renewBtn = document.getElementById('renew-btn');
        if (renewBtn) renewBtn.style.display = 'block';
        
        return; 
      }
      
      window.location.href = 'student-dashboard.html';
    } else {
      msg.textContent = "لم يتم العثور على بياناتك.";
      msg.className = "error-msg";
    }

  } catch (error) {
    msg.textContent = "الإيميل أو الباسورد غلط!";
    msg.className = "error-msg";
  }
});