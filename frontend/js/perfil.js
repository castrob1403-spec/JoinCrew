const profileForm = document.querySelector("#profile-form");
const profileMessage = document.querySelector("#profile-message");

function setMessage(text, success = false) {
  profileMessage.textContent = text;
  profileMessage.classList.toggle("success", success);
}

async function loadProfile() {
  const member = await protectMemberPage();
  if (!member) return;
  const data = member.user;
  document.querySelector("#full-name").value = data.fullName || "";
  document.querySelector("#university").value = data.university || "";
  document.querySelector("#career").value = data.career || "";
  document.querySelector("#subjects").value = (data.subjects || []).join(", ");
  document.querySelector("#availability").value =
    data.availability || "Horario flexible";
  document.querySelector("#study-preference").value =
    data.studyPreference || "Ambas";
}

profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = profileForm.querySelector("button");
  button.disabled = true;
  button.textContent = "Guardando…";
  setMessage("");
  try {
    const result = await window.joinCrewApi.patch("/users/me", {
      fullName: document.querySelector("#full-name").value.trim(),
      university: document.querySelector("#university").value.trim(),
      career: document.querySelector("#career").value.trim(),
      subjects: document
        .querySelector("#subjects")
        .value.split(",")
        .map((item) => item.trim())
        .filter(Boolean),
      availability: document.querySelector("#availability").value,
      studyPreference: document.querySelector("#study-preference").value,
    });
    localStorage.setItem("joincrew_user", JSON.stringify(result.user));
    setMessage("Perfil actualizado correctamente.", true);
  } catch (error) {
    setMessage(error.message || "No se pudo guardar tu perfil.");
  } finally {
    button.disabled = false;
    button.textContent = "Guardar cambios";
  }
});

loadProfile();
