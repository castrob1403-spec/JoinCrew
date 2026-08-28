const groupForm = document.querySelector("#group-form");
const groupsList = document.querySelector("#groups-list");
const groupMessage = document.querySelector("#group-message");
const groupsMessage = document.querySelector("#groups-message");

function safeText(value) { const element = document.createElement("span"); element.textContent = value || ""; return element.innerHTML; }

async function loadGroups() {
    groupsMessage.textContent = "Cargando grupos…";
    const { data: groups, error } = await window.studyCircleSupabase.from("study_groups").select("id, name, description, subject, modality, max_members, group_members(user_id)").eq("is_public", true).order("created_at", { ascending: false });
    if (error) { groupsMessage.textContent = "No se pudieron cargar los grupos."; return; }
    groupsMessage.textContent = groups?.length ? `${groups.length} grupo(s) disponible(s).` : "Sé la primera persona en crear un grupo.";
    groupsList.innerHTML = (groups || []).map((group, index) => { const members = group.group_members?.length || 0; return `<article class="group"><div class="avatar ${index % 2 ? "amber" : ""}">👥</div><div class="group-content"><span class="score">${members}/${group.max_members} miembros</span><h2>${safeText(group.name)}</h2><p>${safeText(group.subject)} · ${safeText(group.modality)}</p><div class="tags"><span>${safeText(group.description || "Sin descripción")}</span></div></div><a class="primary" href="grupo.html?id=${group.id}">Ver grupo</a></article>`; }).join("");
}

groupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = groupForm.querySelector("button"); button.disabled = true; button.textContent = "Creando…";
    const { error } = await window.studyCircleSupabase.rpc("create_study_group", { group_name: document.querySelector("#group-name").value.trim(), group_description: document.querySelector("#group-description").value.trim(), group_subject: document.querySelector("#group-subject").value.trim(), group_modality: document.querySelector("#group-modality").value, group_max_members: Number(document.querySelector("#group-capacity").value) });
    button.disabled = false; button.textContent = "Crear grupo"; groupMessage.textContent = error ? error.message : "Grupo creado correctamente."; groupMessage.classList.toggle("success", !error);
    if (!error) { groupForm.reset(); await loadGroups(); }
});

async function startGroups() { if (await protectMemberPage()) loadGroups(); }
startGroups();
