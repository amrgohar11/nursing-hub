
import { auth, db } from './firebase-config.js';

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = 'login-student.html';
    return;
  }

  try {
    // أولاً: التحقق من صلاحية الأدمن
    const tokenResult = await user.getIdTokenResult(true);

    if (tokenResult.claims.admin === true) {
      console.log('Admin access granted:', user.uid);
      return;
    }

    // ثانياً: لو مش أدمن، نتحقق من اشتراك الطالب
    const studentRef = doc(db, "students", user.uid);
    const studentSnap = await getDoc(studentRef);

    if (!studentSnap.exists()) {
      await signOut(auth);
      window.location.href = 'login-student.html';
      return;
    }

    const studentData = studentSnap.data();

    const endDate = studentData.subscriptionEnd?.toDate
      ? studentData.subscriptionEnd.toDate()
      : null;

    if (!endDate || endDate < new Date()) {
      await signOut(auth);
      window.location.href = 'login-student.html';
      return;
    }

    // اشتراك الطالب نشط
    console.log('Student access granted:', user.uid);

  } catch (error) {
    console.error('Access verification error:', error);

    // في حالة فشل التحقق، لا نسمح بالدخول
    await signOut(auth);
    window.location.href = 'login-student.html';
  }
});
