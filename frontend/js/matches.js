const matchesList = document.querySelector("#matches-list");
const matchesMessage = document.querySelector("#matches-message");

function calculateCompatibility(current, candidate) {
  const currentSubjects = new Set(
    (current.subjects || []).map((item) => item.toLowerCase()),
  );
  const sharedSubjects = (candidate.subjects || []).filter((item) =>
    currentSubjects.has(item.toLowerCase()),
  );
  let score = 35 + Math.min(sharedSubjects.length * 25, 45);
  if (current.availability === candidate.availability) score += 12;
  if (current.studyPreference === candidate.studyPreference) score += 8;
  return { score: Math.min(score, 99), sharedSubjects };
}

function escapeHtml(value) {
  return String(value || "").replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ],
  );
}

async function openConversation(targetUserId) {
  try {
    const { conversation } = await window.joinCrewApi.post(
      "/conversations/direct",
      { targetUserId },
    );
    window.location.href = `chat.html?conversation=${encodeURIComponent(conversation.id)}`;
  } catch (error) {
    matchesMessage.textContent = error.message;
  }
}

async function loadMatches() {
  const member = await protectMemberPage();
  if (!member) return;
  matchesMessage.textContent = "Buscando estudiantes compatibles…";
  try {
    const [{ user: current }, { users }] = await Promise.all([
      window.joinCrewApi.get("/users/me"),
      window.joinCrewApi.get("/users/matches"),
    ]);
    const matches = users
      .map((profile) => ({
        ...profile,
        ...calculateCompatibility(current, profile),
      }))
      .sort((a, b) => b.score - a.score);
    matchesMessage.textContent = matches.length
      ? `${matches.length} estudiante(s) disponible(s).`
      : "Aún no hay otros estudiantes registrados para mostrar.";
    matchesList.innerHTML = matches
      .map(
        (match, index) =>
          `<article class="match"><div class="avatar ${index % 2 ? "amber" : ""}">${escapeHtml(match.fullName.charAt(0).toUpperCase())}</div><div class="match-content"><span class="score">${match.score}% compatible</span><h2>${escapeHtml(match.fullName)}</h2><p>${escapeHtml(match.university)} · ${escapeHtml(match.career)}</p><div class="tags">${match.sharedSubjects.map((subject) => `<span>📚 ${escapeHtml(subject)}</span>`).join("") || "<span>Explora su perfil académico</span>"}<span>◷ ${escapeHtml(match.availability)}</span><span>◉ ${escapeHtml(match.studyPreference)}</span></div></div><button class="primary" type="button" data-user-id="${match.id}">Enviar mensaje</button></article>`,
      )
      .join("");
    matchesList
      .querySelectorAll("button[data-user-id]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          openConversation(button.dataset.userId),
        ),
      );
  } catch (error) {
    matchesMessage.textContent =
      error.message || "No pudimos cargar las coincidencias.";
  }
}

loadMatches();
