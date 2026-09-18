const loadingState = document.querySelector("#loading-state"), accessDenied = document.querySelector("#access-denied"), dashboard = document.querySelector("#admin-dashboard"), tableBody = document.querySelector("#users-table-body"), tableMessage = document.querySelector("#table-message"), searchInput = document.querySelector("#user-search"), studentDetail = document.querySelector("#student-detail"), adminGroupsList = document.querySelector("#admin-groups-list"), adminRoomsList = document.querySelector("#admin-rooms-list"), adminContactsList = document.querySelector("#admin-contacts-list"), contactsMessage = document.querySelector("#contacts-admin-message");
let profiles = [], currentAdmin, reloadTimer;
const escapeHtml = (value) => { const e = document.createElement("span"); e.textContent = value || ""; return e.innerHTML; };
function showDashboard() { loadingState.classList.add("hidden"); dashboard.classList.remove("hidden"); }
function showDenied() { loadingState.classList.add("hidden"); accessDenied.classList.remove("hidden"); }

function renderProfiles(items) {
    if (!items.length) { tableBody.innerHTML = '<tr><td colspan="8" class="empty-cell">No encontramos estudiantes con esa búsqueda.</td></tr>'; return; }
    tableBody.innerHTML = items.map((p) => `<tr><td><strong>${escapeHtml(p.full_name)}</strong></td><td>${escapeHtml(p.university)}</td><td>${escapeHtml(p.career)}</td><td>${(p.subjects || []).map(escapeHtml).join(", ") || "—"}</td><td>${escapeHtml(p.availability)}</td><td><span class="role-badge ${p.plan === "premium" ? "plan-premium" : "role-user"}">${escapeHtml(p.plan || "free")}</span></td><td><span class="role-badge ${p.account_status === "banned" ? "status-banned" : "role-admin"}">${p.account_status === "banned" ? "Suspendida" : "Activa"}</span></td><td class="action-cell"><button data-detail="${p.id}" type="button">Ver ficha</button><button data-message="${p.id}" type="button">Mensaje</button><button data-account="${p.id}" type="button">${p.account_status === "banned" ? "Reactivar" : "Suspender"}</button></td></tr>`).join("");
    tableBody.querySelectorAll("[data-detail]").forEach((b) => b.addEventListener("click", () => showStudentDetail(b.dataset.detail)));
    tableBody.querySelectorAll("[data-message]").forEach((b) => b.addEventListener("click", () => sendMessage(b.dataset.message)));
    tableBody.querySelectorAll("[data-account]").forEach((b) => b.addEventListener("click", () => toggleAccount(b.dataset.account)));
}
function updateStats() { document.querySelector("#total-users").textContent = profiles.length; document.querySelector("#total-universities").textContent = new Set(profiles.map((p) => p.university).filter(Boolean)).size; document.querySelector("#total-subjects").textContent = new Set(profiles.flatMap((p) => p.subjects || [])).size; document.querySelector("#total-premium").textContent = profiles.filter((p) => p.plan === "premium").length; }
async function loadProfiles() { tableMessage.textContent = "Cargando estudiantes…"; const { data, error } = await window.joinCrewSupabase.from("profiles").select("id, full_name, university, career, subjects, availability, study_preference, created_at, role, plan, account_status").eq("role", "user").order("created_at", { ascending: false }); if (error) { tableMessage.textContent = "No se pudieron cargar los perfiles. Ejecuta el SQL de administración."; return; } profiles = data || []; tableMessage.textContent = `${profiles.length} estudiante(s) cargado(s).`; updateStats(); renderProfiles(profiles); }

