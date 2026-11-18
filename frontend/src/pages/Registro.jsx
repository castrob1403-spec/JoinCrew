import { useState } from "react";
import { Link, useNavigate } from "react-router";
import MensajeAcceso from "../components/MensajeAcceso";
import {
  opcionesDisponibilidad,
  carreras,
  paises,
  opcionesModalidad,
} from "../data/opciones-registro";
import { api } from "../services/api";

const formularioInicial = {
  fullName: "",
  gmailUsername: "",
  password: "",
  university: "",
  country: "",
  career: "",
  subjects: "",
  availability: "",
  studyPreference: "",
};

function usuarioGmailValido(value) {
  return (
    /^[a-z0-9.]{6,30}$/i.test(value) &&
    !value.startsWith(".") &&
    !value.endsWith(".") &&
    !value.includes("..")
  );
}

export default function Registro() {
  const navigate = useNavigate();
  const [form, setForm] = useState(formularioInicial);
  const [message, setMessage] = useState({ text: "", type: "error" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  function cambiarCampo(event) {
    const { name, value } = event.target;
    setForm((currentForm) => ({ ...currentForm, [name]: value }));
  }

  function cambiarUsuarioGmail(event) {
    const username = event.target.value
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
    setForm((currentForm) => ({
      ...currentForm,
      gmailUsername: username,
    }));
  }

  async function registrar(event) {
    event.preventDefault();
    const fullName = form.fullName.trim();
    const username = form.gmailUsername.trim();
    const subjects = form.subjects
      .split(",")
      .map((subject) => subject.trim())
      .filter(Boolean);

    if (!/^[\p{L}][\p{L}' -]{1,98}$/u.test(fullName)) {
      setMessage({
        text: "Escribe un nombre de usuario válido.",
        type: "error",
      });
      return;
    }

    if (!usuarioGmailValido(username)) {
      setMessage({
        text: "El usuario de Gmail debe tener entre 6 y 30 caracteres; usa letras, números y puntos.",
        type: "error",
      });
      return;
    }

    if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(form.password)) {
      setMessage({
        text: "La contraseña debe tener 8 caracteres e incluir mayúscula, minúscula y número.",
        type: "error",
      });
      return;
    }

    setIsSubmitting(true);
    setMessage({ text: "", type: "error" });

    try {
      const result = await api.post("/auth/register", {
        fullName,
        email: `${username}@gmail.com`,
        password: form.password,
        university: form.university.trim(),
        country: form.country,
        career: form.career,
        subjects,
        availability: form.availability,
        studyPreference: form.studyPreference,
      });
      sessionStorage.setItem("joincrew_pending_verification", result.email);
      navigate("/verificar");
    } catch (error) {
      setMessage({
        text:
          error.message || "No pudimos crear tu cuenta. Inténtalo nuevamente.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="tarjeta-acceso">
      <a className="enlace-volver" href="/">
        ← Volver a JoinCrew
      </a>
      <header className="encabezado-acceso">
        <h1>Crea tu perfil</h1>
        <p>Cuéntanos un poco sobre ti para encontrar compañeros compatibles.</p>
      </header>

      <form className="formulario-acceso" onSubmit={registrar}>
        <div className="cuadricula-formulario">
          <div className="campo-formulario ancho-completo">
            <label htmlFor="fullName">Nombre de usuario</label>
            <input
              id="fullName"
              name="fullName"
              type="text"
              value={form.fullName}
              onChange={cambiarCampo}
              placeholder="Elige un nombre de usuario"
              autoComplete="name"
              minLength="3"
              maxLength="100"
              required
            />
          </div>

          <div className="campo-formulario">
            <label htmlFor="gmailUsername">Correo de Gmail</label>
            <div className="entrada-gmail">
              <input
                id="gmailUsername"
                name="gmailUsername"
                type="text"
                value={form.gmailUsername}
                onChange={cambiarUsuarioGmail}
                placeholder="tu.usuario"
                autoComplete="username"
                minLength="6"
                maxLength="30"
                required
              />
              <span aria-hidden="true">@gmail.com</span>
            </div>
            <small>Usa letras, números y puntos.</small>
          </div>

          <div className="campo-formulario">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={cambiarCampo}
              placeholder="Mayúscula, minúscula y número"
              autoComplete="new-password"
              minLength="8"
              required
            />
          </div>

          <div className="campo-formulario">
            <label htmlFor="university">Universidad o institución</label>
            <input
              id="university"
              name="university"
              type="text"
              value={form.university}
              onChange={cambiarCampo}
              placeholder="Ej. Universidad Central"
              minLength="3"
              maxLength="120"
              required
            />
          </div>

          <div className="campo-formulario">
            <label htmlFor="country">País</label>
            <select
              id="country"
              name="country"
              value={form.country}
              onChange={cambiarCampo}
              required
            >
              <option value="" disabled>
                Selecciona tu país
              </option>
              {paises.map((country) => (
                <option key={country}>{country}</option>
              ))}
            </select>
          </div>

          <div className="campo-formulario">
            <label htmlFor="career">Carrera universitaria</label>
            <select
              id="career"
              name="career"
              value={form.career}
              onChange={cambiarCampo}
              required
            >
              <option value="" disabled>
                Selecciona tu carrera
              </option>
              {carreras.map((career) => (
                <option key={career}>{career}</option>
              ))}
            </select>
          </div>

          <div className="campo-formulario ancho-completo">
            <label htmlFor="subjects">Materias que estudias</label>
            <input
              id="subjects"
              name="subjects"
              type="text"
              value={form.subjects}
              onChange={cambiarCampo}
              placeholder="Ej. Cálculo, Programación, Física"
              required
            />
            <small>Sepáralas con comas.</small>
          </div>

          <div className="campo-formulario">
            <label htmlFor="availability">Disponibilidad</label>
            <select
              id="availability"
              name="availability"
              value={form.availability}
              onChange={cambiarCampo}
              required
            >
              <option value="" disabled>
                Selecciona una opción
              </option>
              {opcionesDisponibilidad.map((availability) => (
                <option key={availability}>{availability}</option>
              ))}
            </select>
          </div>

          <div className="campo-formulario">
            <label htmlFor="studyPreference">Preferencia de estudio</label>
            <select
              id="studyPreference"
              name="studyPreference"
              value={form.studyPreference}
              onChange={cambiarCampo}
              required
            >
              <option value="" disabled>
                Selecciona una opción
              </option>
              {opcionesModalidad.map((preference) => (
                <option key={preference}>{preference}</option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creando cuenta…" : "Crear mi cuenta"}
        </button>
      </form>

      <MensajeAcceso mensaje={message} />
      <p className="enlace-acceso">
        ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
      </p>
    </section>
  );
}
