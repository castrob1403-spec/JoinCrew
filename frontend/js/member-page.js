async function protectMemberPage() {
    const { data: { user } } = await window.studyCircleSupabase.auth.getUser();
    if (!user) {
        window.location.href = "login.html";
        return null;
    }

    const { data: profile } = await window.studyCircleSupabase
        .from("profiles")
        .select("full_name, role, account_status")
        .eq("id", user.id)
        .single();

    if (profile?.role === "admin") {
        window.location.href = "admin.html";
        return null;
    }

    if (profile?.account_status === "banned") {
        await window.studyCircleSupabase.auth.signOut();
        alert("Tu cuenta fue suspendida. Contacta a StudyCircle si crees que es un error.");
        window.location.href = "login.html";
        return null;
    }

    document.querySelectorAll("[data-user-name]").forEach((element) => {
        element.textContent = profile?.full_name?.split(" ")[0] || "Estudiante";
    });

    return { user, profile };
}

document.querySelector("#logout-button")?.addEventListener("click", async () => {
    await window.studyCircleSupabase.auth.signOut();
    window.location.href = "login.html";
});
