const groupId = new URLSearchParams(window.location.search).get("id");
const detailMessage = document.querySelector("#detail-message");
const groupActions = document.querySelector("#group-actions");
const memberList = document.querySelector("#member-list");
const groupRoomCard = document.querySelector("#group-room-card");
let currentUser;
let currentGroup;
let roomPoller;

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

function showMessage(message, success = false) {
  detailMessage.textContent = message;
  detailMessage.classList.toggle("success", success);
}

function renderGroup() {
  const isLeader = String(currentGroup.createdBy) === String(currentUser.id);
  const isMember = currentGroup.members.some(
    (member) => String(member.id) === String(currentUser.id),
  );
  const leader = currentGroup.members.find(
    (member) => member.role === "leader",
  );

  document.querySelector("#group-name").textContent = currentGroup.name;
  document.querySelector("#group-description").textContent =
    currentGroup.description || "Sin descripción disponible.";
  document.querySelector("#group-subject").textContent = currentGroup.subject;
  document.querySelector("#group-modality").textContent = currentGroup.modality;
  document.querySelector("#group-capacity").textContent =
    `${currentGroup.members.length} de ${currentGroup.maxMembers}`;
  document.querySelector("#group-leader").textContent =
    leader?.fullName || "Líder del grupo";
  document.querySelector("#member-count").textContent =
    `${currentGroup.members.length} integrante(s)`;

  groupActions.innerHTML = isLeader
    ? `<a class="primary" href="grupo-chat.html?group=${currentGroup.id}">Abrir chat del grupo</a><button id="dissolve-group" class="danger-button" type="button">Disolver grupo</button>`
    : isMember
      ? `<a class="primary" href="grupo-chat.html?group=${currentGroup.id}">Abrir chat del grupo</a>`
      : `<button id="join-group" class="primary" type="button">Unirme al grupo</button>`;

  memberList.innerHTML = currentGroup.members
    .map((member) => {
      const canManage =
        isLeader && String(member.id) !== String(currentUser.id);
      return `<article class="member-row"><div class="avatar small-avatar">${escapeHtml((member.fullName || "E").charAt(0).toUpperCase())}</div><div class="member-data"><strong>${escapeHtml(member.fullName)}</strong><span>${escapeHtml(member.career || "Perfil académico")}</span></div><span class="role-label">${member.role === "leader" ? "Líder" : member.role === "moderator" ? "Moderador" : "Miembro"}</span>${canManage ? `<div class="member-controls"><select data-role-user="${member.id}"><option value="member" ${member.role === "member" ? "selected" : ""}>Miembro</option><option value="moderator" ${member.role === "moderator" ? "selected" : ""}>Moderador</option></select><button class="remove-member" data-remove-user="${member.id}" type="button">Retirar</button></div>` : ""}</article>`;
    })
    .join("");

  document.querySelector("#join-group")?.addEventListener("click", joinGroup);
  document
    .querySelector("#dissolve-group")
    ?.addEventListener("click", dissolveGroup);
  memberList
    .querySelectorAll("select[data-role-user]")
    .forEach((select) =>
      select.addEventListener("change", () =>
        updateRole(select.dataset.roleUser, select.value),
      ),
    );
  memberList
    .querySelectorAll("button[data-remove-user]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        removeMember(button.dataset.removeUser),
      ),
    );
}

function renderGroupRoom(room) {
  const isLeader = String(currentGroup.createdBy) === String(currentUser.id);
  const chatUrl = `grupo-chat.html?group=${currentGroup.id}`;
  groupRoomCard.hidden = false;

  if (!room) {
    groupRoomCard.innerHTML = isLeader
      ? `<div><p class="eyebrow">REUNIÓN PRIVADA</p><h2>Sin llamada activa</h2><p>Inicia una sala privada para las personas de tu grupo.</p></div><button id="start-group-room" class="primary" type="button">Iniciar llamada privada</button>`
      : `<div><p class="eyebrow">REUNIÓN PRIVADA</p><h2>Sin llamada activa</h2><p>Cuando el líder inicie una reunión, aparecerá aquí y en el chat del grupo.</p></div><a class="secondary" href="${chatUrl}">Ir al chat</a>`;
    document
      .querySelector("#start-group-room")
      ?.addEventListener("click", startGroupRoom);
    return;
  }

  groupRoomCard.innerHTML = `<div><p class="eyebrow">REUNIÓN PRIVADA ACTIVA</p><h2>${escapeHtml(room.name)}</h2><p>Solo integrantes de este grupo pueden entrar.</p></div><div class="room-actions"><a class="primary" href="sala.html?room=${room.id}&group=${currentGroup.id}">Unirse</a>${isLeader ? `<button id="end-group-room" class="danger-button" type="button">Finalizar llamada</button>` : ""}</div>`;
  document
    .querySelector("#end-group-room")
    ?.addEventListener("click", () => endGroupRoom(room.id));
}

