const profileName = document.querySelector("#profile-name");
const welcomeName = document.querySelector("#welcome-name");
const headerName = document.querySelector("#header-name");
const profileInitial = document.querySelector("#profile-initial");
const matchPreview = document.querySelector("#match-preview");
const matchStatus = document.querySelector("#match-status");
const groupPreview = document.querySelector("#group-preview");
const groupPreviewStatus = document.querySelector("#group-preview-status");
const roomPreview = document.querySelector("#room-preview");
const roomPreviewStatus = document.querySelector("#room-preview-status");
const adminNotice = document.querySelector("#admin-notice");
const notificationsButton = document.querySelector("#notifications-button");
const notificationsMenu = document.querySelector("#notifications-menu");
const notificationsBadge = document.querySelector("#notifications-badge");
const notificationsCount = document.querySelector("#notifications-count");
const notificationsList = document.querySelector("#notifications-list");
let activeNotifications = [];

function fillProfile(profile) {
    const name = profile.full_name || "Estudiante";
    profileName.textContent = name;
    welcomeName.textContent = name.split(" ")[0];
    headerName.textContent = name;
    profileInitial.textContent = name.charAt(0).toUpperCase();
    document.querySelector("#profile-career").textContent = profile.career || "Perfil académico";
    document.querySelector("#profile-university").textContent = profile.university || "JoinCrew";
    document.querySelector("#profile-availability").textContent = profile.availability || "Horario flexible";
    document.querySelector("#profile-modality").textContent = profile.study_preference || "Modalidad no definida";
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (character) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
    }[character]));
}

function calculateCompatibility(current, candidate) {
    const currentSubjects = new Set((current.subjects || []).map((subject) => subject.toLowerCase()));
    const sharedSubjects = (candidate.subjects || []).filter((subject) => currentSubjects.has(subject.toLowerCase()));
    let score = 35 + Math.min(sharedSubjects.length * 25, 45);

    if (current.availability === candidate.availability) score += 12;
    if (current.study_preference === candidate.study_preference) score += 8;

    return { score: Math.min(score, 99), sharedSubjects };
}

async function openConversation(targetUserId) {
    const { data, error } = await window.joinCrewSupabase
        .rpc("get_or_create_direct_conversation", { target_user_id: targetUserId });

    if (error) {
        matchStatus.textContent = "No se pudo abrir el chat";
        return;
    }

    window.location.href = `chat.html?conversation=${encodeURIComponent(data)}`;
}

async function loadMatchPreview(user, currentProfile) {
    const { data: profiles, error } = await window.joinCrewSupabase
        .from("profiles")
        .select("id, full_name, university, career, subjects, availability, study_preference")
        .eq("role", "user")
        .neq("id", user.id);

    if (error) {
        matchStatus.textContent = "No se pudieron cargar las coincidencias";
        return;
    }

    const matches = (profiles || [])
        .map((profile) => ({ ...profile, ...calculateCompatibility(currentProfile, profile) }))
        .sort((first, second) => second.score - first.score);
    const previewMatches = matches.slice(0, 2);

    matchStatus.textContent = matches.length
        ? `${matches.length} coincidencia${matches.length === 1 ? "" : "s"}`
        : "Sin coincidencias aún";

    if (!previewMatches.length) {
        matchPreview.innerHTML = '<p class="empty-match-preview">Aún no hay otros estudiantes registrados. Invita a tus compañeros a unirse a JoinCrew.</p>';
        return;
    }

    matchPreview.innerHTML = previewMatches.map((match, index) => `
        <article class="match-card ${index === 0 ? "featured" : ""}">
            <div class="match-top"><span class="match-score ${index === 1 ? "soft" : ""}">${match.score}% compatible</span></div>
            <div class="person"><div class="person-avatar ${index === 1 ? "amber" : "violet"}">${escapeHtml(match.full_name.charAt(0).toUpperCase())}</div><div><h3>${escapeHtml(match.full_name)}</h3><p>${escapeHtml(match.university)} · ${escapeHtml(match.career)}</p></div></div>
            <div class="tags">${match.sharedSubjects.map((subject) => `<span>📚 ${escapeHtml(subject)}</span>`).join("") || "<span>Perfil académico disponible</span>"}<span>🕐 ${escapeHtml(match.availability)}</span><span>🌐 ${escapeHtml(match.study_preference)}</span></div>
            <p class="match-description">Coincide contigo por sus intereses académicos y preferencias de estudio.</p>
            <button class="${index === 0 ? "primary-button" : "outline-button"} study-button" type="button" data-user-id="${match.id}">Enviar mensaje</button>
        </article>
    `).join("");

    matchPreview.querySelectorAll("button[data-user-id]").forEach((button) => {
        button.addEventListener("click", () => openConversation(button.dataset.userId));
    });
}

