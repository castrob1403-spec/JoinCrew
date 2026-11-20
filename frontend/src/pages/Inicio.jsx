import { useEffect, useState } from "react";
import { Link } from "react-router";

const translations = {
  es: {
    code: "ES",
    title: "JoinCrew | Encuentra tu grupo de estudio",
    nav: [
      "Inicio",
      "El problema",
      "Cómo funciona",
      "Características",
      "Contacto",
    ],
    login: "Iniciar sesión",
    heroTitle: "Encuentra personas que",
    heroHighlight: "estudian como tú.",
    heroText:
      "JoinCrew conecta estudiantes con personas que comparten sus materias, horarios, idioma y objetivos de estudio.",
    start: "Comenzar ahora",
    learn: "Conocer más",
  },
  en: {
    code: "EN",
    title: "JoinCrew | Find your study crew",
    nav: ["Home", "The problem", "How it works", "Features", "Contact"],
    login: "Log in",
    heroTitle: "Find people who",
    heroHighlight: "study like you.",
    heroText:
      "JoinCrew connects students who share subjects, schedules, language and study goals.",
    start: "Get started",
    learn: "Learn more",
  },
  pt: {
    code: "PT",
    title: "JoinCrew | Encontre seu grupo de estudos",
    nav: ["Início", "O problema", "Como funciona", "Recursos", "Contato"],
    login: "Entrar",
    heroTitle: "Encontre pessoas que",
    heroHighlight: "estudam como você.",
    heroText:
      "JoinCrew conecta estudantes que compartilham matérias, horários, idioma e objetivos de estudo.",
    start: "Começar agora",
    learn: "Saiba mais",
  },
};