async function loadGroupRoom() {
  const isMember = currentGroup.members.some(
    (member) => String(member.id) === String(currentUser.id),
  );
  if (!isMember) return;
  try {
    const { rooms } = await window.joinCrewApi.get(
      `/groups/${encodeURIComponent(groupId)}/rooms`,
    );
    renderGroupRoom(rooms[0] || null);
  } catch (error) {
    showMessage(error.message || "No se pudo cargar la llamada del grupo.");
  }
}

async function startGroupRoom() {
  try {
    const { room } = await window.joinCrewApi.post(
      `/groups/${encodeURIComponent(groupId)}/rooms`,
    );
    window.location.href = `sala.html?room=${room.id}&group=${groupId}`;
  } catch (error) {
    showMessage(error.message || "No se pudo iniciar la llamada privada.");
  }
}

async function endGroupRoom(roomId) {
  if (!confirm("¿Finalizar esta llamada para todo el grupo?")) return;
  try {
    await window.joinCrewApi.request(
      `/groups/${encodeURIComponent(groupId)}/rooms/${encodeURIComponent(roomId)}`,
      { method: "DELETE" },
    );
    showMessage("Llamada privada finalizada.", true);
    await loadGroupRoom();
  } catch (error) {
    showMessage(error.message || "No se pudo finalizar la llamada.");
  }
}

async function loadGroup() {
  try {
    const { group } = await window.joinCrewApi.get(
      `/groups/${encodeURIComponent(groupId)}`,
    );
    currentGroup = group;
    renderGroup();
    await loadGroupRoom();
  } catch (error) {
    showMessage(error.message || "Este grupo no está disponible.");
  }
}

async function joinGroup() {
  try {
    await window.joinCrewApi.post(
      `/groups/${encodeURIComponent(groupId)}/join`,
    );
    showMessage("Te uniste al grupo.", true);
    await loadGroup();
  } catch (error) {
    showMessage(error.message);
  }
}

async function updateRole(memberId, role) {
  try {
    await window.joinCrewApi.patch(
      `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
      { role },
    );
    showMessage("Rol actualizado.", true);
    await loadGroup();
  } catch (error) {
    showMessage(error.message);
  }
}

async function removeMember(memberId) {
  if (!confirm("¿Retirar a este integrante del grupo?")) return;
  try {
    await window.joinCrewApi.request(
      `/groups/${encodeURIComponent(groupId)}/members/${encodeURIComponent(memberId)}`,
      { method: "DELETE" },
    );
    showMessage("Integrante retirado.", true);
    await loadGroup();
  } catch (error) {
    showMessage(error.message);
  }
}

async function dissolveGroup() {
  if (!confirm("¿Disolver este grupo? Esta acción no se puede deshacer."))
    return;
  try {
    await window.joinCrewApi.request(`/groups/${encodeURIComponent(groupId)}`, {
      method: "DELETE",
    });
    window.location.href = "grupos.html";
  } catch (error) {
    showMessage(error.message);
  }
}

async function startGroup() {
  const member = await protectMemberPage();
  if (!member || !groupId) {
    window.location.href = "grupos.html";
    return;
  }
  currentUser = member.user;
  await loadGroup();
  roomPoller = window.setInterval(loadGroupRoom, 8000);
}

window.addEventListener("beforeunload", () => window.clearInterval(roomPoller));
startGroup();
