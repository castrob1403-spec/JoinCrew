const $ = (selector) => document.querySelector(selector);
const loadingState = $("#loading-state");
const accessDenied = $("#access-denied");
const dashboard = $("#admin-dashboard");
const tableBody = $("#users-table-body");
const tableMessage = $("#table-message");
const studentDetail = $("#student-detail");
const notificationRecipient = $("#notification-recipient");
const notificationRecipientWrap = $("#notification-recipient-wrap");
const notificationContent = $("#admin-notification-content");
const notificationStatus = $("#notification-composer-status");
const sendNotificationButton = $("#send-admin-notification");
let students = [];
let selectedStudentId = null;
let notificationMode = "all";

function escapeHtml(value) {
  const element = document.createElement("span");
  element.textContent = value || "";
  return element.innerHTML;
}

function showDashboard() {
  loadingState.classList.add("hidden");
  dashboard.classList.remove("hidden");
}

function showDenied() {
  loadingState.classList.add("hidden");
  accessDenied.classList.remove("hidden");
}

function renderStudents(items) {
  if (!items.length) {
    tableBody.innerHTML =
      '<tr><td colspan="9" class="empty-cell">No encontramos estudiantes con esa búsqueda.</td></tr>';
    return;
  }
  tableBody.innerHTML = items
    .map(
      (student) =>
        `<tr><td><strong>${escapeHtml(student.fullName)}</strong></td><td>${escapeHtml(student.email) || "—"}</td><td>${escapeHtml(student.university) || "—"}</td><td>${escapeHtml(student.career) || "—"}</td><td>${(student.subjects || []).map(escapeHtml).join(", ") || "—"}</td><td>${escapeHtml(student.availability) || "—"}</td><td><span class="role-badge ${student.plan === "premium" ? "plan-premium" : "role-user"}">${student.plan}</span></td><td><span class="role-badge ${student.accountStatus === "banned" ? "status-banned" : "role-admin"}">${student.accountStatus === "banned" ? "Suspendida" : "Activa"}</span></td><td class="action-cell"><button data-detail="${student.id}" type="button">Ver ficha</button><button data-message="${student.id}" type="button">Mensaje</button><button data-account="${student.id}" type="button">${student.accountStatus === "banned" ? "Reactivar" : "Suspender"}</button></td></tr>`,
    )
    .join("");
  tableBody
    .querySelectorAll("[data-detail]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        showStudentDetail(button.dataset.detail),
      ),
    );
  tableBody
    .querySelectorAll("[data-message]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        openMessage(button.dataset.message),
      ),
    );
  tableBody
    .querySelectorAll("[data-account]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        toggleAccount(button.dataset.account),
      ),
    );
}

function updateStats() {
  $("#total-users").textContent = students.length;
  $("#total-universities").textContent = new Set(
    students.map((student) => student.university).filter(Boolean),
  ).size;
  $("#total-subjects").textContent = new Set(
    students.flatMap((student) => student.subjects || []),
  ).size;
  $("#total-premium").textContent = students.filter(
    (student) => student.plan === "premium",
  ).length;
}

function renderRecipients() {
  notificationRecipient.innerHTML = students
    .map(
      (student) =>
        `<option value="${student.id}">${escapeHtml(student.fullName)} · ${escapeHtml(student.email)}</option>`,
    )
    .join("");
}

async function loadStudents() {
  tableMessage.textContent = "Cargando estudiantes…";
  try {
    const result = await window.joinCrewApi.get("/admin/students");
    students = result.students || [];
    renderStudents(students);
    renderRecipients();
    updateStats();
    tableMessage.textContent = `${students.length} estudiante(s) cargado(s).`;
    await loadSentNotifications();
  } catch (error) {
    tableMessage.textContent =
      error.message || "No se pudieron cargar los estudiantes.";
  }
}

function setNotificationMode(mode, studentId) {
  notificationMode = mode;
  document
    .querySelectorAll("[data-notification-mode]")
    .forEach((button) =>
      button.classList.toggle(
        "active",
        button.dataset.notificationMode === mode,
      ),
    );
  notificationRecipientWrap.classList.toggle("hidden", mode !== "individual");
  if (studentId) notificationRecipient.value = studentId;
  sendNotificationButton.textContent =
    mode === "all" ? "Enviar a todos" : "Enviar mensaje";
}

