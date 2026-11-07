// api/notify.js — إرسال Push عبر FCM (Vercel Function)
// المتغيرات المطلوبة: FIREBASE_SERVICE_ACCOUNT (JSON كامل)، ADMIN_EMAILS (إيميلات الأدمن مفصولة بفاصلة)
// التثبيت: npm i firebase-admin
"use strict";
const admin = require("firebase-admin");

function init() {
  if (admin.apps.length) return;
  admin.initializeApp({ credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)) });
}

const hits = new Map();
function limited(key, limit = 10, windowMs = 60_000) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter((t) => now - t < windowMs);
  if (arr.length >= limit) { hits.set(key, arr); return true; }
  arr.push(now); hits.set(key, arr);
  if (hits.size > 5000) hits.clear();
  return false;
}

const clip = (s, n) => String(s || "").slice(0, n);
const ID = /^[A-Za-z0-9_-]{1,100}$/;
const lectureUrl = ({ subjectId, fileName, lectureId }) =>
  `/lecture.html?subjectId=${encodeURIComponent(subjectId)}&file=${encodeURIComponent(fileName)}&id=${encodeURIComponent(lectureId)}`;

async function tokensFor(uids) {
  const col = admin.firestore().collection("fcmTokens");
  const out = [];
  if (!uids) { (await col.get()).forEach((d) => out.push(d.id)); return out; }
  for (let i = 0; i < uids.length; i += 30) {
    (await col.where("uid", "in", uids.slice(i, i + 30)).get()).forEach((d) => out.push(d.id));
  }
  return out;
}

async function adminUids() {
  const emails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);
  const uids = [];
  for (const e of emails) { try { uids.push((await admin.auth().getUserByEmail(e)).uid); } catch (_) {} }
  return uids;
}

async function send(tokens, data) {
  let sent = 0;
  const dead = ["messaging/registration-token-not-registered", "messaging/invalid-registration-token"];
  for (let i = 0; i < tokens.length; i += 500) {
    const chunk = tokens.slice(i, i + 500);
    const res = await admin.messaging().sendEachForMulticast({
      tokens: chunk, data, webpush: { headers: { Urgency: "high", TTL: "86400" } }
    });
    sent += res.successCount;
    const bad = [];
    res.responses.forEach((r, idx) => { if (!r.success && dead.includes(r.error?.code)) bad.push(chunk[idx]); });
    await Promise.all(bad.map((t) => admin.firestore().collection("fcmTokens").doc(t).delete().catch(() => {})));
  }
  return sent;
}

module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  let decoded;
  try {
    init();
    const tok = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    decoded = await admin.auth().verifyIdToken(tok);
  } catch (_) { return res.status(401).json({ error: "unauthorized" }); }

  if (limited(decoded.uid)) return res.status(429).json({ error: "too many requests" });

  let b = req.body;
  if (typeof b === "string") { try { b = JSON.parse(b); } catch (_) { b = {}; } }
  b = b || {};

  try {
    let tokens = [], data;

    if (b.type === "lecture" || b.type === "announcement") {
      if (decoded.admin !== true) return res.status(403).json({ error: "forbidden" });
      tokens = await tokensFor(null);
      if (b.type === "lecture") {
        if (![b.subjectId, b.lectureId].every((x) => ID.test(String(x))) || !b.fileName) return res.status(400).json({ error: "bad request" });
        data = { title: "📚 محاضرة جديدة", body: clip(b.title, 100), url: lectureUrl(b) };
      } else {
        data = { title: "📢 إعلان جديد", body: clip(b.text, 140), url: "/index.html" };
      }
    } else if (b.type === "report") {
      tokens = await tokensFor(await adminUids());
      data = { title: "🚩 بلاغ جديد عن خطأ", body: clip(b.lectureTitle, 100), url: "/admin.html" };
    } else if (b.type === "reply") {
      if (![b.subjectId, b.lectureId, b.commentId].every((x) => ID.test(String(x)))) return res.status(400).json({ error: "bad request" });
      const lecRef = admin.firestore().doc(`subjects/${b.subjectId}/lectures/${b.lectureId}`);
      const [c, l] = await Promise.all([lecRef.collection("comments").doc(b.commentId).get(), lecRef.get()]);
      if (!c.exists || !l.exists) return res.status(404).json({ error: "not found" });
      const owner = c.data().userId;
      if (!owner || owner === decoded.uid) return res.status(200).json({ sent: 0 });
      tokens = await tokensFor([owner]);
      data = {
        title: "💬 رد على تعليقك", body: clip(b.preview, 100),
        url: lectureUrl({ subjectId: b.subjectId, lectureId: b.lectureId, fileName: l.data().fileName })
      };
    } else {
      return res.status(400).json({ error: "unknown type" });
    }

    const sent = tokens.length ? await send(tokens, data) : 0;
    return res.status(200).json({ sent });
  } catch (e) {
    console.error("[notify]", e);
    return res.status(500).json({ error: "server error" });
  }
};
