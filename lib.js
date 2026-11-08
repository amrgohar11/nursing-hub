
// lib.js — دوال مشتركة (حماية XSS، الستريك، الشارات، لوحة الشرف، الإشعارات)

import { db } from './firebase-config.js';
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// حماية HTML من XSS
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) =>
  ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c])
);

// مفتاح اليوم
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dayKey(d);
};

// عدد الأيام لحد تاريخ (YYYY-MM-DD)
export function daysUntil(dateStr) {
  if (!dateStr) return null;

  const exam = new Date(dateStr + 'T00:00:00');

  if (isNaN(exam)) return null;

  const t = new Date();
  t.setHours(0, 0, 0, 0);

  return Math.round((exam - t) / 86400000);
}

// الستريك الفعلي
export function effectiveStreak(st) {
  if (!st) return 0;

  return (
    st.lastDay === dayKey() ||
    st.lastDay === yesterdayKey()
  ) ? (st.current || 0) : 0;
}

// مزامنة لوحة الشرف
export async function syncLeaderboard(uid, s) {
  if (!s.showOnBoard || !s.nickname) return;

  await setDoc(doc(db, 'leaderboard', uid), {
    nickname: s.nickname,
    score: (s.completedLectures || []).length,
    streak: effectiveStreak(s.streak),
    updatedAt: serverTimestamp()
  });
}

// تسجيل المذاكرة وتحديث الستريك والهدف والشارات
export async function recordStudy(uid) {
  const ref = doc(db, 'students', uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  const s = snap.data();

  const today = dayKey();

  const st = s.streak || {
    current: 0,
    best: 0,
    lastDay: null
  };

  let current = st.current || 0;

  if (st.lastDay !== today) {
    current = (st.lastDay === yesterdayKey())
      ? current + 1
      : 1;
  }

  const best = Math.max(st.best || 0, current);

  const count = (
    s.todayStudy?.day === today
      ? s.todayStudy.count
      : 0
  ) + 1;

  const goal = s.dailyGoal || null;
  const completed = s.completedLectures || [];
  const n = completed.length;
  const h = new Date().getHours();

  const earned = [];

  if (n >= 1) earned.push('🌱 مبتدئ');
  if (n >= 3) earned.push('📚 مذاكر');
  if (n >= 5) earned.push('🏆 متفوق');
  if (n >= 10) earned.push('🎓 خبير');

  if (current >= 3) earned.push('🔥 3 أيام متتالية');
  if (current >= 7) earned.push('⚡ أسبوع كامل');
  if (current >= 30) earned.push('👑 شهر من الالتزام');

  if (goal && count >= goal) earned.push('🎯 حقق الهدف');
  if (h >= 4 && h < 7) earned.push('🌅 بدري');

  const before = new Set(s.badges || []);

  const streak = {
    current,
    best,
    lastDay: today
  };

  await updateDoc(ref, {
    streak,
    todayStudy: {
      day: today,
      count
    },
    badges: [...new Set([...before, ...earned])]
  });

  await syncLeaderboard(uid, {
    ...s,
    completedLectures: completed,
    streak
  }).catch(() => {});

  return {
    current,
    best,
    count,
    goal,
    newBadges: earned.filter((b) => !before.has(b))
  };
}

// استدعاء السيرفر لإرسال Push (api/notify.js)
export async function callNotify(user, body) {
  try {
    if (!user) {
      console.error('[notify] No authenticated user');
      return {
        ok: false,
        error: 'no-user'
      };
    }

    const token = await user.getIdToken();

    const response = await fetch('/api/notify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error('[notify] API failed:', {
        status: response.status,
        result
      });

      return {
        ok: false,
        status: response.status,
        result
      };
    }

    console.log('[notify] API response:', result);

    return {
      ok: true,
      ...result
    };

  } catch (e) {
    console.error('[notify] Network error:', e);

    return {
      ok: false,
      error: e.message
    };
  }
}
