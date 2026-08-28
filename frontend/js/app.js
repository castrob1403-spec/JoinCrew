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

function fillProfile(profile) {
    const name = profile.full_name || "Estudiante";
    profileName.textContent = name;
    welcomeName.textContent = name.split(" ")[0];
    headerName.textContent = name;
    profileInitial.textContent = name.charAt(0).toUpperCase();
    document.querySelector("#profile-career").textContent = profile.career || "Perfil académico";
    document.querySelector("#profile-university").textContent = profile.university || "StudyCircle";
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
    const { data, error } = await window.studyCircleSupabase
        .rpc("get_or_create_direct_conversation", { target_user_id: targetUserId });

    if (error) {
        matchStatus.textContent = "No se pudo abrir el chat";
        return;
    }

    window.location.href = `chat.html?conversation=${encodeURIComponent(data)}`;
}

async function loadMatchPreview(user, currentProfile) {
    const { data: profiles, error } = await window.studyCircleSupabase
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
        matchPreview.innerHTML = '<p class="empty-match-preview">Aún no hay otros estudiantes registrados. Invita a tus compañeros a unirse a StudyCircle.</p>';
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
        window.studyCircleSupabase.from("study_groups").select("id, name, description, subject, modality, max_members, group_members(user_id)").eq("is_public", true).order("created_at", { ascending: false }).limit(2),
        window.studyCircleSupabase.from("study_rooms").select("id, name, description, max_participants, group_id").eq("status", "live").eq("is_public", true).order("created_at", { ascending: false }).limit(2),
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
            href: `https://meet.jit.si/StudyCircle-room-${encodeURIComponent(room.id)}`,
            buttonText: "Entrar",
        })).join("");
    }
}

async function loadAdminNotice(user) {
    const { data } = await window.studyCircleSupabase.from("admin_notifications")
        .select("content, created_at").eq("recipient_id", user.id).order("created_at", { ascending: false }).limit(1);
    const notice = data?.[0];
    if (!notice) return;
    adminNotice.hidden = false;
    adminNotice.innerHTML = `<strong>Mensaje de StudyCircle</strong><span>${escapeHtml(notice.content)}</span>`;
}

async function loadApp() {
    const { data: { user } } = await window.studyCircleSupabase.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error } = await window.studyCircleSupabase
        .from("profiles")
        .select("full_name, university, career, subjects, availability, study_preference, role, plan, account_status")
        .eq("id", user.id)
        .single();

    if (!error && profile?.role === "admin") {
        window.location.href = "admin.html";
        return;
    }

    if (!error && profile?.account_status === "banned") {
        await window.studyCircleSupabase.auth.signOut();
        alert("Tu cuenta fue suspendida. Contacta a StudyCircle si crees que es un error.");
        window.location.href = "login.html";
        return;
    }

    if (!error && profile) {
        fillProfile(profile);
        await Promise.all([loadMatchPreview(user, profile), loadSpacePreviews(), loadAdminNotice(user)]);
    }
}

document.querySelector("#logout-button").addEventListener("click", async () => {
    await window.studyCircleSupabase.auth.signOut();
    window.location.href = "login.html";
});

document.querySelector("#filter-button").addEventListener("click", () => {
    window.location.href = "matches.html";
});

loadApp();
