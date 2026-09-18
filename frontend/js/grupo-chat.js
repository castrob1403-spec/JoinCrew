const groupChatId = new URLSearchParams(window.location.search).get("group");
const groupChatMessages = document.querySelector("#group-chat-messages");
const groupChatForm = document.querySelector("#group-chat-form");
const groupMessageInput = document.querySelector("#group-message-input");
const mediaInput = document.querySelector("#group-media-input");
const groupChatMessage = document.querySelector("#group-chat-message");
let currentUser;
let groupChatChannel;

function showMessage(message, success = false) { groupChatMessage.textContent = message; groupChatMessage.classList.toggle("success", success); }
function escapeHtml(value) { const element = document.createElement("span"); element.textContent = value || ""; return element.innerHTML; }
async function getProfiles(ids) { if (!ids.length) return {}; const { data } = await window.joinCrewSupabase.from("profiles").select("id, full_name").in("id", ids); return Object.fromEntries((data || []).map((profile) => [profile.id, profile])); }

async function mediaUrl(path) { if (!path) return null; const { data } = await window.joinCrewSupabase.storage.from("group-chat-media").createSignedUrl(path, 3600); return data?.signedUrl || null; }
async function renderMessage(message, profiles) {
    const bubble = document.createElement("article");
    bubble.className = `bubble ${message.sender_id === currentUser.id ? "me" : ""}`;
    const url = await mediaUrl(message.media_path);
    const attachment = url ? (message.media_path.match(/\.(mp4|webm|mov)$/i) ? `<video controls src="${url}"></video>` : `<img src="${url}" alt="Archivo compartido en el grupo">`) : "";
    bubble.innerHTML = `${message.sender_id === currentUser.id ? "" : `<strong>${escapeHtml(profiles[message.sender_id]?.full_name || "Estudiante")}</strong><br>`}${message.content ? `<span>${escapeHtml(message.content)}</span>` : ""}${attachment}${message.sender_id === currentUser.id ? `<button class="delete-message" data-message-id="${message.id}" type="button">Eliminar</button>` : ""}`;
    groupChatMessages.append(bubble);
}

async function loadMessages() {
    const { data: messages, error } = await window.joinCrewSupabase.from("group_messages").select("id, sender_id, content, media_path, created_at").eq("group_id", groupChatId).order("created_at");
    if (error) { showMessage("No se pudieron cargar los mensajes."); return; }
    const profiles = await getProfiles([...new Set((messages || []).map((message) => message.sender_id))]);
    groupChatMessages.innerHTML = "";
    for (const message of messages || []) await renderMessage(message, profiles);
    groupChatMessages.querySelectorAll("button[data-message-id]").forEach((button) => button.addEventListener("click", () => deleteMessage(button.dataset.messageId)));
    groupChatMessages.scrollTop = groupChatMessages.scrollHeight;
}

async function deleteMessage(messageId) { if (!confirm("¿Eliminar este mensaje?")) return; const { error } = await window.joinCrewSupabase.from("group_messages").delete().eq("id", messageId); if (error) { showMessage("No se pudo eliminar el mensaje."); return; } await loadMessages(); }
async function uploadMedia(file) {
    if (!file) return null;
    if (file.size > 10 * 1024 * 1024) throw new Error("El archivo debe pesar máximo 10 MB.");
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `${groupChatId}/${currentUser.id}-${Date.now()}-${safeName}`;
    const { error } = await window.joinCrewSupabase.storage.from("group-chat-media").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    return path;
}

groupChatForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const content = groupMessageInput.value.trim(); const file = mediaInput.files[0];
    if (!content && !file) return;
    const button = groupChatForm.querySelector("button"); button.disabled = true; button.textContent = "Enviando…"; showMessage("");
    try {
        const mediaPath = await uploadMedia(file);
        const { error } = await window.joinCrewSupabase.from("group_messages").insert({ group_id: groupChatId, sender_id: currentUser.id, content, media_path: mediaPath });
        if (error) throw error;
        groupMessageInput.value = ""; mediaInput.value = ""; await loadMessages();
    } catch (error) { showMessage(error.message || "No se pudo enviar el mensaje."); }
    finally { button.disabled = false; button.textContent = "Enviar"; }
});

function subscribeToMessages() {
    groupChatChannel?.unsubscribe();
    groupChatChannel = window.joinCrewSupabase.channel(`group-messages-${groupChatId}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "group_messages", filter: `group_id=eq.${groupChatId}` }, (payload) => { if (payload.new.sender_id !== currentUser.id) loadMessages(); }).subscribe();
}

async function startGroupChat() {
    const member = await protectMemberPage();
    if (!member || !groupChatId) { window.location.href = "grupos.html"; return; }
    currentUser = member.user;
    const { data: group, error } = await window.joinCrewSupabase.from("study_groups").select("id, name").eq("id", groupChatId).single();
    if (error || !group) { showMessage("Este grupo no está disponible."); return; }
    const { data: membership } = await window.joinCrewSupabase.from("group_members").select("user_id").eq("group_id", groupChatId).eq("user_id", currentUser.id).maybeSingle();
    if (!membership) { showMessage("Debes unirte al grupo para usar su chat."); groupChatForm.hidden = true; return; }
    document.querySelector("#group-chat-title").textContent = group.name;
    document.querySelector("#group-detail-link").href = `grupo.html?id=${group.id}`;
    const roomUrl = `https://meet.jit.si/JoinCrew-${group.id}`;
    document.querySelector("#audio-call").href = `${roomUrl}#config.startWithVideoMuted=true`;
    document.querySelector("#video-call").href = roomUrl;
    await loadMessages(); subscribeToMessages();
}
startGroupChat();
