const profileName = document.querySelector("#profile-name");
const welcomeName = document.querySelector("#welcome-name");
const headerName = document.querySelector("#header-name");
const profileInitial = document.querySelector("#profile-initial");
const matchPreview = document.querySelector("#match-preview");
const matchStatus = document.querySelector("#match-status");

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

async function loadApp() {
    const { data: { user } } = await window.studyCircleSupabase.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error } = await window.studyCircleSupabase
        .from("profiles")
        .select("full_name, university, career, subjects, availability, study_preference, role")
        .eq("id", user.id)
        .single();

    if (!error && profile?.role === "admin") {
        window.location.href = "admin.html";
        return;
    }

    if (!error && profile) {
        fillProfile(profile);
        await loadMatchPreview(user, profile);
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
