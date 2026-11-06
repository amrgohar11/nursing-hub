<<<<<<< HEAD
// login.js
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  errorMsg.style.display = 'none';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // لو الإيميل والباسورد صح، هنروح لصفحة الأدمن
    window.location.href = 'admin.html';
  } catch (error) {
    errorMsg.style.display = 'block';
    errorMsg.textContent = "الإيميل أو الباسورد غلط!";
  }
=======
// login.js
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const form = document.getElementById('login-form');
const errorMsg = document.getElementById('error-msg');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  
  errorMsg.style.display = 'none';

  try {
    await signInWithEmailAndPassword(auth, email, password);
    // لو الإيميل والباسورد صح، هنروح لصفحة الأدمن
    window.location.href = 'admin.html';
  } catch (error) {
    errorMsg.style.display = 'block';
    errorMsg.textContent = "الإيميل أو الباسورد غلط!";
  }
>>>>>>> de937b76c26eb8c4dc042a8c8c7f9e08854c0587
});