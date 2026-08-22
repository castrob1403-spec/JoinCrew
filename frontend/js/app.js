const profileName = document.querySelector("#profile-name");
const welcomeName = document.querySelector("#welcome-name");
const headerName = document.querySelector("#header-name");
const profileInitial = document.querySelector("#profile-initial");

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

async function loadApp() {
    const { data: { user } } = await window.studyCircleSupabase.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const { data: profile, error } = await window.studyCircleSupabase
        .from("profiles")
        .select("full_name, university, career, availability, study_preference, role")
        .eq("id", user.id)
        .single();

    if (!error && profile?.role === "admin") {
        window.location.href = "admin.html";
        return;
    }

    if (!error && profile) fillProfile(profile);
}

document.querySelector("#logout-button").addEventListener("click", async () => {
    await window.studyCircleSupabase.auth.signOut();
    window.location.href = "login.html";
});

document.querySelector("#filter-button").addEventListener("click", () => {
    document.querySelector("#match-status").textContent = "2 coincidencias actualizadas";
    document.querySelector("#matches").scrollIntoView({ behavior: "smooth" });
});

loadApp();