export default function Inicio() {
  const [language, setLanguage] = useState(
    () => localStorage.getItem("joincrew-language") || "es",
  );
  const [menuOpen, setMenuOpen] = useState(false);
  const text = translations[language];

  useEffect(() => {
    document.documentElement.lang = language;
    document.title = text.title;
    localStorage.setItem("joincrew-language", language);
  }, [language, text.title]);

  return (
    <>
      <header className="encabezado">
        <Link to="/" className="enlace-logo">
          <div className="contenedor-logo">
            <img src="/img/LOGOJC2.png" alt="JoinCrew" />
          </div>
        </Link>
        <nav className="menu">
          <a href="#inicio">{text.nav[0]}</a>
          <a href="#problema">{text.nav[1]}</a>
          <a href="#funcionamiento">{text.nav[2]}</a>
          <a href="#caracteristicas">{text.nav[3]}</a>
          <Link to="/contacto">{text.nav[4]}</Link>
        </nav>
        <div className="acciones-encabezado">
          <div className="selector-idioma">
            <button
              className="boton-idioma"
              type="button"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              🌐 {text.code} <span>⌄</span>
            </button>
            {menuOpen && (
              <div className="menu-idioma">
                <button
                  className={language === "es" ? "active-language" : ""}
                  type="button"
                  onClick={() => {
                    setLanguage("es");
                    setMenuOpen(false);
                  }}
                >
                  🇪🇸 Español
                </button>
                <button
                  className={language === "en" ? "active-language" : ""}
                  type="button"
                  onClick={() => {
                    setLanguage("en");
                    setMenuOpen(false);
                  }}
                >
                  🇺🇸 English
                </button>
                <button
                  className={language === "pt" ? "active-language" : ""}
                  type="button"
                  onClick={() => {
                    setLanguage("pt");
                    setMenuOpen(false);
                  }}
                >
                  🇧🇷 Português
                </button>
              </div>
            )}
          </div>
          <Link to="/login" className="boton-ingreso">
            {text.login}
          </Link>
        </div>
      </header>
      <main>
        <section id="inicio" className="portada">
          <div className="contenido-portada">
            <span className="etiqueta-portada">STUDY • CONNECT • GROW</span>
            <h1>
              {text.heroTitle} <span>{text.heroHighlight}</span>
            </h1>
            <p>{text.heroText}</p>
            <div className="botones-portada">
              <Link to="/registro" className="boton-principal">
                {text.start}
              </Link>
              <a href="#funcionamiento" className="boton-secundario">
                {text.learn}
              </a>
            </div>
          </div>
          <div
            className="visual-portada logo-portada"
            aria-label="Logo de JoinCrew"
          >
            <img
              className="logo-principal"
              src="/img/LOGOJC.png"
              alt="JoinCrew"
            />
          </div>
        </section>
        <section id="problema" className="seccion-problema">
          <div className="encabezado-seccion">
            <span>EL PROBLEMA</span>
            <h2>
              Estudiar acompañado no siempre significa encontrar compañía.
            </h2>
            <p>
              Encontrar un espacio de estudio útil implica coincidir en más que
              solo tener ganas de estudiar.
            </p>
          </div>
          <div className="problemas-estudio">
            <article className="tarjeta-problema">
              <span className="icono-problema" aria-hidden="true">
                📚
              </span>
              <h3>Materias diferentes</h3>
              <p>
                Encontrar personas que estén repasando los mismos temas no
                siempre es sencillo.
              </p>
            </article>
            <article className="tarjeta-problema">
              <span className="icono-problema" aria-hidden="true">
                🕐
              </span>
              <h3>Horarios que no coinciden</h3>
              <p>
                Incluso entre amigos, la disponibilidad para estudiar puede ser
                distinta.
              </p>
            </article>
            <article className="tarjeta-problema">
              <span className="icono-problema" aria-hidden="true">
                💬
              </span>
              <h3>Falta de coordinación</h3>
              <p>
                Sin un espacio común, organizar un grupo, conversar y acordar
                una sesión toma más tiempo.
              </p>
            </article>
          </div>
        </section>
        <section id="funcionamiento" className="seccion-solucion">
          <div className="contenido-solucion">
            <span>LA SOLUCIÓN</span>
            <h2>Una forma más sencilla de encontrar tu grupo de estudio.</h2>
            <p>
              JoinCrew analiza tus preferencias y encuentra personas con
              intereses académicos y horarios compatibles contigo.
            </p>
            <Link to="/registro" className="boton-principal">
              Crear mi perfil
            </Link>
          </div>
        </section>
        <section
          className="seccion-vista-afinidad"
          aria-labelledby="match-preview-title"
        >
          <div className="diseno-vista-afinidad">
            <div className="texto-vista-afinidad">
              <span>UNA CONEXIÓN POSIBLE</span>
              <h2 id="match-preview-title">
                Así podrías encontrar a tu próximo compañero de estudio.
              </h2>
              <p>
                Las coincidencias se organizan según las materias, horarios e
                idioma que selecciones en tu perfil.
              </p>
            </div>
            <article className="tarjeta-afinidad tarjeta-principal">
              <div className="encabezado-afinidad">
                <span>Tu próximo match</span>
                <span className="estado-afinidad">●</span>
              </div>
              <div className="info-perfil">
                <div className="avatar-perfil">M</div>
                <div>
                  <h3>María</h3>
                  <p>🇪🇨 Ecuador · Computación</p>
                </div>
              </div>
              <div className="datos-afinidad">
                <div>
                  <span>📚</span>Cálculo
                </div>
                <div>
                  <span>🕐</span>18:00 – 20:00
                </div>
                <div>
                  <span>🌐</span>Español
                </div>
              </div>
              <div className="compatibility">
                <div className="texto-afinidad">
                  <span>Compatibilidad</span>
                  <strong>94%</strong>
                </div>
                <div className="barra-progreso">
                  <div />
                </div>
              </div>
            </article>
          </div>
        </section>
        <section className="seccion-pasos">
          <div className="encabezado-seccion">
            <span>CÓMO FUNCIONA</span>
            <h2>Tres pasos para encontrar tu próximo grupo de estudio.</h2>
          </div>
          <div className="contenedor-pasos">
            {[
              [
                "01",
                "👤",
                "Crea tu perfil",
                "Indica tus materias, idioma, horarios y preferencias.",
              ],
              [
                "02",
                "🔎",
                "Encuentra tu match",
                "Descubre personas compatibles con tu forma de estudiar.",
              ],
              [
                "03",
                "🎯",
                "Estudien juntos",
                "Únanse a una sesión y comiencen a estudiar.",
              ],
            ].map(([number, icon, title, text]) => (
              <article className="tarjeta-paso" key={number}>
                <div className="numero-paso">{number}</div>
                <div className="icono-paso">{icon}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section id="caracteristicas" className="seccion-caracteristicas">
          <div className="encabezado-seccion">
            <span>CARACTERÍSTICAS</span>
            <h2>Encuentra personas que realmente coincidan contigo.</h2>
          </div>
          <div className="cuadricula-caracteristicas">
            {[
              ["🌎", "Idioma", "Encuentra personas que estudien en tu idioma."],
              [
                "📚",
                "Materia",
                "Conecta con personas que estudian lo mismo que tú.",
              ],
              [
                "🕐",
                "Horarios",
                "Encuentra compañeros disponibles cuando tú lo estés.",
              ],
              [
                "🎯",
                "Objetivos",
                "Conecta con personas que comparten tus metas.",
              ],
            ].map(([icon, title, text]) => (
              <article className="tarjeta-caracteristica" key={title}>
                <div className="icono-caracteristica">{icon}</div>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="seccion-llamada">
          <div>
            <span>YOUR STUDY. YOUR PEOPLE.</span>
            <h2>Encuentra tu lugar para estudiar.</h2>
            <p>
              Crea tu perfil y descubre personas que comparten tus objetivos.
            </p>
            <Link to="/registro" className="boton-principal">
              Comenzar ahora
            </Link>
          </div>
        </section>
      </main>
      <footer className="pie">
        <div className="logo-pie">
          <strong>JoinCrew</strong>
          <p>Find your study circle.</p>
        </div>
        <div className="enlaces-pie">
          <a href="#problema">El problema</a>
          <a href="#funcionamiento">Cómo funciona</a>
          <a href="#caracteristicas">Características</a>
          <Link to="/contacto">Contacto</Link>
        </div>
        <div className="texto-pie">
          <p>© 2026 JoinCrew. Todos los derechos reservados.</p>
        </div>
      </footer>
    </>
  );
}
