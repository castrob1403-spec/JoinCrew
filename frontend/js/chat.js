const conversationList = document.querySelector("#conversation-list");
const groupConversationList = document.querySelector(
  "#group-conversation-list",
);
const chatMessages = document.querySelector("#chat-messages");
const chatForm = document.querySelector("#chat-form");
const chatInput = document.querySelector("#chat-input");
const chatTitle = document.querySelector("#chat-title");
const chatSubtitle = document.querySelector("#chat-subtitle");
const callPanel = document.querySelector("#direct-call-panel");
const callActions = document.querySelector("#direct-call-actions");

let currentUser;
let currentConversationId = new URLSearchParams(window.location.search).get(
  "conversation",
);
let poller;

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

function renderMessage(message) {
  const bubble = document.createElement("div");
  bubble.className = `bubble ${String(message.senderId) === String(currentUser.id) ? "me" : ""}`;
  bubble.innerHTML = `${String(message.senderId) === String(currentUser.id) ? "" : `<strong>${escapeHtml(message.senderName || "Estudiante")}</strong><br>`}${escapeHtml(message.content)}`;
  chatMessages.append(bubble);
}

async function loadMessages() {
  if (!currentConversationId) return;
  try {
    const { messages } = await window.joinCrewApi.get(
      `/conversations/${encodeURIComponent(currentConversationId)}/messages`,
    );
    chatMessages.innerHTML = "";
    messages.forEach(renderMessage);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  } catch (error) {
    chatMessages.innerHTML = `<p class="message">${escapeHtml(error.message || "No se pudieron cargar los mensajes.")}</p>`;
  }
}

async function loadConversations() {
  try {
    const { conversations } = await window.joinCrewApi.get("/conversations");
    conversationList.innerHTML =
      conversations
        .map((conversation) => {
          const other = conversation.participants.find(
            (participant) => String(participant.id) !== String(currentUser.id),
          );
          return `<a class="conversation-link ${String(conversation.id) === String(currentConversationId) ? "selected" : ""}" href="chat.html?conversation=${encodeURIComponent(conversation.id)}">${escapeHtml(other?.fullName || "Estudiante")}</a>`;
        })
        .join("") || "Aún no tienes conversaciones.";

    const active = conversations.find(
      (conversation) =>
        String(conversation.id) === String(currentConversationId),
    );
    if (!active) return;
    const other = active.participants.find(
      (participant) => String(participant.id) !== String(currentUser.id),
    );
    chatTitle.textContent = other?.fullName || "Conversación";
    chatSubtitle.textContent =
      "Chat privado para coordinar su sesión de estudio.";
    chatForm.hidden = false;
    await loadMessages();
  } catch (error) {
    conversationList.textContent =
      error.message || "No se pudieron cargar las conversaciones.";
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = chatInput.value.trim();
  if (!content || !currentConversationId) return;
  const submitButton = chatForm.querySelector("button");
  submitButton.disabled = true;
  try {
    await window.joinCrewApi.post(
      `/conversations/${encodeURIComponent(currentConversationId)}/messages`,
      { content },
    );
    chatInput.value = "";
    await loadMessages();
  } catch (error) {
    chatSubtitle.textContent = error.message || "No se pudo enviar el mensaje.";
  } finally {
    submitButton.disabled = false;
  }
});

async function startChat() {
  const member = await protectMemberPage();
  if (!member) return;
  currentUser = member.user;
  callPanel.hidden = true;
  callActions.hidden = true;
  try {
    const { groups } = await window.joinCrewApi.get("/groups/mine");
    groupConversationList.innerHTML = groups
      .map(
        (group) =>
          `<a class="conversation-link" href="grupo-chat.html?group=${encodeURIComponent(group.id)}">${escapeHtml(group.name)}</a>`,
      )
      .join("");
    if (!groups.length)
      groupConversationList.textContent = "Aún no te has unido a un grupo.";
  } catch {
    groupConversationList.textContent = "No se pudieron cargar los grupos.";
  }
  await loadConversations();
  if (currentConversationId) poller = window.setInterval(loadMessages, 8000);
}

window.addEventListener("beforeunload", () => window.clearInterval(poller));
startChat();
