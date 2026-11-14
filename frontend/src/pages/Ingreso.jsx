import { useState } from "react";
import { Link, useNavigate } from "react-router";
import MensajeAcceso from "../components/MensajeAcceso";
import { api, guardarSesion } from "../services/api";

export default function Ingreso() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState({ text: "", type: "error" });
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function ingresar(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage({ text: "", type: "error" });

    try {
      const result = await api.post("/auth/login", {
        email: email.trim(),
        password,
      });
      guardarSesion(result);
      navigate(result.user.role === "admin" ? "/admin" : "/app");
    } catch (error) {
      if (error.data?.requiresVerification) {
        sessionStorage.setItem(
          "joincrew_pending_verification",
          error.data.email || email.trim(),
        );
        navigate("/verificar");
        return;
      }
      setMessage({
        text: error.message || "Ocurrió un error. Inténtalo nuevamente.",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="tarjeta-acceso tarjeta-acceso--chica">
      <a className="enlace-volver" href="/">
        ← Volver a JoinCrew
      </a>
      <header className="encabezado-acceso">
        <h1>Bienvenido</h1>
        <p>Ingresa para comenzar tu preparación.</p>
      </header>

      <form className="formulario-acceso" onSubmit={ingresar}>
        <label htmlFor="email">Correo electrónico</label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="correo@gmail.com"
          autoComplete="email"
          required
        />

        <label htmlFor="password">Contraseña</label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="Contraseña"
          autoComplete="current-password"
          minLength="8"
          required
        />

        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Ingresando…" : "Iniciar sesión"}
        </button>
      </form>

      <MensajeAcceso mensaje={message} />
      <p className="enlace-acceso">
        ¿No tienes cuenta? <Link to="/registro">Crear cuenta</Link>
      </p>
    </section>
  );
}
