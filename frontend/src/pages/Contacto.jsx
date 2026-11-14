import { useState } from "react";
import { Link } from "react-router";
import EstiloPagina from "../components/EstiloPagina";
import { api } from "../services/api";

const formularioInicial = { fullName: "", email: "", subject: "", message: "" };

export default function Contacto() {
  const [form, setForm] = useState(formularioInicial);
  const [feedback, setFeedback] = useState("");
  const [sending, setSending] = useState(false);
  async function enviarMensaje(event) {
    event.preventDefault();
    setSending(true);
    setFeedback("");
    try {
      const result = await api.post("/contact", {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        message: form.message.trim(),
      });
      setForm(formularioInicial);
      setFeedback(result.message);
    } catch (error) {
      setFeedback(
        error.message || "No pudimos enviar tu mensaje. Inténtalo nuevamente.",
      );
    } finally {
      setSending(false);
    }
  }
  return (
    <>
      <EstiloPagina archivos={["ContactoStyle.css"]} />
      <main className="pagina-contacto">
        <Link className="enlace-volver" to="/">
          ← Volver a JoinCrew
        </Link>
        <section className="diseno-contacto">
          <aside className="intro-contacto">
            <img src="/img/LOGOJC.png" alt="JoinCrew" />
            <p className="etiqueta">ESTAMOS PARA AYUDARTE</p>
            <h1>Hablemos de tu experiencia de estudio.</h1>
            <p>
              ¿Tienes una duda, sugerencia o necesitas ayuda con tu cuenta?
              Escríbenos y revisaremos tu mensaje.
            </p>
            <div className="nota-contacto">
              <span>⏱</span>
              <p>
                Respondemos los mensajes recibidos desde el panel de
                administración.
              </p>
            </div>
          </aside>
          <section className="tarjeta-contacto">
            <p className="etiqueta">CONTACTO</p>
            <h2>Envía tu mensaje</h2>
            <p className="descripcion-tarjeta">
              Completa estos datos y nos pondremos en contacto contigo.
            </p>
            <form onSubmit={enviarMensaje}>
              <label htmlFor="contact-name">Nombre completo</label>
              <input
                id="contact-name"
                required
                minLength="2"
                maxLength="120"
                value={form.fullName}
                onChange={(event) =>
                  setForm({ ...form, fullName: event.target.value })
                }
                placeholder="Tu nombre"
              />
              <label htmlFor="contact-email">Correo electrónico</label>
              <input
                id="contact-email"
                required
                type="email"
                maxLength="255"
                value={form.email}
                onChange={(event) =>
                  setForm({ ...form, email: event.target.value })
                }
                placeholder="correo@ejemplo.com"
              />
              <label htmlFor="contact-subject">Asunto</label>
              <select
                id="contact-subject"
                required
                value={form.subject}
                onChange={(event) =>
                  setForm({ ...form, subject: event.target.value })
                }
              >
                <option value="" disabled>
                  Selecciona un asunto
                </option>
                {[
                  "Consulta sobre mi cuenta",
                  "Problema técnico",
                  "Sugerencia para JoinCrew",
                  "Planes Premium",
                  "Otro",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <label htmlFor="contact-message">Mensaje</label>
              <textarea
                id="contact-message"
                required
                minLength="10"
                maxLength="2000"
                rows="6"
                value={form.message}
                onChange={(event) =>
                  setForm({ ...form, message: event.target.value })
                }
                placeholder="Cuéntanos cómo podemos ayudarte"
              />
              <p className="ayuda-campo">
                <span>{form.message.length}</span>/2000 caracteres
              </p>
              <button type="submit" disabled={sending}>
                {sending ? "Enviando mensaje…" : "Enviar mensaje"}
              </button>
              <p className="respuesta-contacto">{feedback}</p>
            </form>
          </section>
        </section>
      </main>
    </>
  );
}
