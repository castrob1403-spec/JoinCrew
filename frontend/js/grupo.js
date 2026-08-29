const groupId = new URLSearchParams(window.location.search).get("id");
const detailMessage = document.querySelector("#detail-message");
const groupActions = document.querySelector("#group-actions");
const memberList = document.querySelector("#member-list");
let currentUser;
let currentGroup;
let members = [];

function escapeHtml(value) { const element = document.createElement("span"); element.textContent = value || ""; return element.innerHTML; }
function showMessage(message, success = false) { detailMessage.textContent = message; detailMessage.classList.toggle("success", success); }

async function loadGroup() {
    const member = await protectMemberPage();
    if (!member || !groupId) { window.location.href = "grupos.html"; return; }
    currentUser = member.user;
    const { data: group, error: groupError } = await window.studyCircleSupabase.from("study_groups").select("id, name, description, subject, modality, max_members, created_by").eq("id", groupId).single();
    if (groupError || !group) { showMessage("Este grupo no está disponible."); return; }
    currentGroup = group;
    const { data: groupMembers, error: membersError } = await window.studyCircleSupabase.from("group_members").select("user_id, member_role, joined_at").eq("group_id", groupId).order("joined_at");
    if (membersError) { showMessage("No se pudieron cargar los integrantes."); return; }
    members = groupMembers || [];
    const profiles = await getProfiles(members.map((item) => item.user_id));
    renderGroup(profiles);
}

async function getProfiles(ids) { if (!ids.length) return {}; const { data } = await window.studyCircleSupabase.from("profiles").select("id, full_name, university, career").in("id", ids); return Object.fromEntries((data || []).map((profile) => [profile.id, profile])); }

function renderGroup(profiles) {
    const isLeader = currentGroup.created_by === currentUser.id;
    const isMember = members.some((item) => item.user_id === currentUser.id);
    const leader = members.find((item) => item.member_role === "leader") || members.find((item) => item.user_id === currentGroup.created_by);
    document.querySelector("#group-name").textContent = currentGroup.name;
    document.querySelector("#group-description").textContent = currentGroup.description || "Sin descripción disponible.";
    document.querySelector("#group-subject").textContent = currentGroup.subject;
    document.querySelector("#group-modality").textContent = currentGroup.modality;
    document.querySelector("#group-capacity").textContent = `${members.length} de ${currentGroup.max_members}`;
    document.querySelector("#group-leader").textContent = profiles[leader?.user_id]?.full_name || "Líder del grupo";
    document.querySelector("#member-count").textContent = `${members.length} integrante(s)`;
    groupActions.innerHTML = isLeader
        ? '<a class="primary" href="grupo-chat.html?group=' + currentGroup.id + '">Abrir chat del grupo</a><button id="open-group-room" class="secondary" type="button">Abrir sala pública</button><button id="dissolve-group" class="danger-button" type="button">Disolver grupo</button>'
        : isMember
            ? '<a class="primary" href="grupo-chat.html?group=' + currentGroup.id + '">Abrir chat del grupo</a>'
            : '<button id="join-group" class="primary" type="button">Unirme al grupo</button>';
    memberList.innerHTML = members.map((item) => { const profile = profiles[item.user_id] || {}; const canManage = isLeader && item.user_id !== currentUser.id; return `<article class="member-row"><div class="avatar small-avatar">${escapeHtml((profile.full_name || "E").charAt(0).toUpperCase())}</div><div class="member-data"><strong>${escapeHtml(profile.full_name || "Estudiante")}</strong><span>${escapeHtml(profile.career || "Perfil académico")}</span></div><span class="role-label">${item.member_role === "leader" ? "Líder" : item.member_role === "moderator" ? "Moderador" : "Miembro"}</span>${canManage ? `<div class="member-controls"><select data-role-user="${item.user_id}"><option value="member" ${item.member_role === "member" ? "selected" : ""}>Miembro</option><option value="moderator" ${item.member_role === "moderator" ? "selected" : ""}>Moderador</option></select><button class="remove-member" data-remove-user="${item.user_id}" type="button">Retirar</button></div>` : ""}</article>`; }).join("");
    document.querySelector("#join-group")?.addEventListener("click", joinGroup);
    document.querySelector("#open-group-room")?.addEventListener("click", createGroupRoom);
    document.querySelector("#dissolve-group")?.addEventListener("click", dissolveGroup);
    memberList.querySelectorAll("select[data-role-user]").forEach((select) => select.addEventListener("change", () => updateRole(select.dataset.roleUser, select.value)));
    memberList.querySelectorAll("button[data-remove-user]").forEach((button) => button.addEventListener("click", () => removeMember(button.dataset.removeUser)));
}

async function joinGroup() { const { error } = await window.studyCircleSupabase.rpc("join_study_group", { target_group_id: groupId }); showMessage(error ? error.message : "Te uniste al grupo.", !error); if (!error) loadGroup(); }
async function createGroupRoom() { const name = prompt("Nombre de la sala pública", `Sala de ${currentGroup.name}`); if (!name?.trim()) return; const { data, error } = await window.studyCircleSupabase.rpc("create_study_room", { room_name: name.trim(), room_description: currentGroup.description || "Sala del grupo", target_group_id: groupId, room_is_public: true, room_max_participants: 5 }); if (error) { showMessage(error.message); return; } window.location.href = `sala.html?room=${encodeURIComponent(data.id)}`; }
async function updateRole(userId, role) { const { error } = await window.studyCircleSupabase.rpc("set_group_member_role", { target_group_id: groupId, target_user_id: userId, new_role: role }); showMessage(error ? error.message : "Rol actualizado.", !error); if (!error) loadGroup(); }
async function removeMember(userId) { if (!confirm("¿Retirar a este integrante del grupo?")) return; const { error } = await window.studyCircleSupabase.rpc("remove_group_member", { target_group_id: groupId, target_user_id: userId }); showMessage(error ? error.message : "Integrante retirado.", !error); if (!error) loadGroup(); }
async function dissolveGroup() { if (!confirm("¿Disolver este grupo? Esta acción no se puede deshacer.")) return; const { error } = await window.studyCircleSupabase.from("study_groups").delete().eq("id", groupId); if (error) { showMessage("No se pudo disolver el grupo."); return; } window.location.href = "grupos.html"; }

loadGroup();
