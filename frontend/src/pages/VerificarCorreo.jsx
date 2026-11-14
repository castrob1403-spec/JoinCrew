import { useState } from "react";
import { Link, useNavigate } from "react-router";
import MensajeAcceso from "../components/MensajeAcceso";
import { api, guardarSesion } from "../services/api";

export default function VerificarCorreo() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(
    () => sessionStorage.getItem("joincrew_pending_verification") || "",
  );
  const [code, setCode] = useState("");
  const [message, setMessage] = useState({ text: "", type: "error" });
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);

  async function verificarCorreo(event) {
    event.preventDefault();
    setIsVerifying(true);
    setMessage({ text: "", type: "error" });

    try {
      const result = await api.post("/auth/verify-email", {
        email: email.trim(),
        code: code.trim(),
      });
      guardarSesion(result);
      sessionStorage.removeItem("joincrew_pending_verification");
      navigate("/app");
    } catch (error) {
      setMessage({ text: error.message, type: "error" });
    } finally {
      setIsVerifying(false);
    }
  }

  async function reenviarCodigo() {
    if (!email.trim()) {
      setMessage({ text: "Ingresa tu correo de Gmail.", type: "error" });
      return;
    }

    setIsResending(true);
    try {
      const result = await api.post("/auth/resend-verification", {
        email: email.trim(),
      });
      setMessage({ text: result.message, type: "success" });
    } catch (error) {
      setMessage({ text: error.message, type: "error" });
    } finally {
      setIsResending(false);
    }
  }

  return (
    <section className="tarjeta-acceso tarjeta-acceso--chica">
      <Link className="enlace-volver" to="/login">
        ← Volver a iniciar sesión
      </Link>
      <header className="encabezado-acceso">
        <h1>Verifica tu Gmail</h1>
        <p>Te enviamos un código de 6 dígitos para activar tu cuenta.</p>
      </header>

      <form className="formulario-acceso" onSubmit={verificarCorreo}>
        <label htmlFor="verificationEmail">Correo de Gmail</label>
        <input
          id="verificationEmail"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="usuario@gmail.com"
          autoComplete="email"
          required
        />

        <label htmlFor="verificationCode">Código</label>
        <input
          id="verificationCode"
          type="text"
          value={code}
          onChange={(event) =>
            setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
          }
          placeholder="000000"
          inputMode="numeric"
          autoComplete="one-time-code"
          minLength="6"
          maxLength="6"
          required
        />

        <button type="submit" disabled={isVerifying}>
          {isVerifying ? "Verificando…" : "Confirmar correo"}
        </button>
        <button
          className="boton-secundario"
          type="button"
          onClick={reenviarCodigo}
          disabled={isResending}
        >
          {isResending ? "Reenviando…" : "Reenviar código"}
        </button>
      </form>

      <MensajeAcceso mensaje={message} />
    </section>
  );
}