function renderNotificationList(list, notifications, emptyText) {
  list.innerHTML =
    notifications
      .map(
        (notification) =>
          `<article class="sent-notification"><strong>${escapeHtml(notification.content)}</strong><span>${notification.recipientName ? `Para ${escapeHtml(notification.recipientName)} · ` : ""}${notification.readAt ? "Leído" : "Sin leer"} · ${new Date(notification.createdAt).toLocaleDateString("es-EC")}</span><button data-delete-notification="${notification.id}" type="button">Eliminar</button></article>`,
      )
      .join("") || emptyText;
  list
    .querySelectorAll("[data-delete-notification]")
    .forEach((button) =>
      button.addEventListener("click", () =>
        deleteNotification(button.dataset.deleteNotification),
      ),
    );
}

async function loadSentNotifications() {
  try {
    const result = await window.joinCrewApi.get("/admin/notifications");
    const notifications = result.notifications || [];
    $("#sent-notifications-status").textContent =
      `${notifications.length} aviso(s) enviados recientemente.`;
    renderNotificationList(
      $("#sent-notifications-list"),
      notifications,
      "Todavía no has enviado avisos.",
    );
  } catch (error) {
    $("#sent-notifications-status").textContent =
      error.message || "No se pudieron cargar los mensajes enviados.";
  }
}

async function loadStudentNotifications(studentId) {
  const message = $("#student-notifications-message");
  const list = $("#student-notifications-list");
  try {
    const result = await window.joinCrewApi.get(
      `/admin/students/${studentId}/notifications`,
    );
    const notifications = result.notifications || [];
    message.textContent = `${notifications.length} aviso(s) enviado(s).`;
    renderNotificationList(
      list,
      notifications,
      "Este estudiante no tiene avisos enviados.",
    );
  } catch (error) {
    message.textContent = error.message || "No se pudieron cargar los avisos.";
  }
}

async function deleteNotification(id) {
  if (!confirm("¿Eliminar este aviso? El estudiante ya no podrá verlo."))
    return;
  try {
    await window.joinCrewApi.delete(`/admin/notifications/${id}`);
    await loadSentNotifications();
    if (selectedStudentId) await loadStudentNotifications(selectedStudentId);
  } catch (error) {
    alert(error.message || "No se pudo eliminar el aviso.");
  }
}

async function sendNotification() {
  const content = notificationContent.value.trim();
  const recipientId =
    notificationMode === "individual" ? notificationRecipient.value : "";
  if (!content) {
    notificationStatus.textContent = "Escribe el mensaje antes de enviarlo.";
    return;
  }
  sendNotificationButton.disabled = true;
  sendNotificationButton.textContent = "Enviando…";
  try {
    const result = await window.joinCrewApi.post("/admin/notifications", {
      content,
      recipientId,
    });
    notificationContent.value = "";
    notificationStatus.textContent =
      notificationMode === "all"
        ? `Comunicado enviado a ${result.count} estudiante(s).`
        : "Mensaje enviado a la bandeja del estudiante.";
    await loadSentNotifications();
    if (selectedStudentId) await loadStudentNotifications(selectedStudentId);
  } catch (error) {
    notificationStatus.textContent =
      error.message || "No se pudo enviar el mensaje.";
  } finally {
    sendNotificationButton.disabled = false;
    sendNotificationButton.textContent =
      notificationMode === "all" ? "Enviar a todos" : "Enviar mensaje";
  }
}

function showStudentDetail(id) {
  const student = students.find((item) => item.id === id);
  if (!student) return;
  selectedStudentId = id;
  studentDetail.classList.remove("hidden");
  studentDetail.innerHTML = `<div class="section-heading"><div><p class="eyebrow">FICHA DEL ESTUDIANTE</p><h2>${escapeHtml(student.fullName)}</h2></div><button id="close-detail" type="button">Cerrar</button></div><div class="student-detail-grid"><p><strong>Correo</strong>${escapeHtml(student.email)}</p><p><strong>Universidad</strong>${escapeHtml(student.university) || "—"}</p><p><strong>Carrera</strong>${escapeHtml(student.career) || "—"}</p><p><strong>Materias</strong>${(student.subjects || []).map(escapeHtml).join(", ") || "—"}</p><p><strong>Disponibilidad</strong>${escapeHtml(student.availability) || "—"}</p><p><strong>Modalidad</strong>${escapeHtml(student.studyPreference) || "—"}</p><p><strong>Plan actual</strong><select id="detail-plan"><option value="free" ${student.plan === "free" ? "selected" : ""}>Free</option><option value="premium" ${student.plan === "premium" ? "selected" : ""}>Premium</option></select></p></div><button id="save-plan" class="primary-button" type="button">Guardar plan</button><section class="student-notification-history"><div><p class="eyebrow">AVISOS DE ADMINISTRACIÓN</p><h3>Mensajes enviados</h3></div><p id="student-notifications-message" class="table-message">Cargando avisos…</p><div id="student-notifications-list" class="admin-activity-list"></div></section>`;
  $("#close-detail").addEventListener("click", () =>
    studentDetail.classList.add("hidden"),
  );
  $("#save-plan").addEventListener("click", () =>
    updateAccount(student.id, student.accountStatus, $("#detail-plan").value),
  );
  loadStudentNotifications(id);
}

