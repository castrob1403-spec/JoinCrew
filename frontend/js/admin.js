const loadingState = document.querySelector("#loading-state");
const accessDenied = document.querySelector("#access-denied");
const dashboard = document.querySelector("#admin-dashboard");
const tableBody = document.querySelector("#users-table-body");
const tableMessage = document.querySelector("#table-message");
const searchInput = document.querySelector("#user-search");

let profiles = [];

function showDashboard() {
    loadingState.classList.add("hidden");
    dashboard.classList.remove("hidden");
}

function showDenied() {
    loadingState.classList.add("hidden");
    accessDenied.classList.remove("hidden");
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

function renderProfiles(items) {
    if (!items.length) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-cell">No encontramos estudiantes con esa búsqueda.</td></tr>';
        return;
    }

    tableBody.innerHTML = items.map((profile) => {
        const subjects = (profile.subjects || []).map(escapeHtml).join(", ") || "—";
        const roleClass = profile.role === "admin" ? "role-admin" : "role-user";

        return `<tr>
            <td><strong>${escapeHtml(profile.full_name)}</strong></td>
            <td>${escapeHtml(profile.university)}</td>
            <td>${escapeHtml(profile.career)}</td>
            <td>${subjects}</td>
            <td>${escapeHtml(profile.availability)}</td>
            <td><span class="role-badge ${roleClass}">${escapeHtml(profile.role || "user")}</span></td>
        </tr>`;
    }).join("");
}

function updateStats() {
    const universities = new Set(profiles.map((profile) => profile.university).filter(Boolean));
    const subjects = new Set(profiles.flatMap((profile) => profile.subjects || []));
    const admins = profiles.filter((profile) => profile.role === "admin");

    document.querySelector("#total-users").textContent = profiles.length;
    document.querySelector("#total-universities").textContent = universities.size;
    document.querySelector("#total-subjects").textContent = subjects.size;
    document.querySelector("#total-admins").textContent = admins.length;
}

async function loadProfiles() {
    tableMessage.textContent = "Cargando estudiantes…";
    const { data, error } = await window.studyCircleSupabase
        .from("profiles")
        .select("full_name, university, career, subjects, availability, role")
        .order("created_at", { ascending: false });

    if (error) {
        tableMessage.textContent = "No se pudieron cargar los perfiles. Revisa las políticas de Supabase.";
        return;
    }

    profiles = data || [];
    tableMessage.textContent = `${profiles.length} estudiante(s) cargado(s).`;
    updateStats();
    renderProfiles(profiles);
}

async function startAdminPanel() {
    const { data: { user } } = await window.studyCircleSupabase.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error } = await window.studyCircleSupabase
        .from("profiles")
        .select("full_name, role")
        .eq("id", user.id)
        .single();

    if (error || profile?.role !== "admin") {
        showDenied();
        return;
    }

    document.querySelector("#admin-name").textContent = profile.full_name || "Administradora";
    showDashboard();
    await loadProfiles();
}

searchInput.addEventListener("input", () => {
    const term = searchInput.value.trim().toLowerCase();
    const filteredProfiles = profiles.filter((profile) => [
        profile.full_name,
        profile.university,
        profile.career,
        ...(profile.subjects || []),
    ].some((value) => String(value || "").toLowerCase().includes(term)));

    renderProfiles(filteredProfiles);
});

document.querySelector("#refresh-button").addEventListener("click", loadProfiles);

document.querySelector("#logout-button").addEventListener("click", async () => {
    await window.studyCircleSupabase.auth.signOut();
    window.location.href = "login.html";
});

startAdminPanel();