function renderSpaceCard({ icon, label, name, detail, count, href, buttonText }) {
    return `<article class="group-card"><span class="group-icon ${icon === "📹" ? "blue" : ""}">${icon}</span><div><span class="official-label ${label === "SALA EN VIVO" ? "live-label" : "neutral"}">${label}</span><h3>${escapeHtml(name)}</h3><p>${escapeHtml(detail || "Sin descripción")}</p><small>👥 ${count}</small></div><a href="${href}" class="outline-button">${buttonText}</a></article>`;
}

async function loadSpacePreviews() {
    const [groupsResult, roomsResult] = await Promise.all([
        window.joinCrewSupabase.from("study_groups").select("id, name, description, subject, modality, max_members, group_members(user_id)").eq("is_public", true).order("created_at", { ascending: false }).limit(2),
        window.joinCrewSupabase.from("study_rooms").select("id, name, description, max_participants, group_id").eq("status", "live").eq("is_public", true).order("created_at", { ascending: false }).limit(2),
    ]);

    if (groupsResult.error) {
        groupPreviewStatus.textContent = "No se pudieron cargar los grupos.";
    } else if (!groupsResult.data?.length) {
        groupPreviewStatus.textContent = "Aún no hay grupos públicos. Crea el primero.";
        groupPreview.innerHTML = "";
    } else {
        groupPreviewStatus.textContent = "Mostrando los 2 grupos más recientes.";
        groupPreview.innerHTML = groupsResult.data.map((group) => renderSpaceCard({
            icon: "👥", label: "GRUPO PÚBLICO", name: group.name,
            detail: `${group.subject} · ${group.modality}`,
            count: `${group.group_members?.length || 0}/${group.max_members}`,
            href: `grupo.html?id=${encodeURIComponent(group.id)}`, buttonText: "Ver grupo",
        })).join("");
    }

    if (roomsResult.error) {
        roomPreviewStatus.textContent = "No se pudieron cargar las salas.";
    } else if (!roomsResult.data?.length) {
        roomPreviewStatus.textContent = "No hay salas en vivo en este momento.";
        roomPreview.innerHTML = "";
    } else {
        roomPreviewStatus.textContent = "Mostrando hasta 2 salas activas.";
        roomPreview.innerHTML = roomsResult.data.map((room) => renderSpaceCard({
            icon: "📹", label: "SALA EN VIVO", name: room.name, detail: room.description,
            count: `máx. ${room.max_participants}`,
            href: `sala.html?room=${encodeURIComponent(room.id)}`,
            buttonText: "Entrar",
        })).join("");
    }
}