async function updateAccount(id, accountStatus, plan) {
  try {
    await window.joinCrewApi.patch(`/admin/students/${id}`, {
      accountStatus,
      plan,
    });
    await loadStudents();
    showStudentDetail(id);
  } catch (error) {
    alert(error.message || "No se pudo actualizar la cuenta.");
  }
}

async function toggleAccount(id) {
  const student = students.find((item) => item.id === id);
  if (!student) return;
  const accountStatus =
    student.accountStatus === "banned" ? "active" : "banned";
  if (
    accountStatus === "banned" &&
    !confirm(`¿Suspender la cuenta de ${student.fullName}?`)
  ) {
    return;
  }
  await updateAccount(id, accountStatus, student.plan);
}

function openMessage(id) {
  setNotificationMode("individual", id);
  notificationContent.focus();
  $(".notification-composer").scrollIntoView({
    behavior: "smooth",
    block: "center",
  });
}

async function loadActivity() {
  try {
    const result = await window.joinCrewApi.get("/admin/activity");
    $("#groups-admin-message").textContent =
      `${result.groups.length} grupo(s) registrados.`;
    $("#admin-groups-list").innerHTML =
      result.groups
        .map(
          (group) =>
            `<article><strong>${escapeHtml(group.name)}</strong><span>${escapeHtml(group.subject)} · ${escapeHtml(group.modality)} · ${group.memberCount}/${group.maxMembers} miembros</span><a href="grupo.html?id=${group.id}">Ver</a></article>`,
        )
        .join("") || "Sin grupos creados todavía.";
    $("#rooms-admin-message").textContent =
      `${result.rooms.length} sala(s) registradas.`;
    $("#admin-rooms-list").innerHTML =
      result.rooms
        .map(
          (room) =>
            `<article><strong>${escapeHtml(room.name)}</strong><span>${room.status === "live" ? "En vivo" : "Cerrada"} · ${room.isPublic ? "Pública" : "Privada"} · máximo ${room.maxParticipants}</span>${room.status === "live" ? `<a href="sala.html?room=${room.id}">Abrir sala</a>` : ""}</article>`,
        )
        .join("") || "Sin salas creadas todavía.";
  } catch (error) {
    $("#groups-admin-message").textContent =
      error.message || "No se pudieron cargar los grupos.";
    $("#rooms-admin-message").textContent =
      error.message || "No se pudieron cargar las salas.";
  }
}

