// guard.js
import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  // لو مفيش مستخدم مسجل دخول، يروح لصفحة دخول الطلاب
  if (!user) {
    window.location.href = 'login-student.html';
    return;
  }

  // نتأكد من حالة الاشتراك مباشرة من Firebase
  try {
    const studentDoc = await getDoc(doc(db, "students", user.uid));
    
    if (studentDoc.exists()) {
      const data = studentDoc.data();
      const endDate = data.subscriptionEnd ? data.subscriptionEnd.toDate() : null;
      const now = new Date();

      // لو الاشتراك منتهي أو مش موجود (قيد المراجعة)، نطرده
      if (!endDate || endDate < now) {
        await signOut(auth); // نسجله خروج
        window.location.href = 'login-student.html'; // نوديه لصفحة الدخول
        return;
      }
      // لو الاشتراك نشط، يكمل عادي
    } else {
      // لو مفيش بيانات طالب، نطرده
      await signOut(auth);
      window.location.href = 'login-student.html';
      return;
    }
  } catch (error) {
    console.error("Error checking subscription:", error);
  }
});