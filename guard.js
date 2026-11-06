// guard.js
import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// التحقق من وجود مستخدم مسجل دخول
onAuthStateChanged(auth, (user) => {
  // لو مفيش مستخدم، يروح لصفحة دخول الطلاب
  if (!user) {
    window.location.href = 'login-student.html';
  }
});