async function loadContacts() {
  try {
    const result = await window.joinCrewApi.get("/contact");
    const messages = result.messages || [];
    $("#contacts-admin-message").textContent =
      `${messages.length} mensaje(s) recibido(s).`;
    $("#admin-contacts-list").innerHTML =
      messages
        .map((message) => {
          const reply = message.adminReply || "";
          const canSend = Boolean(reply) && message.status !== "resolved";
          return `<article class="contact-message-card"><strong>${escapeHtml(message.subject)}</strong><span>${escapeHtml(message.fullName)} · ${escapeHtml(message.email)} · ${new Date(message.createdAt).toLocaleDateString("es-EC")}</span><p class="contact-message-body">${escapeHtml(message.message)}</p>${reply ? `<div class="saved-contact-reply"><b>Respuesta guardada</b><p>${escapeHtml(reply)}</p></div>` : ""}<div class="contact-admin-actions"><button data-send-contact="${message.id}" type="button" ${canSend ? "" : "disabled"}>Enviar por Gmail</button><button data-reply-contact="${message.id}" type="button">${reply ? "Editar respuesta" : "Redactar respuesta"}</button><em>${message.status === "new" ? "Nuevo" : message.status === "read" ? "Leído" : "Respondido"}</em></div><div id="contact-reply-${message.id}" class="contact-reply-editor hidden"><label>Respuesta para ${escapeHtml(message.fullName)}<textarea maxlength="2000">${escapeHtml(reply)}</textarea></label><button data-save-contact="${message.id}" type="button">Guardar borrador</button></div></article>`;
        })
        .join("") || "Aún no hay mensajes de contacto.";
    $("#admin-contacts-list")
      .querySelectorAll("[data-reply-contact]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          $(`#contact-reply-${button.dataset.replyContact}`).classList.toggle(
            "hidden",
          ),
        ),
      );
    $("#admin-contacts-list")
      .querySelectorAll("[data-save-contact]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          saveContactReply(button.dataset.saveContact),
        ),
      );
    $("#admin-contacts-list")
      .querySelectorAll("[data-send-contact]")
      .forEach((button) =>
        button.addEventListener("click", () =>
          sendContactReply(button.dataset.sendContact),
        ),
      );
    $("#admin-contacts-list")
      .querySelectorAll(".contact-reply-editor textarea")
      .forEach((textarea) => {
        const editor = textarea.closest(".contact-reply-editor");
        const id = editor.id.replace("contact-reply-", "");
        const sendButton = document.querySelector(
          '[data-send-contact="' + id + '"]',
        );
        const initialReply = textarea.value.trim();
        const wasSent = sendButton.disabled;
        textarea.addEventListener("input", () => {
          const reply = textarea.value.trim();
          sendButton.disabled = !reply || (wasSent && reply === initialReply);
        });
      });
  } catch (error) {
    $("#contacts-admin-message").textContent =
      error.message || "No se pudieron cargar los mensajes.";
  }
}

async function saveContactReply(id) {
  const editor = $(`#contact-reply-${id}`);
  const reply = editor.querySelector("textarea").value.trim();
  if (!reply) return alert("Escribe una respuesta antes de guardarla.");
  try {
    await window.joinCrewApi.patch(`/contact/${id}`, { reply });
    await loadContacts();
  } catch (error) {
    alert(error.message || "No se pudo guardar la respuesta.");
  }
}

async function sendContactReply(id) {
  const button = document.querySelector('[data-send-contact="' + id + '"]');
  const editor = document.querySelector("#contact-reply-" + id);
  const reply = editor.querySelector("textarea").value.trim();
  if (!reply) {
    alert("Escribe una respuesta antes de enviarla.");
    return;
  }
  button.disabled = true;
  button.textContent = "Enviando…";
  try {
    await window.joinCrewApi.patch("/contact/" + id, { reply });
    await window.joinCrewApi.post("/contact/" + id + "/send", {});
    await loadContacts();
    alert("Respuesta enviada al correo de la persona.");
  } catch (error) {
    alert(error.message || "No se pudo enviar el correo.");
    button.disabled = false;
    button.textContent = "Enviar por Gmail";
  }
}

async function startAdminPanel() {
  try {
    const result = await window.joinCrewApi.get("/users/me");
    if (result.user.role !== "admin") return showDenied();
    $("#admin-name").textContent = result.user.fullName || "Administradora";
    showDashboard();
    await Promise.all([loadStudents(), loadActivity(), loadContacts()]);
  } catch {
    window.joinCrewApi.clearSession();
    window.location.href = "login.html";
  }
}

$("#user-search").addEventListener("input", (event) => {
  const term = event.target.value.trim().toLowerCase();
  renderStudents(
    students.filter((student) =>
      [
        student.fullName,
        student.email,
        student.university,
        student.career,
        ...(student.subjects || []),
      ].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(term),
      ),
    ),
  );
});
$("#refresh-button").addEventListener("click", () =>
  Promise.all([loadStudents(), loadActivity(), loadContacts()]),
);
document
  .querySelectorAll("[data-notification-mode]")
  .forEach((button) =>
    button.addEventListener("click", () =>
      setNotificationMode(button.dataset.notificationMode),
    ),
  );
sendNotificationButton.addEventListener("click", sendNotification);
$("#logout-button").addEventListener("click", () => {
  window.joinCrewApi.clearSession();
  window.location.href = "login.html";
});
startAdminPanel();
