const profileForm = document.querySelector("#profile-form");
const profileMessage = document.querySelector("#profile-message");
let profileId;

function setMessage(text, success = false) {
    profileMessage.textContent = text;
    profileMessage.classList.toggle("success", success);
}

async function loadProfile() {
    const member = await protectMemberPage();
    if (!member) return;
    profileId = member.user.id;
    const { data, error } = await window.joinCrewSupabase
        .from("profiles")
        .select("full_name, university, career, subjects, availability, study_preference")
        .eq("id", profileId)
        .single();
    if (error) { setMessage("No se pudo cargar tu perfil."); return; }
    document.querySelector("#full-name").value = data.full_name || "";
    document.querySelector("#university").value = data.university || "";
    document.querySelector("#career").value = data.career || "";
    document.querySelector("#subjects").value = (data.subjects || []).join(", ");
    document.querySelector("#availability").value = data.availability || "Horario flexible";
    document.querySelector("#study-preference").value = data.study_preference || "Ambas";
}

profileForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = profileForm.querySelector("button");
    button.disabled = true; button.textContent = "Guardando…"; setMessage("");
    const { error } = await window.joinCrewSupabase.rpc("update_my_profile", {
        p_full_name: document.querySelector("#full-name").value.trim(), p_university: document.querySelector("#university").value.trim(), p_career: document.querySelector("#career").value.trim(), p_subjects: document.querySelector("#subjects").value.split(",").map((item) => item.trim()).filter(Boolean), p_availability: document.querySelector("#availability").value, p_study_preference: document.querySelector("#study-preference").value,
    });
    button.disabled = false; button.textContent = "Guardar cambios";
    setMessage(error ? "No se pudieron guardar los cambios." : "Perfil actualizado correctamente.", !error);
});

loadProfile();
