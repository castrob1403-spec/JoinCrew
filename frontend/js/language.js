(() => {
    const copy = {
        es: {
            code: "ES", title: "JoinCrew | Encuentra tu grupo de estudio",
            nav: ["Inicio", "El problema", "Cómo funciona", "Características", "Contacto"], login: "Iniciar sesión",
            tag: "STUDY • CONNECT • GROW", heroTitle: 'Encuentra personas que <span>estudian como tú.</span>',
            heroText: "JoinCrew conecta estudiantes con personas que comparten sus materias, horarios, idioma y objetivos de estudio.",
            start: "Comenzar ahora", learn: "Conocer más"
        },
        en: {
            code: "EN", title: "JoinCrew | Find your study crew",
            nav: ["Home", "The problem", "How it works", "Features", "Contact"], login: "Log in",
            tag: "STUDY • CONNECT • GROW", heroTitle: 'Find people who <span>study like you.</span>',
            heroText: "JoinCrew connects students who share subjects, schedules, language and study goals.",
            start: "Get started", learn: "Learn more"
        },
        pt: {
            code: "PT", title: "JoinCrew | Encontre seu grupo de estudos",
            nav: ["Início", "O problema", "Como funciona", "Recursos", "Contato"], login: "Entrar",
            tag: "STUDY • CONNECT • GROW", heroTitle: 'Encontre pessoas que <span>estudam como você.</span>',
            heroText: "JoinCrew conecta estudantes que compartilham matérias, horários, idioma e objetivos de estudo.",
            start: "Começar agora", learn: "Saiba mais"
        }
    };

    const button = document.querySelector(".language-button");
    const options = [...document.querySelectorAll("[data-language]")];
    const nav = [...document.querySelectorAll(".navbar a")];

    function applyLanguage(language) {
        const text = copy[language] || copy.es;
        document.documentElement.lang = language;
        document.title = text.title;
        button.firstChild.nodeValue = `🌐 ${text.code} `;
        button.setAttribute("aria-expanded", "false");
        nav.forEach((link, index) => { if (text.nav[index]) link.textContent = text.nav[index]; });
        document.querySelector(".login-button").textContent = text.login;
        document.querySelector(".hero-tag").textContent = text.tag;
        document.querySelector(".hero h1").innerHTML = text.heroTitle;
        document.querySelector(".hero-content > p").textContent = text.heroText;
        document.querySelector(".hero-buttons .btn-primary").textContent = text.start;
        document.querySelector(".hero-buttons .btn-secondary").textContent = text.learn;
        options.forEach((option) => option.classList.toggle("active-language", option.dataset.language === language));
        localStorage.setItem("joincrew-language", language);
    }

    button?.addEventListener("click", () => button.setAttribute("aria-expanded", String(button.getAttribute("aria-expanded") !== "true")));
    options.forEach((option) => option.addEventListener("click", (event) => { event.preventDefault(); applyLanguage(option.dataset.language); }));
    applyLanguage(localStorage.getItem("joincrew-language") || "es");
})();