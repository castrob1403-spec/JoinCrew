const form = document.querySelector("#registration-form");
const button = document.querySelector("#registration-button");
const message = document.querySelector("#registration-message");
const verificationState = document.querySelector("#verification-state");
const verificationEmail = document.querySelector("#verification-email");
const checkVerificationButton = document.querySelector("#check-verification-button");

function showMessage(text, type = "error") {
    message.textContent = text;
    message.dataset.type = type;
}

function showVerificationState(email) {
    form.hidden = true;
    message.hidden = true;
    document.querySelector(".login-prompt").hidden = true;
    verificationEmail.textContent = email;
    verificationState.hidden = false;
}

async function redirectIfVerified() {
    const { data: { user } } = await window.joinCrewSupabase.auth.getUser();

    if (user?.email_confirmed_at) {
        window.location.href = "app.html";
        return true;
    }

    return false;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const subjects = data.get("subjects")
        .split(",")
        .map((subject) => subject.trim())
        .filter(Boolean);

    button.disabled = true;
    button.textContent = "Creando cuenta...";
    showMessage("");

    try {
        const email = data.get("email").trim();
        const { error } = await window.joinCrewSupabase.auth.signUp({
            email,
            password: data.get("password"),
            options: {
                data: {
                    full_name: data.get("fullName").trim(),
                    university: data.get("university").trim(),
                    career: data.get("career").trim(),
                    subjects,
                    availability: data.get("availability"),
                    study_preference: data.get("studyPreference"),
                },
                emailRedirectTo: new URL("registro.html", window.location.href).href,
            },
        });

        if (error) throw error;
        showVerificationState(email);
    } catch (error) {
        showMessage(error.message || "No pudimos crear la cuenta. Inténtalo nuevamente.");
    } finally {
        button.disabled = false;
        button.textContent = "Crear mi cuenta";
    }
});

checkVerificationButton.addEventListener("click", async () => {
    checkVerificationButton.disabled = true;
    checkVerificationButton.textContent = "Verificando…";

    const verified = await redirectIfVerified();
    if (!verified) {
        checkVerificationButton.disabled = false;
        checkVerificationButton.textContent = "Ya confirmé mi correo";
        alert("Aún no detectamos la confirmación. Abre el enlace recibido en tu correo y vuelve a intentarlo.");
    }
});

window.joinCrewSupabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user?.email_confirmed_at) {
        window.location.href = "app.html";
    }
});

redirectIfVerified();
