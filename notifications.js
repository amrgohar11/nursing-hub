// notifications.js — تفعيل/إلغاء إشعارات Push (Firebase Cloud Messaging)
import { app, auth, db } from './firebase-config.js';
import { getMessaging, getToken, deleteToken, isSupported } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging.js";
import { doc, setDoc, deleteDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// من Firebase Console ← Project settings ← Cloud Messaging ← Web Push certificates
export const VAPID_KEY = 'PUT_YOUR_VAPID_PUBLIC_KEY_HERE';

export async function pushSupported() {
  try { return 'Notification' in window && 'serviceWorker' in navigator && await isSupported(); }
  catch (_) { return false; }
}

export const isStandalone = () =>
  window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches;

export const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent);

export async function enablePush() {
  if (!(await pushSupported())) throw new Error('unsupported');
  const perm = await Notification.requestPermission(); // لازم تتنده من ضغطة زرار
  if (perm !== 'granted') throw new Error('denied');
  const reg = await navigator.serviceWorker.ready;
  const token = await getToken(getMessaging(app), { vapidKey: VAPID_KEY, serviceWorkerRegistration: reg });
  if (!token) throw new Error('no-token');
  await setDoc(doc(db, 'fcmTokens', token), {
    uid: auth.currentUser.uid,
    createdAt: serverTimestamp(),
    ua: navigator.userAgent.slice(0, 120)
  });
  localStorage.setItem('pushToken', token);
  return token;
}

export async function disablePush() {
  const token = localStorage.getItem('pushToken');
  try { if (token) await deleteDoc(doc(db, 'fcmTokens', token)); } catch (_) {}
  try { await deleteToken(getMessaging(app)); } catch (_) {}
  localStorage.removeItem('pushToken');
}

export const pushEnabled = () =>
  'Notification' in window && Notification.permission === 'granted' && !!localStorage.getItem('pushToken');
