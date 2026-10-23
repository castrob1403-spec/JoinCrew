const sessionForm = document.querySelector("#session-form");
const calendarMessage = document.querySelector("#calendar-message");
const calendarGrid = document.querySelector("#calendar-grid");
const calendarWeekLabel = document.querySelector("#calendar-week-label");
const upcomingStatus = document.querySelector("#upcoming-session-status");
const upcomingSessions = document.querySelector("#upcoming-sessions");
const formTitle = document.querySelector("#calendar-form-title");
const saveSessionButton = document.querySelector("#save-session-button");
const cancelSessionEdit = document.querySelector("#cancel-session-edit");
let sessions = [];
let editingSessionId = null;

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

function dateKey(value) {
  const date = new Date(value);
  return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
}

function formatDate(value, options) {
  return new Intl.DateTimeFormat("es-EC", options).format(new Date(value));
}

function startOfWeek() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return date;
}

function renderCalendar() {
  const firstDay = startOfWeek();
  const lastDay = new Date(firstDay);
  lastDay.setDate(lastDay.getDate() + 6);
  calendarWeekLabel.textContent = `${formatDate(firstDay, {
    day: "numeric",
    month: "short",
  })} – ${formatDate(lastDay, { day: "numeric", month: "short" })}`;

  calendarGrid.innerHTML = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(firstDay);
    day.setDate(firstDay.getDate() + index);
    const daySessions = sessions.filter(
      (session) => dateKey(session.startsAt) === dateKey(day),
    );
    return `<article class="day ${daySessions.length ? "active" : ""}"><strong>${formatDate(
      day,
      {
        weekday: "short",
      },
    )}</strong><span>${day.getDate()}</span>${daySessions
      .map(
        (session) =>
          `<small class="session">${formatDate(session.startsAt, {
            hour: "2-digit",
            minute: "2-digit",
          })} · ${escapeHtml(session.subject)}</small>`,
      )
      .join("")}</article>`;
  }).join("");
}

function renderUpcomingSessions() {
  const now = new Date();
  const upcoming = sessions.filter(
    (session) => new Date(session.startsAt) >= now,
  );
  upcomingStatus.textContent = upcoming.length
    ? `${upcoming.length} sesión(es) programada(s).`
    : "Aún no tienes sesiones programadas.";
  upcomingSessions.innerHTML =
    upcoming
      .map(
        (session) =>
          `<article class="upcoming-session"><div><strong>${escapeHtml(session.subject)}</strong><span>${formatDate(
            session.startsAt,
            {
              dateStyle: "full",
              timeStyle: "short",
            },
          )} · ${session.durationMinutes} min</span>${session.notes ? `<p>${escapeHtml(session.notes)}</p>` : ""}</div><button data-delete-session="${session.id}" type="button">Eliminar</button></article>`,
      )
      .join("") || "";
  upcomingSessions
    .querySelectorAll("[data-delete-session]")
    .forEach((button) => {
      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.textContent = "Editar";
      editButton.addEventListener("click", () =>
        startEditingSession(button.dataset.deleteSession),
      );
      button.before(editButton);
      button.addEventListener("click", () =>
        deleteSession(button.dataset.deleteSession),
      );
    });
}

function renderSessions() {
  renderCalendar();
  renderUpcomingSessions();
}

async function loadSessions() {
  try {
    const result = await window.joinCrewApi.get("/calendar");
    sessions = result.sessions || [];
    renderSessions();
  } catch (error) {
    upcomingStatus.textContent =
      error.message || "No se pudieron cargar tus sesiones.";
  }
}

async function deleteSession(id) {
  if (!confirm("¿Eliminar esta sesión de tu calendario?")) return;
  try {
    await window.joinCrewApi.delete(`/calendar/${id}`);
    sessions = sessions.filter((session) => session.id !== id);
    renderSessions();
  } catch (error) {
    alert(error.message || "No se pudo eliminar la sesión.");
  }
}

function toDateTimeLocal(value) {
  const date = new Date(value);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function resetSessionForm() {
  editingSessionId = null;
  sessionForm.reset();
  formTitle.textContent = "Agenda una sesión";
  saveSessionButton.textContent = "Guardar sesión";
  cancelSessionEdit.classList.add("hidden");
}

function startEditingSession(id) {
  const session = sessions.find((item) => item.id === id);
  if (!session) return;
  editingSessionId = id;
  document.querySelector("#session-subject").value = session.subject;
  document.querySelector("#session-starts-at").value = toDateTimeLocal(
    session.startsAt,
  );
  document.querySelector("#session-duration").value = String(
    session.durationMinutes,
  );
  document.querySelector("#session-notes").value = session.notes || "";
  formTitle.textContent = "Edita tu sesión";
  saveSessionButton.textContent = "Guardar cambios";
  cancelSessionEdit.classList.remove("hidden");
  sessionForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

sessionForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const payload = {
    subject: document.querySelector("#session-subject").value.trim(),
    startsAt: new Date(
      document.querySelector("#session-starts-at").value,
    ).toISOString(),
    durationMinutes: Number(document.querySelector("#session-duration").value),
    notes: document.querySelector("#session-notes").value.trim(),
  };
  saveSessionButton.disabled = true;
  saveSessionButton.textContent = "Guardando…";
  calendarMessage.textContent = "";
  try {
    const result = editingSessionId
      ? await window.joinCrewApi.patch("/calendar/" + editingSessionId, payload)
      : await window.joinCrewApi.post("/calendar", payload);
    if (editingSessionId) {
      sessions = sessions.map((session) =>
        session.id === editingSessionId ? result.session : session,
      );
    } else {
      sessions.push(result.session);
    }
    sessions.sort(
      (first, second) => new Date(first.startsAt) - new Date(second.startsAt),
    );
    const wasEditing = Boolean(editingSessionId);
    resetSessionForm();
    calendarMessage.textContent = wasEditing
      ? "Sesión actualizada."
      : "Sesión guardada en tu calendario.";
    calendarMessage.classList.add("success");
    renderSessions();
  } catch (error) {
    calendarMessage.textContent =
      error.message || "No se pudo guardar la sesión.";
    calendarMessage.classList.remove("success");
  } finally {
    saveSessionButton.disabled = false;
    saveSessionButton.textContent = editingSessionId
      ? "Guardar cambios"
      : "Guardar sesión";
  }
});

cancelSessionEdit.addEventListener("click", resetSessionForm);

(async () => {
  const member = await protectMemberPage();
  if (member) loadSessions();
})();
