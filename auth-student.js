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

    // الحساب بيتعمل بدون اشتراك (قيد المراجعة)
    await setDoc(doc(db, "students", user.uid), {
      name: name,
      email: email,
      subscriptionEnd: null, // هيتم تفعيله من لوحة التحكم
      completedLectures: [],
      badges: [],
      createdAt: new Date()
    });

    msg.textContent = "تم إنشاء الحساب! حسابك قيد المراجعة، هيتم تفعيله قريباً.";
    msg.className = "success-msg";
    
    // نظهر زرار التجديد/التواصل
    const renewBtn = document.getElementById('renew-btn');
    if (renewBtn) renewBtn.style.display = 'block';

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
      const endDate = studentData.subscriptionEnd ? studentData.subscriptionEnd.toDate() : null;
      const now = new Date();

      // لو الاشتراك مش موجود (قيد المراجعة) أو منتهي
      if (!endDate || endDate < now) {
        msg.textContent = "حسابك قيد المراجعة أو اشتراكك منتهي. تواصل مع الإدارة للتفعيل.";
        msg.className = "error-msg";
        
        // نظهر زرار التجديد
        const renewBtn = document.getElementById('renew-btn');
        if (renewBtn) renewBtn.style.display = 'block';
        
        return; 
      }
      
      // لو الاشتراك نشط، يروح للداشبورد
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