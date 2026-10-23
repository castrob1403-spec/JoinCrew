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
const notificationsButton = document.querySelector("#notifications-button");

function fillProfile(profile) {
  const name = profile.fullName || "Estudiante";
  profileName.textContent = name;
  welcomeName.textContent = name.split(" ")[0];
  headerName.textContent = name;
  profileInitial.textContent = name.charAt(0).toUpperCase();
  document.querySelector("#profile-career").textContent =
    profile.career || "Perfil académico";
  document.querySelector("#profile-university").textContent =
    profile.university || "JoinCrew";
  document.querySelector("#profile-availability").textContent =
    profile.availability || "Horario flexible";
  document.querySelector("#profile-modality").textContent =
    profile.studyPreference || "Modalidad no definida";
}

function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>'"]/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[character],
  );
}

function calculateCompatibility(current, candidate) {
  const currentSubjects = new Set(
    (current.subjects || []).map((subject) => subject.toLowerCase()),
  );
  const sharedSubjects = (candidate.subjects || []).filter((subject) =>
    currentSubjects.has(subject.toLowerCase()),
  );
  let score = 35 + Math.min(sharedSubjects.length * 25, 45);
  if (current.availability === candidate.availability) score += 12;
  if (current.studyPreference === candidate.studyPreference) score += 8;
  return { score: Math.min(score, 99), sharedSubjects };
}

async function loadMatchPreview(currentProfile) {
  try {
    const { users } = await window.joinCrewApi.get("/users/matches");
    const matches = (users || [])
      .map((profile) => ({
        ...profile,
        ...calculateCompatibility(currentProfile, profile),
      }))
      .sort((first, second) => second.score - first.score);
    const previewMatches = matches.slice(0, 2);
    matchStatus.textContent = matches.length
      ? `${matches.length} coincidencia${matches.length === 1 ? "" : "s"}`
      : "Sin coincidencias aún";

    if (!previewMatches.length) {
      matchPreview.innerHTML =
        '<p class="empty-match-preview">Aún no hay otros estudiantes registrados. Invita a tus compañeros a unirse a JoinCrew.</p>';
      return;
    }

    matchPreview.innerHTML = previewMatches
      .map(
        (match, index) => `
      <article class="match-card ${index === 0 ? "featured" : ""}">
        <div class="match-top"><span class="match-score ${index === 1 ? "soft" : ""}">${match.score}% compatible</span></div>
        <div class="person"><div class="person-avatar ${index === 1 ? "amber" : "violet"}">${escapeHtml(match.fullName.charAt(0).toUpperCase())}</div><div><h3>${escapeHtml(match.fullName)}</h3><p>${escapeHtml(match.university)} · ${escapeHtml(match.career)}</p></div></div>
        <div class="tags">${match.sharedSubjects.map((subject) => `<span>📚 ${escapeHtml(subject)}</span>`).join("") || "<span>Perfil académico disponible</span>"}<span>🕐 ${escapeHtml(match.availability)}</span><span>🌐 ${escapeHtml(match.studyPreference)}</span></div>
        <p class="match-description">Coincide contigo por sus intereses académicos y preferencias de estudio.</p>
        <a class="${index === 0 ? "primary-button" : "outline-button"} study-button" href="matches.html">Ver coincidencias</a>
      </article>
    `,
      )
      .join("");
  } catch (error) {
    matchStatus.textContent =
      error.message || "No se pudieron cargar las coincidencias";
  }
}

function loadSpacePreviews() {
  groupPreviewStatus.textContent =
    "Los grupos se migrarán a MongoDB en el siguiente paso.";
  roomPreviewStatus.textContent =
    "Las salas se migrarán a MongoDB en el siguiente paso.";
  groupPreview.innerHTML = "";
  roomPreview.innerHTML = "";
}

async function loadApp() {
  try {
    const { user } = await window.joinCrewApi.get("/users/me");
    if (user.role === "admin") {
      window.location.href = "admin.html";
      return;
    }
    if (user.accountStatus === "banned") {
      window.joinCrewApi.clearSession();
      window.location.href = "login.html";
      return;
    }
    fillProfile(user);
    notificationsButton?.classList.remove("has-unread");
    await loadMatchPreview(user);
    loadSpacePreviews();
  } catch {
    window.joinCrewApi.clearSession();
    window.location.href = "login.html";
  }
}

document.querySelector("#logout-button").addEventListener("click", () => {
  window.joinCrewApi.clearSession();
  window.location.href = "login.html";
});
document.querySelector("#filter-button").addEventListener("click", () => {
  window.location.href = "matches.html";
});
loadApp();
