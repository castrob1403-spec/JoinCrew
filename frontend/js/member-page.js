async function protectMemberPage() {
  try {
    const { user } = await window.joinCrewApi.get("/users/me");
    if (user.role === "admin") {
      window.location.href = "admin.html";
      return null;
    }
    if (user.accountStatus === "banned") {
      window.joinCrewApi.clearSession();
      window.location.href = "login.html";
      return null;
    }
    document.querySelectorAll("[data-user-name]").forEach((element) => {
      element.textContent = user.fullName?.split(" ")[0] || "Estudiante";
    });
    return { user, profile: user };
  } catch {
    window.joinCrewApi.clearSession();
    window.location.href = "login.html";
    return null;
  }
}

document.querySelector("#logout-button")?.addEventListener("click", () => {
  window.joinCrewApi.clearSession();
  window.location.href = "login.html";
});
