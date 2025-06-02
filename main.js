document.addEventListener("DOMContentLoaded", () => {
  const promptForm = document.querySelector(".prompt-form");
  const promptInput = document.querySelector(".prompt-input");
  const chatsContainer = document.querySelector(".chats-container");
  const fileInput = document.querySelector("#file-input");
  const fileUploadWrapper = document.querySelector(".file-upload-wrapper");
  const cancleBtn = document.querySelector("#cancle-file-btn");
  const stopResponseBtn = document.querySelector("#stop-response-btn");
  const deletleBtn = document.querySelector("#delete-chat-btn");
  const themeToggle = document.querySelector("#theme-toggle-btn");

  // Generating bot response
  const API_KEY = "AIzaSyC0DvQ96VGYI1_0r7NYfHSoBBXQI8mu2-4";
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${API_KEY}`;
  //   const API_URL = "/chat";
  const chatHistory = [];
  const userData = { message: "", file: {} };
  let controller, typingInterval;

  //   Remove the suggestion and app header when typing
  const container = document.querySelector(".container");
  promptInput.addEventListener("input", () => {
    const isTyping = promptInput.value.trim().length > 0;
    container.classList.toggle("typing", isTyping);
  });

  // Function to format bot replies
  function formatBotReply(text) {
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    formattedText = formattedText.replace(/\n/g, "<br>");

    return formattedText;
  }

  //   Generate API calls
  async function generateBotResponse() {
    controller = new AbortController();
    const userParts = [];

    if (userData.message) {
      userParts.push({ text: userData.message });
    }

    if (userData.file.data) {
      userParts.push({
        inline_data: {
          data: userData.file.data,
          mime_type: userData.file.mime_type,
        },
      });
    }

    chatHistory.push({
      role: "user",
      parts: userParts,
    });
    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents: chatHistory }),
        signal: controller.signal,
      });

      const data = await response.json();
      console.log("Gemini response:", data);

      if (!response.ok) throw new Error(data.error.message);

      let plainBotReply =
        data.candidates?.[0]?.content?.parts?.[0]?.text ||
        "No response received.";

      // Format the bot's plain text reply
      let botReply = formatBotReply(plainBotReply);

      // Store the unformatted text in chatHistory
      chatHistory.push({ role: "model", parts: [{ text: plainBotReply }] });
      console.log(chatHistory);

      return botReply;
    } catch (error) {
      console.error("Error fetching bot response:", error.message);
      return "Oops! Something went wrong.";
    } finally {
      userData.file = {};
      fileUploadWrapper.classList.remove(
        "active",
        "img-attached",
        "file-attached"
      );
      fileUploadWrapper.querySelector(".file-preview").src = "";
    }
  }

  const typingEffect = (text, textElement, botMsgDiv) => {
    textElement.innerHTML = "";
    const words = text.split(" ");
    let wordIndex = 0;

    typingInterval = setInterval(() => {
      if (wordIndex < words.length) {
        textElement.innerHTML +=
          (wordIndex === 0 ? "" : " ") + words[wordIndex++];
        chatsContainer.scrollTop = chatsContainer.scrollHeight;
      } else {
        clearInterval(typingInterval);
        botMsgDiv.classList.remove("loading");
        document.body.classList.remove("bot-responding");
      }
    }, 40); // Adjust typing speed here
  };

  promptForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const userInput = promptInput.value.trim();
    if (!userInput && !userData.file.data) return;

    // Create message container for user
    const userMessage = document.createElement("div");
    userMessage.classList.add("message", "user-message");

    let attachmentHTML = "";
    if (userData.file.data) {
      if (userData.file.isImage) {
        attachmentHTML = `<img src="data:${userData.file.mime_type};base64,${userData.file.data}" class="img-attachment" />`;
      } else {
        attachmentHTML = `
          <p class="file-attachment">
            <span class="material-symbols-rounded">description</span>
            ${userData.file.fileName}
          </p>`;
      }
    }

    userMessage.innerHTML = `
      <p class="message-text">${userInput || ""}</p>
      ${attachmentHTML}
    `;

    chatsContainer.appendChild(userMessage);
    chatsContainer.scrollTop = chatsContainer.scrollHeight;
    promptInput.value = "";
    document.body.classList.add("bot-responding", "chats-active");
    userData.message = userInput;

    // Display bot "Just a sec..." message
    const loadingMessage = document.createElement("div");
    loadingMessage.classList.add("message", "bot-message", "loading");
    loadingMessage.innerHTML = `
      <img src="assets/gemini-chatbot-logo.svg" alt="Gemini Bot" class="avatar" />
      <p class="message-text">Just a sec...</p>
    `;
    chatsContainer.appendChild(loadingMessage);
    chatsContainer.scrollTop = chatsContainer.scrollHeight;

    // Get bot response
    const botReply = await generateBotResponse();

    setTimeout(() => {
      const botMessage = document.createElement("div");
      botMessage.classList.add("message", "bot-message", "loading");
      botMessage.innerHTML = `
        <img src="assets/gemini-chatbot-logo.svg" alt="Gemini Bot" class="avatar" />
        <p class="message-text"></p>
      `;
      chatsContainer.replaceChild(botMessage, loadingMessage);
      const textElement = botMessage.querySelector(".message-text");
      typingEffect(botReply, textElement, botMessage);
    }, 800);
  });

  //   Handles file Input
  fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];

    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = (e) => {
      fileInput.value = "";
      const base65String = e.target.result.split(",")[1];
      fileUploadWrapper.querySelector(".file-preview").src = e.target.result;
      fileUploadWrapper.classList.add(
        "active",
        isImage ? "img-attached" : "file-attached"
      );

      //   Stores file data into userData object
      userData.file = {
        fileName: file.name,
        data: base65String,
        mime_type: file.type,
        isImage,
      };
    };
  });

  //   Delete file Uploade
  cancleBtn.addEventListener("click", () => {
    fileUploadWrapper.classList.remove(
      "active",
      "img-attached",
      "file-attached"
    );
  });

  //   Stop Bot Response
  stopResponseBtn.addEventListener("click", () => {
    userData.file = {};
    controller?.abort();
    clearInterval(typingInterval);
    chatsContainer
      .querySelector(".bot-message.loading")
      .classList.remove("loading");
    document.body.classList.remove("bot-responding");
  });

  //   Delete Content in the container
  deletleBtn.addEventListener("click", () => {
    chatHistory.length = 0;
    chatsContainer.innerHTML = "";
    document.body.classList.remove("bot-responding", "chats-active");
  });

  // Theme Toggle
  themeToggle.addEventListener("click", () => {
    const isLightTheme = document.body.classList.toggle("light-theme");
    localStorage.setItem(
      "themeColor",
      isLightTheme ? "light_mode" : "dark_mode"
    );
    themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
  });

  // Set Initial Theme
  const savedTheme = localStorage.getItem("themeColor");
  const isLightTheme = savedTheme === "light_mode";
  document.body.classList.toggle("light-theme", isLightTheme);
  themeToggle.textContent = isLightTheme ? "dark_mode" : "light_mode";
  //   handle suggestions clicl

  document.querySelectorAll(".suggestions-item").forEach((item) => {
    item.addEventListener("click", () => {
      promptInput.value = item.querySelector(".text").textContent;

      // Add 'typing' class to hide header and suggestions
      container.classList.add("typing");

      // Trigger form submission
      promptForm.dispatchEvent(new Event("submit"));
    });
  });

  // Show/hide controls for mobile on prompt input focus
  document.addEventListener("click", ({ target }) => {
    const wrapper = document.querySelector(".prompt-wrapper");
    const shouldHide =
      target.classList.contains("prompt-input") ||
      (wrapper.classList.contains("hide-controls") &&
        (target.id === "add-file-btn" || target.id === "stop-response-btn"));
    wrapper.classList.toggle("hide-controls", shouldHide);
  });

  promptForm
    .querySelector("#add-file-btn")
    .addEventListener("click", () => fileInput.click());
});
