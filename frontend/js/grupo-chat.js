const groupChatId = new URLSearchParams(window.location.search).get("group");
const groupChatMessages = document.querySelector("#group-chat-messages");
const groupChatForm = document.querySelector("#group-chat-form");
const groupMessageInput = document.querySelector("#group-message-input");
const groupChatMessage = document.querySelector("#group-chat-message");
let currentUser;
let poller;

function showMessage(message, success = false) {
  groupChatMessage.textContent = message;
  groupChatMessage.classList.toggle("success", success);
}

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

function renderMessage(message) {
  const bubble = document.createElement("article");
  const mine = String(message.senderId) === String(currentUser.id);
  bubble.className = `bubble ${mine ? "me" : ""}`;
  bubble.innerHTML = `${mine ? "" : `<strong>${escapeHtml(message.senderName || "Estudiante")}</strong><br>`}<span>${escapeHtml(message.content)}</span>${mine ? `<button class="delete-message" data-message-id="${message.id}" type="button">Eliminar</button>` : ""}`;
  groupChatMessages.append(bubble);
}

async function loadMessages() {
  try {
    const { messages } = await window.joinCrewApi.get(
      `/groups/${encodeURIComponent(groupChatId)}/messages`,
    );
    groupChatMessages.innerHTML = "";
    messages.forEach(renderMessage);
    groupChatMessages
      .querySelectorAll("button[data-message-id]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          deleteMessage(button.dataset.messageId),
        ),
      );
    groupChatMessages.scrollTop = groupChatMessages.scrollHeight;
  } catch (error) {
    showMessage(error.message || "No se pudieron cargar los mensajes.");
  }
}

async function deleteMessage(messageId) {
  if (!confirm("¿Eliminar este mensaje?")) return;
  try {
    await window.joinCrewApi.request(
      `/groups/${encodeURIComponent(groupChatId)}/messages/${encodeURIComponent(messageId)}`,
      { method: "DELETE" },
    );
    await loadMessages();
  } catch (error) {
    showMessage(error.message);
  }
}

groupChatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const content = groupMessageInput.value.trim();
  if (!content) return;
  const button = groupChatForm.querySelector("button");
  button.disabled = true;
  try {
    await window.joinCrewApi.post(
      `/groups/${encodeURIComponent(groupChatId)}/messages`,
      { content },
    );
    groupMessageInput.value = "";
    await loadMessages();
  } catch (error) {
    showMessage(error.message || "No se pudo enviar el mensaje.");
  } finally {
    button.disabled = false;
  }
});

async function startGroupChat() {
  const member = await protectMemberPage();
  if (!member || !groupChatId) return (window.location.href = "grupos.html");
  currentUser = member.user;
  try {
    const { group } = await window.joinCrewApi.get(
      `/groups/${encodeURIComponent(groupChatId)}`,
    );
    if (
      !group.members.some((item) => String(item.id) === String(currentUser.id))
    ) {
      showMessage("Debes unirte al grupo para usar su chat.");
      groupChatForm.hidden = true;
      return;
    }
    document.querySelector("#group-chat-title").textContent = group.name;
    document.querySelector("#group-detail-link").href =
      `grupo.html?id=${group.id}`;
    const roomUrl = `https://meet.jit.si/JoinCrew-${group.id}`;
    document.querySelector("#audio-call").href =
      `${roomUrl}#config.startWithVideoMuted=true`;
    document.querySelector("#video-call").href = roomUrl;
    await loadMessages();
    poller = window.setInterval(loadMessages, 8000);
  } catch (error) {
    showMessage(error.message || "Este grupo no está disponible.");
  }
}

window.addEventListener("beforeunload", () => window.clearInterval(poller));
startGroupChat();