function showStudentDetail(id) { const p = profiles.find((item) => item.id === id); if (!p) return; studentDetail.classList.remove("hidden"); studentDetail.innerHTML = `<div class="section-heading"><div><p class="eyebrow">FICHA DEL ESTUDIANTE</p><h2>${escapeHtml(p.full_name)}</h2></div><button id="close-detail" type="button">Cerrar</button></div><div class="student-detail-grid"><p><strong>Universidad</strong>${escapeHtml(p.university)}</p><p><strong>Carrera</strong>${escapeHtml(p.career)}</p><p><strong>Materias</strong>${(p.subjects || []).map(escapeHtml).join(", ") || "—"}</p><p><strong>Disponibilidad</strong>${escapeHtml(p.availability)}</p><p><strong>Modalidad</strong>${escapeHtml(p.study_preference)}</p><p><strong>Plan actual</strong><select id="detail-plan"><option value="free" ${p.plan === "free" ? "selected" : ""}>Free</option><option value="premium" ${p.plan === "premium" ? "selected" : ""}>Premium</option></select></p></div><button id="save-plan" class="primary-button" type="button">Guardar plan</button>`; document.querySelector("#close-detail").addEventListener("click", () => studentDetail.classList.add("hidden")); document.querySelector("#save-plan").addEventListener("click", () => updateAccount(p.id, p.account_status, document.querySelector("#detail-plan").value)); }
async function updateAccount(id, status, plan) { const { error } = await window.joinCrewSupabase.rpc("set_student_account", { target_user_id: id, new_status: status, new_plan: plan }); if (error) { alert(error.message); return; } await loadProfiles(); showStudentDetail(id); }
async function toggleAccount(id) { const p = profiles.find((item) => item.id === id); if (!p) return; const status = p.account_status === "banned" ? "active" : "banned"; if (status === "banned" && !confirm(`¿Suspender la cuenta de ${p.full_name}?`)) return; await updateAccount(id, status, p.plan); }
async function sendMessage(id) { const p = profiles.find((item) => item.id === id), content = prompt(`Mensaje directo para ${p?.full_name || "este estudiante"}`); if (!content?.trim()) return; const { error } = await window.joinCrewSupabase.from("admin_notifications").insert({ recipient_id: id, sender_id: currentAdmin.id, content: content.trim() }); alert(error ? error.message : "Mensaje enviado a la bandeja del estudiante."); }

async function loadActivity() { const [groups, rooms] = await Promise.all([window.joinCrewSupabase.from("study_groups").select("id, name, subject, modality, max_members, created_at, group_members(user_id)").order("created_at", { ascending: false }).limit(12), window.joinCrewSupabase.from("study_rooms").select("id, name, description, status, is_public, max_participants, created_at").order("created_at", { ascending: false }).limit(12)]); document.querySelector("#groups-admin-message").textContent = groups.error ? "No se pudieron cargar los grupos." : `${groups.data?.length || 0} grupo(s) registrados.`; adminGroupsList.innerHTML = (groups.data || []).map((g) => `<article><strong>${escapeHtml(g.name)}</strong><span>${escapeHtml(g.subject)} · ${escapeHtml(g.modality)} · ${g.group_members?.length || 0}/${g.max_members} miembros</span><a href="grupo.html?id=${g.id}">Ver</a></article>`).join("") || "Sin grupos creados todavía."; document.querySelector("#rooms-admin-message").textContent = rooms.error ? "No se pudieron cargar las salas." : `${rooms.data?.length || 0} sala(s) registradas.`; adminRoomsList.innerHTML = (rooms.data || []).map((r) => `<article><strong>${escapeHtml(r.name)}</strong><span>${r.status === "live" ? "En vivo" : "Cerrada"} · ${r.is_public ? "Pública" : "Privada"} · máximo ${r.max_participants}</span>${r.status === "live" ? `<a href="sala.html?room=${r.id}">Abrir sala</a>` : ""}</article>`).join("") || "Sin salas creadas todavía."; }

