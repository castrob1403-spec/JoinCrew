const form = document.querySelector("#auth-form");
const submitButton = document.querySelector("#submit-button");
const message = document.querySelector("#auth-message");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.dataset.type = type;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = form.email.value.trim();
    const userPassword = form.password.value;

    submitButton.disabled = true;
    submitButton.textContent = "Ingresando...";
    showMessage("");

    try {
        const { data, error } = await window.studyCircleSupabase.auth.signInWithPassword({
            email,
            password: userPassword,
        });

        if (error) throw error;

        const { data: profile, error: profileError } = await window.studyCircleSupabase
            .from("profiles")
            .select("role, account_status")
            .eq("id", data.user.id)
            .single();

        if (profileError) throw profileError;

        if (profile.account_status === "banned") {
            await window.studyCircleSupabase.auth.signOut();
            throw new Error("Tu cuenta fue suspendida. Contacta a StudyCircle si crees que es un error.");
        }

        window.location.href = profile.role === "admin" ? "admin.html" : "app.html";
    } catch (error) {
        showMessage(error.message || "Ocurrió un error. Inténtalo nuevamente.");
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Iniciar sesión";
    }
});
