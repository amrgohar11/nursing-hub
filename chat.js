// chat.js
(() => {
  "use strict";

  const overlay = document.getElementById("nhChatOverlay");
  const openBtn = document.getElementById("nhAssistantOpen");
  const closeBtn = document.getElementById("nhChatClose");

  const form = document.getElementById("nhChatForm");
  const input = document.getElementById("nhChatInput");
  const sendBtn = document.getElementById("nhChatSend");
  const messages = document.getElementById("nhChatMessages");

  if (!overlay || !closeBtn || !form || !input || !sendBtn || !messages) {
    console.warn("Nursing Hub Chat: HTML elements are missing.");
    return;
  }

  let isLoading = false;
  let previousFocus = null;

  /* ---------- Open Chat ---------- */
  function openChat() {
    previousFocus = document.activeElement;
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    setTimeout(() => input.focus(), 100);
  }

  /* ---------- Close Chat ---------- */
  function closeChat() {
    if (isLoading) return;
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (previousFocus && previousFocus.focus) {
      previousFocus.focus();
    }
  }

  // فتح الشات من زرار الـ Bottom Nav
  // (الزرار بيستخدم onclick مباشرة في index.html)
  // بس بنضيف دعم لو حبيت تستخدم openBtn لاحقاً
  if (openBtn) {
    openBtn.addEventListener("click", (e) => {
      e.preventDefault();
      openChat();
    });
  }

  // إغلاق الشات
  closeBtn.addEventListener("click", closeChat);

  // إغلاق الشات لو دوسنا برة المودال
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) {
      closeChat();
    }
  });

  // إغلاق الشات بـ Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("active")) {
      closeChat();
    }
  });

  /* ---------- Add Message ---------- */
  function addMessage(text, type = "bot") {
    const wrapper = document.createElement("div");
    wrapper.className = `nh-message ${type}`;

    if (type === "bot") {
      const avatar = document.createElement("div");
      avatar.className = "nh-message-avatar";
      avatar.textContent = "🤖";
      wrapper.appendChild(avatar);
    }

    const content = document.createElement("div");
    content.className = "nh-message-content";
    content.textContent = text;

    wrapper.appendChild(content);
    messages.appendChild(wrapper);
    scrollToBottom();
    return content;
  }

  /* ---------- Scroll ---------- */
  function scrollToBottom() {
    messages.scrollTop = messages.scrollHeight;
  }

  /* ---------- Typing Indicator ---------- */
  function showTyping() {
    const wrapper = document.createElement("div");
    wrapper.className = "nh-message bot";
    wrapper.id = "nhTypingIndicator";

    const avatar = document.createElement("div");
    avatar.className = "nh-message-avatar";
    avatar.textContent = "🤖";

    const typing = document.createElement("div");
    typing.className = "nh-message-content nh-typing";
    typing.innerHTML = "<span></span><span></span><span></span>";

    wrapper.appendChild(avatar);
    wrapper.appendChild(typing);
    messages.appendChild(wrapper);
    scrollToBottom();
  }

  function removeTyping() {
    document.getElementById("nhTypingIndicator")?.remove();
  }

  /* ---------- Send Message ---------- */
  async function sendMessage(message) {
    if (isLoading) return;

    const cleanMessage = message.trim();
    if (!cleanMessage) return;

    isLoading = true;
    input.disabled = true;
    sendBtn.disabled = true;

    addMessage(cleanMessage, "user");
    input.value = "";
    showTyping();

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: cleanMessage })
      });

      const data = await response.json().catch(() => ({}));
      removeTyping();

      if (!response.ok) {
        throw new Error(data.error || "حصلت مشكلة أثناء إرسال السؤال.");
      }

      if (typeof data.reply !== "string" || !data.reply.trim()) {
        throw new Error("المساعد رجع رد غير صالح.");
      }

      addMessage(data.reply, "bot");

    } catch (error) {
      removeTyping();
      addMessage(error.message || "حصل خطأ، حاول تاني بعد شوية.", "bot");
      console.error("Nursing Hub Chat:", error);
    } finally {
      isLoading = false;
      input.disabled = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  /* ---------- Form Submit ---------- */
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    sendMessage(input.value);
  });

})();