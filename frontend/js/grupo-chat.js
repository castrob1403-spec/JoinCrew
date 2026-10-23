const groupChatId = new URLSearchParams(window.location.search).get("group");
const groupChatMessages = document.querySelector("#group-chat-messages");
const groupChatForm = document.querySelector("#group-chat-form");
const groupMessageInput = document.querySelector("#group-message-input");
const groupChatMessage = document.querySelector("#group-chat-message");
const groupRoomCard = document.querySelector("#group-room-card");
let currentUser;
let currentGroup;
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

function renderGroupRoom(room) {
  const isLeader = String(currentGroup.createdBy) === String(currentUser.id);
  groupRoomCard.hidden = false;
  if (!room) {
    groupRoomCard.innerHTML = isLeader
      ? `<div><p class="eyebrow">REUNIÓN PRIVADA</p><h2>Sin llamada activa</h2><p>Inicia una videollamada solo para las personas de este grupo.</p></div><button id="start-group-room" class="primary" type="button">Iniciar llamada privada</button>`
      : `<div><p class="eyebrow">REUNIÓN PRIVADA</p><h2>Sección restringida</h2><p>Comunícate con el líder para que abra una llamada privada para el grupo.</p></div>`;
    document
      .querySelector("#start-group-room")
      ?.addEventListener("click", startGroupRoom);
    return;
  }

  groupRoomCard.innerHTML = `<div><p class="eyebrow">REUNIÓN PRIVADA ACTIVA</p><h2>${escapeHtml(room.name)}</h2><p>Solo las personas de este grupo pueden unirse.</p></div><div class="room-actions"><a class="primary" href="sala.html?room=${room.id}&group=${currentGroup.id}">Unirse a la llamada</a>${isLeader ? `<button id="end-group-room" class="danger-button" type="button">Finalizar llamada</button>` : ""}</div>`;
  document
    .querySelector("#end-group-room")
    ?.addEventListener("click", () => endGroupRoom(room.id));
}

async function loadGroupRoom() {
  try {
    const { rooms } = await window.joinCrewApi.get(
      `/groups/${encodeURIComponent(groupChatId)}/rooms`,
    );
    renderGroupRoom(rooms[0] || null);
  } catch (error) {
    showMessage(error.message || "No se pudo cargar la llamada del grupo.");
  }
}

async function startGroupRoom() {
  try {
    const { room } = await window.joinCrewApi.post(
      `/groups/${encodeURIComponent(groupChatId)}/rooms`,
    );
    window.location.href = `sala.html?room=${room.id}&group=${groupChatId}`;
  } catch (error) {
    showMessage(error.message || "No se pudo iniciar la llamada privada.");
  }
}

async function endGroupRoom(roomId) {
  if (!confirm("¿Finalizar esta llamada para todo el grupo?")) return;
  try {
    await window.joinCrewApi.request(
      `/groups/${encodeURIComponent(groupChatId)}/rooms/${encodeURIComponent(roomId)}`,
      { method: "DELETE" },
    );
    showMessage("Llamada privada finalizada.", true);
    await loadGroupRoom();
  } catch (error) {
    showMessage(error.message || "No se pudo finalizar la llamada.");
  }
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
    currentGroup = group;
    document.querySelector("#group-chat-title").textContent = group.name;
    document.querySelector("#group-detail-link").href =
      `grupo.html?id=${group.id}`;
    await loadGroupRoom();
    await loadMessages();
    poller = window.setInterval(() => {
      loadMessages();
      loadGroupRoom();
    }, 8000);
  } catch (error) {
    showMessage(error.message || "Este grupo no está disponible.");
  }
}

window.addEventListener("beforeunload", () => window.clearInterval(poller));
startGroupChat();
