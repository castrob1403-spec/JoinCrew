const matchesList = document.querySelector("#matches-list");
const matchesMessage = document.querySelector("#matches-message");

function calculateCompatibility(current, candidate) {
    const currentSubjects = new Set((current.subjects || []).map((item) => item.toLowerCase()));
    const sharedSubjects = (candidate.subjects || []).filter((item) => currentSubjects.has(item.toLowerCase()));
    let score = 35 + Math.min(sharedSubjects.length * 25, 45);
    if (current.availability === candidate.availability) score += 12;
    if (current.study_preference === candidate.study_preference) score += 8;
    return { score: Math.min(score, 99), sharedSubjects };
}

function escapeHtml(value) {
    return String(value || "").replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character]));
}

async function openConversation(targetUserId) {
    const { data, error } = await window.joinCrewSupabase.rpc("get_or_create_direct_conversation", { target_user_id: targetUserId });
    if (error) { matchesMessage.textContent = "No se pudo abrir el chat: " + error.message; return; }
    window.location.href = `chat.html?conversation=${encodeURIComponent(data)}`;
}

async function loadMatches() {
    const member = await protectMemberPage();
    if (!member) return;
    matchesMessage.textContent = "Buscando estudiantes compatibles…";
    const { data: current, error: currentError } = await window.joinCrewSupabase.from("profiles").select("subjects, availability, study_preference").eq("id", member.user.id).single();
    const { data: profiles, error: profilesError } = await window.joinCrewSupabase.from("profiles").select("id, full_name, university, career, subjects, availability, study_preference").eq("role", "user").neq("id", member.user.id);
    if (currentError || profilesError) { matchesMessage.textContent = "No pudimos cargar las coincidencias."; return; }
    const matches = (profiles || []).map((profile) => ({ ...profile, ...calculateCompatibility(current, profile) })).sort((a, b) => b.score - a.score);
    matchesMessage.textContent = matches.length ? `${matches.length} estudiante(s) disponible(s).` : "Aún no hay otros estudiantes registrados para mostrar.";
    matchesList.innerHTML = matches.map((match, index) => `<article class="match"><div class="avatar ${index % 2 ? "amber" : ""}">${escapeHtml(match.full_name.charAt(0).toUpperCase())}</div><div class="match-content"><span class="score">${match.score}% compatible</span><h2>${escapeHtml(match.full_name)}</h2><p>${escapeHtml(match.university)} · ${escapeHtml(match.career)}</p><div class="tags">${match.sharedSubjects.map((subject) => `<span>📚 ${escapeHtml(subject)}</span>`).join("") || "<span>Explora su perfil académico</span>"}<span>◷ ${escapeHtml(match.availability)}</span><span>◉ ${escapeHtml(match.study_preference)}</span></div></div><button class="primary" type="button" data-user-id="${match.id}">Enviar mensaje</button></article>`).join("");
    matchesList.querySelectorAll("button[data-user-id]").forEach((button) => button.addEventListener("click", () => openConversation(button.dataset.userId)));
}

loadMatches();
