export default function MensajeAcceso({ mensaje }) {
  if (!mensaje.text) return null;

  return (
    <p
      className={`mensaje-acceso ${mensaje.type}`}
      role="alert"
      aria-live="polite"
    >
      {mensaje.text}
    </p>
  );
}
