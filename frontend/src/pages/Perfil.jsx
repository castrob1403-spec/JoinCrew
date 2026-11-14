import { useEffect, useState } from "react";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import EstiloPagina from "../components/EstiloPagina";
import { api } from "../services/api";

export default function Perfil() {
  const { user, setUser } = useUsuario();
  const [form, setForm] = useState(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (user)
      setForm({
        fullName: user.fullName || "",
        university: user.university || "",
        career: user.career || "",
        subjects: (user.subjects || []).join(", "),
        availability: user.availability || "Horario flexible",
        studyPreference: user.studyPreference || "Ambas",
      });
  }, [user]);
  async function guardarPerfil(event) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await api.patch("/users/me", {
        ...form,
        fullName: form.fullName.trim(),
        university: form.university.trim(),
        career: form.career.trim(),
        subjects: form.subjects
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });
      localStorage.setItem("joincrew_user", JSON.stringify(result.user));
      setUser(result.user);
      setMessage("Perfil actualizado correctamente.");
    } catch (error) {
      setMessage(error.message || "No se pudo guardar tu perfil.");
    } finally {
      setSaving(false);
    }
  }
  if (!user || !form)
    return (
      <>
        <EstiloPagina archivos={["MemberPages.css"]} />
        <main className="pagina">
          <p className="mensaje">Cargando…</p>
        </main>
      </>
    );
  return (
    <>
      <EstiloPagina archivos={["MemberPages.css"]} />
      <EncabezadoUsuario user={user} />
      <main className="pagina">
        <p className="etiqueta">PERFIL ACADÉMICO</p>
        <h1 className="titulo-pagina">Edita tu perfil</h1>
        <p className="subtitulo">
          Estos datos ayudan a encontrar compañeros de estudio compatibles.
        </p>
        <form className="tarjeta cuadricula" onSubmit={guardarPerfil}>
          <label className="campo completo">
            Nombre completo
            <input
              required
              value={form.fullName}
              onChange={(event) =>
                setForm({ ...form, fullName: event.target.value })
              }
            />
          </label>
          <label className="campo">
            Universidad o institución
            <input
              required
              value={form.university}
              onChange={(event) =>
                setForm({ ...form, university: event.target.value })
              }
            />
          </label>
          <label className="campo">
            Carrera
            <input
              required
              value={form.career}
              onChange={(event) =>
                setForm({ ...form, career: event.target.value })
              }
            />
          </label>
          <label className="campo completo">
            Materias
            <input
              required
              value={form.subjects}
              onChange={(event) =>
                setForm({ ...form, subjects: event.target.value })
              }
              placeholder="Cálculo, Programación, Física"
            />
          </label>
          <label className="campo">
            Disponibilidad
            <select
              value={form.availability}
              onChange={(event) =>
                setForm({ ...form, availability: event.target.value })
              }
            >
              {[
                "Mañana",
                "Tarde",
                "Noche",
                "Fines de semana",
                "Horario flexible",
              ].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="campo">
            Modalidad
            <select
              value={form.studyPreference}
              onChange={(event) =>
                setForm({ ...form, studyPreference: event.target.value })
              }
            >
              {["En línea", "Presencial", "Ambas"].map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <div className="completo">
            <button className="principal" type="submit" disabled={saving}>
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
            <p className="mensaje exito">{message}</p>
          </div>
        </form>
      </main>
    </>
  );
}