function formatNotificationDate(value) {
    return new Intl.DateTimeFormat("es-EC", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function renderNotifications() {
    const visibleNotice = activeNotifications.find((item) => !item.hidden_at);
    adminNotice.hidden = !visibleNotice;
    if (visibleNotice) {
        adminNotice.innerHTML = `<div><strong>Mensaje de JoinCrew</strong><span>${escapeHtml(visibleNotice.content)}</span></div><button type="button" class="hide-notice-button" data-hide-notification="${visibleNotice.id}">Ocultar</button>`;
        adminNotice.querySelector("[data-hide-notification]").addEventListener("click", () => setNotificationVisibility(visibleNotice.id, true));
    }

    const unreadCount = activeNotifications.filter((item) => !item.read_at).length;
    notificationsBadge.hidden = unreadCount === 0;
    notificationsBadge.textContent = unreadCount > 9 ? "9+" : unreadCount;
    notificationsCount.textContent = activeNotifications.length ? `${activeNotifications.length} activa(s)` : "";
    notificationsList.innerHTML = activeNotifications.length ? activeNotifications.map((item) => `<article class="notification-item ${item.hidden_at ? "is-hidden" : ""}"><p>${escapeHtml(item.content)}</p><small>${formatNotificationDate(item.created_at)} · vence ${formatNotificationDate(item.expires_at)}</small><button type="button" data-notification-action="${item.hidden_at ? "restore" : "hide"}" data-notification-id="${item.id}">${item.hidden_at ? "Mostrar en inicio" : "Ocultar del inicio"}</button></article>`).join("") : '<p class="empty-notifications">No tienes notificaciones activas.</p>';
    notificationsList.querySelectorAll("[data-notification-action]").forEach((button) => button.addEventListener("click", () => setNotificationVisibility(button.dataset.notificationId, button.dataset.notificationAction === "hide")));
}

function showNotificationFeedback(text, state = "error") {
    const previous = document.querySelector("#notification-feedback");
    previous?.remove();
    const feedback = document.createElement("p");
    feedback.id = "notification-feedback";
    feedback.className = `notification-feedback ${state}`;
    feedback.textContent = text;
    notificationsMenu.hidden = false;
    notificationsList.before(feedback);
}

async function setNotificationVisibility(notificationId, shouldHide) {
    const item = activeNotifications.find((notification) => notification.id === notificationId);
    if (!item) return;
    const previousHiddenAt = item.hidden_at;
    const previousReadAt = item.read_at;
    item.hidden_at = shouldHide ? new Date().toISOString() : null;
    if (shouldHide && !item.read_at) item.read_at = new Date().toISOString();
    renderNotifications();

const { data: { session } } = await window.joinCrewSupabase.auth.getSession();
    const response = await fetch("/.netlify/functions/notification-state", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ action: shouldHide ? "hide" : "restore", notificationId }),
    });
    const payload = await response.json();
    const error = response.ok ? null : new Error(payload.error || "No se pudo actualizar la notificación.");
    if (error) {
        item.hidden_at = previousHiddenAt;
        item.read_at = previousReadAt;
        renderNotifications();
        console.error("Notification update failed:", error);
        showNotificationFeedback("No pudimos actualizar este aviso. Ejecuta el SQL de notificaciones en Supabase y vuelve a intentarlo.");
    }
}

async function markNotificationsRead() {
    const unread = activeNotifications.filter((item) => !item.read_at);
    if (!unread.length) return;
    unread.forEach((item) => { item.read_at = new Date().toISOString(); });
    renderNotifications();
const { data: { session } } = await window.joinCrewSupabase.auth.getSession();
    const response = await fetch("/.netlify/functions/notification-state", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({ action: "read-all" }),
    });
    const error = response.ok ? null : new Error("No se pudo actualizar el estado de lectura.");
    if (error) console.error("Notification read state failed:", error);
}

async function loadNotifications() {
    const { data, error } = await window.joinCrewSupabase.from("admin_notifications")
        .select("id, content, created_at, expires_at, hidden_at, read_at")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false });
    if (error) return;
    activeNotifications = data || [];
    renderNotifications();
}

notificationsButton.addEventListener("click", () => {
    const opened = notificationsMenu.hidden;
    notificationsMenu.hidden = !opened;
    notificationsButton.setAttribute("aria-expanded", String(opened));
    if (opened) markNotificationsRead();
});

document.addEventListener("click", (event) => {
    if (!event.target.closest(".notification-center") && !notificationsMenu.hidden) {
        notificationsMenu.hidden = true;
        notificationsButton.setAttribute("aria-expanded", "false");
    }
});

async function loadApp() {
    const { data: { user } } = await window.joinCrewSupabase.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error } = await window.joinCrewSupabase
        .from("profiles")
        .select("full_name, university, career, subjects, availability, study_preference, role, plan, account_status")
        .eq("id", user.id)
        .single();

    if (!error && profile?.role === "admin") {
        window.location.href = "admin.html";
        return;
    }

    if (!error && profile?.account_status === "banned") {
        await window.joinCrewSupabase.auth.signOut();
        alert("Tu cuenta fue suspendida. Contacta a JoinCrew si crees que es un error.");
        window.location.href = "login.html";
        return;
    }

    if (!error && profile) {
        fillProfile(profile);
        await Promise.all([loadMatchPreview(user, profile), loadSpacePreviews(), loadNotifications()]);
    }
}

document.querySelector("#logout-button").addEventListener("click", async () => {
    await window.joinCrewSupabase.auth.signOut();
    window.location.href = "login.html";
});

document.querySelector("#filter-button").addEventListener("click", () => {
    window.location.href = "matches.html";
});

loadApp();
