const groupForm = document.querySelector("#group-form");
const groupsList = document.querySelector("#groups-list");
const groupMessage = document.querySelector("#group-message");
const groupsMessage = document.querySelector("#groups-message");
const roomForm = document.querySelector("#room-form");
const roomsList = document.querySelector("#rooms-list");
const roomsMessage = document.querySelector("#rooms-message");
const premiumModal = document.querySelector("#premium-modal");
let currentPlan = "free";

function safeText(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

function showPremiumModal() {
  if (!premiumModal.open) premiumModal.showModal();
}

function protectFreeCapacity(input) {
  if (currentPlan === "free" && Number(input.value) > 5) {
    input.value = 5;
    showPremiumModal();
  }
}

async function loadGroups() {
  groupsMessage.textContent = "Cargando grupos…";
  try {
    const { groups } = await window.joinCrewApi.get("/groups");
    groupsMessage.textContent = groups.length
      ? `${groups.length} grupo(s) disponible(s).`
      : "Sé la primera persona en crear un grupo.";
    groupsList.innerHTML = groups
      .map(
        (group, index) =>
          `<article class="group"><div class="avatar ${index % 2 ? "amber" : ""}">👥</div><div class="group-content"><span class="score">${group.memberCount}/${group.maxMembers} miembros</span><h2>${safeText(group.name)}</h2><p>${safeText(group.subject)} · ${safeText(group.modality)}</p><div class="tags"><span>${safeText(group.description || "Sin descripción")}</span></div></div><a class="primary" href="grupo.html?id=${group.id}">Ver grupo</a></article>`,
      )
      .join("");
  } catch (error) {
    groupsMessage.textContent =
      error.message || "No se pudieron cargar los grupos.";
  }
}

async function loadRooms() {
  roomsMessage.textContent = "Cargando salas…";
  try {
    const { rooms } = await window.joinCrewApi.get("/rooms");
    roomsMessage.textContent = rooms.length
      ? `${rooms.length} sala(s) pública(s) en vivo.`
      : "No hay salas públicas en vivo por ahora.";
    roomsList.innerHTML = rooms
      .map(
        (room) =>
          `<article class="group"><div class="avatar amber">🎥</div><div class="group-content"><span class="score">Hasta ${room.maxParticipants} participantes</span><h2>${safeText(room.name)}</h2><p>${safeText(room.description || "Sala pública de estudio")}</p></div><a class="primary" href="sala.html?room=${room.id}">Unirse</a></article>`,
      )
      .join("");
  } catch (error) {
    roomsMessage.textContent =
      error.message || "No se pudieron cargar las salas.";
  }
}

groupForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const capacity = Number(document.querySelector("#group-capacity").value);
  if (currentPlan === "free" && capacity > 5) return showPremiumModal();

  const button = groupForm.querySelector("button");
  button.disabled = true;
  button.textContent = "Creando…";
  try {
    await window.joinCrewApi.post("/groups", {
      name: document.querySelector("#group-name").value.trim(),
      description: document.querySelector("#group-description").value.trim(),
      subject: document.querySelector("#group-subject").value,
      modality: document.querySelector("#group-modality").value,
      maxMembers: capacity,
    });
    groupForm.reset();
    document.querySelector("#group-capacity").value = 5;
    groupMessage.textContent = "Grupo creado correctamente.";
    groupMessage.classList.add("success");
    await loadGroups();
  } catch (error) {
    groupMessage.textContent = error.message || "No se pudo crear el grupo.";
    groupMessage.classList.remove("success");
  } finally {
    button.disabled = false;
    button.textContent = "Crear grupo";
  }
});

roomForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const capacity = Number(document.querySelector("#room-capacity").value);
  if (currentPlan === "free" && capacity > 5) return showPremiumModal();

  const button = roomForm.querySelector("button");
  button.disabled = true;
  button.textContent = "Abriendo…";
  try {
    const { room } = await window.joinCrewApi.post("/rooms", {
      name: document.querySelector("#room-name").value.trim(),
      description: document.querySelector("#room-description").value.trim(),
      maxParticipants: capacity,
    });
    window.location.href = `sala.html?room=${room.id}`;
  } catch (error) {
    roomsMessage.textContent = error.message || "No se pudo abrir la sala.";
  } finally {
    button.disabled = false;
    button.textContent = "Abrir sala pública";
  }
});

document
  .querySelector("#group-capacity")
  .addEventListener("input", (event) => protectFreeCapacity(event.target));
document
  .querySelector("#room-capacity")
  .addEventListener("input", (event) => protectFreeCapacity(event.target));
document
  .querySelector("#close-premium-modal")
  .addEventListener("click", () => premiumModal.close());
document
  .querySelector("#keep-free-button")
  .addEventListener("click", () => premiumModal.close());

async function startGroups() {
  const member = await protectMemberPage();
  if (!member) return;
  currentPlan = member.user.plan || "free";
  await Promise.all([loadGroups(), loadRooms()]);
}

startGroups();
