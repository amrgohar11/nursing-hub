// set-admin.js
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const serviceAccount = require('./serviceAccountKey.json');

// التهيئة بالطريقة الجديدة
initializeApp({
  credential: cert(serviceAccount)
});

// حط الإيميل بتاع الأدمن بتاعك هنا
const adminEmail = 'goharamr17@gmail.com';

getAuth().getUserByEmail(adminEmail)
  .then((user) => {
    return getAuth().setCustomUserClaims(user.uid, { admin: true });
  })
  .then(() => {
    console.log('✅ تم تعيين صلاحية الأدمن بنجاح!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ حدث خطأ:', error);
    process.exit(1);
  });