async function loadContacts() {
    const { data, error } = await window.joinCrewSupabase
        .from("contact_messages")
        .select("id, full_name, email, subject, message, status, admin_reply, replied_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
    if (error) {
        contactsMessage.textContent = "No se pudieron cargar los mensajes. Ejecuta el SQL de contacto.";
        adminContactsList.innerHTML = "";
        return;
    }
    contactsMessage.textContent = `${data?.length || 0} mensaje(s) recibido(s).`;
    adminContactsList.innerHTML = (data || []).map((item) => {
        const reply = item.admin_reply || "";
        return `<article class="contact-message-card"><strong>${escapeHtml(item.subject)}</strong><span>${escapeHtml(item.full_name)} · ${escapeHtml(item.email)} · ${new Date(item.created_at).toLocaleDateString("es-EC")}</span><p class="contact-message-body">${escapeHtml(item.message)}</p>${reply ? `<div class="saved-contact-reply"><b>Respuesta guardada</b><p>${escapeHtml(reply)}</p></div>` : ""}<div class="contact-admin-actions"><button data-send-contact="${item.id}" type="button">Enviar por Gmail</button><button data-reply-contact="${item.id}" type="button">${reply ? "Editar respuesta" : "Redactar respuesta"}</button><em>${item.status === "new" ? "Nuevo" : item.status === "read" ? "Leído" : "Respondido"}</em></div><div id="contact-reply-${item.id}" class="contact-reply-editor hidden"><label>Respuesta para ${escapeHtml(item.full_name)}<textarea maxlength="2000" data-reply-text>${escapeHtml(reply)}</textarea></label><button data-save-contact="${item.id}" type="button">Guardar borrador</button></div></article>`;
    }).join("") || "Aún no hay mensajes de contacto.";
    adminContactsList.querySelectorAll("[data-reply-contact]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#contact-reply-${button.dataset.replyContact}`).classList.toggle("hidden")));
    adminContactsList.querySelectorAll("[data-save-contact]").forEach((button) => button.addEventListener("click", () => saveContactReply(button.dataset.saveContact)));
    adminContactsList.querySelectorAll("[data-send-contact]").forEach((button) => button.addEventListener("click", () => sendContactReply(button.dataset.sendContact)));
}

async function saveContactReply(id) {
    const editor = document.querySelector(`#contact-reply-${id}`);
    const reply = editor.querySelector("[data-reply-text]").value.trim();
    if (!reply) { alert("Escribe una respuesta antes de guardarla."); return; }
    const saveButton = editor.querySelector("[data-save-contact]");
    saveButton.disabled = true;
    saveButton.textContent = "Guardando…";
    const { error } = await window.joinCrewSupabase.from("contact_messages").update({ admin_reply: reply, replied_at: new Date().toISOString(), replied_by: currentAdmin.id, status: "resolved" }).eq("id", id);
    if (error) { alert(error.message || "No se pudo guardar la respuesta."); saveButton.disabled = false; saveButton.textContent = "Guardar borrador"; return; }
    await loadContacts();
}

async function sendContactReply(id) {
    const editor = document.querySelector(`#contact-reply-${id}`);
    const reply = editor.querySelector("[data-reply-text]").value.trim();
    if (!reply) { alert("Escribe una respuesta antes de enviarla."); return; }
    const sendButton = document.querySelector(`[data-send-contact="${id}"]`);
    sendButton.disabled = true;
    sendButton.textContent = "Enviando…";
    try {
        const { data: { session } } = await window.joinCrewSupabase.auth.getSession();
        const result = await fetch("/.netlify/functions/contact-reply", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
            body: JSON.stringify({ contactId: id, reply }),
        });
        const payload = await result.json();
        if (!result.ok) throw new Error(payload.error);
        await loadContacts();
        alert("Respuesta enviada al correo de la persona.");
    } catch (error) {
        alert(error.message || "No se pudo enviar el correo.");
        sendButton.disabled = false;
        sendButton.textContent = "Enviar por Gmail";
    }
}
function scheduleReload() { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => { loadProfiles(); loadActivity(); loadContacts(); }, 350); }
function subscribeToChanges() { window.joinCrewSupabase.channel("admin-live-data").on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, scheduleReload).on("postgres_changes", { event: "*", schema: "public", table: "study_groups" }, scheduleReload).on("postgres_changes", { event: "*", schema: "public", table: "study_rooms" }, scheduleReload).subscribe(); }
async function startAdminPanel() { const { data: { user } } = await window.joinCrewSupabase.auth.getUser(); if (!user) { window.location.href = "login.html"; return; } const { data: profile, error } = await window.joinCrewSupabase.from("profiles").select("id, full_name, role").eq("id", user.id).single(); if (error || profile?.role !== "admin") { showDenied(); return; } currentAdmin = user; document.querySelector("#admin-name").textContent = profile.full_name || "Administradora"; showDashboard(); await Promise.all([loadProfiles(), loadActivity(), loadContacts()]); subscribeToChanges(); }
searchInput.addEventListener("input", () => { const t = searchInput.value.trim().toLowerCase(); renderProfiles(profiles.filter((p) => [p.full_name, p.university, p.career, ...(p.subjects || [])].some((v) => String(v || "").toLowerCase().includes(t)))); });
document.querySelector("#refresh-button").addEventListener("click", () => Promise.all([loadProfiles(), loadActivity(), loadContacts()]));
document.querySelector("#logout-button").addEventListener("click", async () => { await window.joinCrewSupabase.auth.signOut(); window.location.href = "login.html"; });
startAdminPanel();
