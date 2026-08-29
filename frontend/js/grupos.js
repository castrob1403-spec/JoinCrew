const groupForm = document.querySelector("#group-form");
const groupsList = document.querySelector("#groups-list");
const groupMessage = document.querySelector("#group-message");
const groupsMessage = document.querySelector("#groups-message");
const roomForm = document.querySelector("#room-form");
const roomsList = document.querySelector("#rooms-list");
const roomsMessage = document.querySelector("#rooms-message");
const roomMessage = document.querySelector("#room-message");
const premiumModal = document.querySelector("#premium-modal");
let currentPlan = "free";

function safeText(value) { const element = document.createElement("span"); element.textContent = value || ""; return element.innerHTML; }

function showPremiumModal() { if (!premiumModal.open) premiumModal.showModal(); }
function protectFreeCapacity(input) {
    if (currentPlan === "free" && Number(input.value) > 5) {
        input.value = 5;
        showPremiumModal();
    }
}

async function loadGroups() {
    groupsMessage.textContent = "Cargando grupos…";
    const { data: groups, error } = await window.studyCircleSupabase.from("study_groups").select("id, name, description, subject, modality, max_members, group_members(user_id)").eq("is_public", true).order("created_at", { ascending: false });
    if (error) { groupsMessage.textContent = "No se pudieron cargar los grupos."; return; }
    groupsMessage.textContent = groups?.length ? `${groups.length} grupo(s) disponible(s).` : "Sé la primera persona en crear un grupo.";
    groupsList.innerHTML = (groups || []).map((group, index) => { const members = group.group_members?.length || 0; return `<article class="group"><div class="avatar ${index % 2 ? "amber" : ""}">👥</div><div class="group-content"><span class="score">${members}/${group.max_members} miembros</span><h2>${safeText(group.name)}</h2><p>${safeText(group.subject)} · ${safeText(group.modality)}</p><div class="tags"><span>${safeText(group.description || "Sin descripción")}</span></div></div><a class="primary" href="grupo.html?id=${group.id}">Ver grupo</a></article>`; }).join("");
}

async function loadRooms() {
    roomsMessage.textContent = "Cargando salas…";
    const { data: rooms, error } = await window.studyCircleSupabase
        .from("study_rooms")
        .select("id, name, description, max_participants, created_at")
        .eq("is_public", true).eq("status", "live").order("created_at", { ascending: false });
    if (error) { roomsMessage.textContent = "No se pudieron cargar las salas."; return; }
    roomsMessage.textContent = rooms?.length ? `${rooms.length} sala(s) en vivo.` : "No hay salas en vivo. Abre la primera.";
    roomsList.innerHTML = (rooms || []).map((room, index) => `<article class="group"><div class="avatar ${index % 2 ? "amber" : ""}">📹</div><div class="group-content"><span class="score">EN VIVO · máximo ${room.max_participants}</span><h2>${safeText(room.name)}</h2><p>${safeText(room.description || "Sala pública de estudio")}</p></div><a class="primary" href="sala.html?room=${encodeURIComponent(room.id)}">Entrar</a></article>`).join("");
}

groupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (currentPlan === "free" && Number(document.querySelector("#group-capacity").value) > 5) { showPremiumModal(); return; }
    const button = groupForm.querySelector("button"); button.disabled = true; button.textContent = "Creando…";
    const { error } = await window.studyCircleSupabase.rpc("create_study_group", { group_name: document.querySelector("#group-name").value.trim(), group_description: document.querySelector("#group-description").value.trim(), group_subject: document.querySelector("#group-subject").value.trim(), group_modality: document.querySelector("#group-modality").value, group_max_members: Number(document.querySelector("#group-capacity").value) });
    button.disabled = false; button.textContent = "Crear grupo"; if (error?.message?.includes("Premium")) showPremiumModal(); groupMessage.textContent = error ? error.message : "Grupo creado correctamente."; groupMessage.classList.toggle("success", !error);
    if (!error) { groupForm.reset(); await loadGroups(); }
});

roomForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (currentPlan === "free" && Number(document.querySelector("#room-capacity").value) > 5) { showPremiumModal(); return; }
    const button = roomForm.querySelector("button"); button.disabled = true; button.textContent = "Abriendo…";
    const { data, error } = await window.studyCircleSupabase.rpc("create_study_room", {
        room_name: document.querySelector("#room-name").value.trim(),
        room_description: document.querySelector("#room-description").value.trim(),
        target_group_id: null, room_is_public: true,
        room_max_participants: Number(document.querySelector("#room-capacity").value),
    });
    button.disabled = false; button.textContent = "Abrir sala pública";
    if (error?.message?.includes("Premium")) { showPremiumModal(); }
    roomMessage.textContent = error ? error.message : "Sala abierta. Ya puedes entrar a la videollamada.";
    roomMessage.classList.toggle("success", !error);
    if (!error) { roomForm.reset(); await loadRooms(); window.location.href = `sala.html?room=${encodeURIComponent(data.id)}`; }
});

document.querySelector("#group-capacity").addEventListener("input", (event) => protectFreeCapacity(event.target));
document.querySelector("#room-capacity").addEventListener("input", (event) => protectFreeCapacity(event.target));
document.querySelector("#close-premium-modal").addEventListener("click", () => premiumModal.close());
document.querySelector("#keep-free-button").addEventListener("click", () => premiumModal.close());

async function startGroups() {
    const member = await protectMemberPage();
    if (!member) return;
    const { data: profile } = await window.studyCircleSupabase.from("profiles").select("plan").eq("id", member.user.id).single();
    currentPlan = profile?.plan || "free";
    await Promise.all([loadGroups(), loadRooms()]);
}
startGroups();
