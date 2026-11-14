import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import EstiloPagina from "../components/EstiloPagina";
import { api } from "../services/api";

const groupFormInitial = {
  name: "",
  subject: "",
  description: "",
  modality: "En línea",
  maxMembers: "5",
};
const roomFormInitial = { name: "", description: "", maxParticipants: "5" };

export default function Grupos() {
  const navigate = useNavigate();
  const { user } = useUsuario();
  const [groups, setGroups] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [groupForm, setGroupForm] = useState(groupFormInitial);
  const [roomForm, setRoomForm] = useState(roomFormInitial);
  const [message, setMessage] = useState("");
  const [showPremium, setShowPremium] = useState(false);
  const [creating, setCreating] = useState("");
  const isFree = user?.plan !== "premium";
  async function cargarListas() {
    try {
      const [groupResult, roomResult] = await Promise.all([
        api.get("/groups"),
        api.get("/rooms"),
      ]);
      setGroups(groupResult.groups || []);
      setRooms(roomResult.rooms || []);
    } catch (error) {
      setMessage(error.message || "No se pudieron cargar los grupos y salas.");
    }
  }
  useEffect(() => {
    if (user) cargarListas();
  }, [user]);
  function revisarCupo(value, kind) {
    if (isFree && Number(value) > 5) {
      setShowPremium(true);
      return;
    }
    if (kind === "group") setGroupForm({ ...groupForm, maxMembers: value });
    else setRoomForm({ ...roomForm, maxParticipants: value });
  }
  async function crearGrupo(event) {
    event.preventDefault();
    if (isFree && Number(groupForm.maxMembers) > 5) return setShowPremium(true);
    setCreating("group");
    try {
      await api.post("/groups", {
        ...groupForm,
        name: groupForm.name.trim(),
        description: groupForm.description.trim(),
        maxMembers: Number(groupForm.maxMembers),
      });
      setGroupForm(groupFormInitial);
      setMessage("Grupo creado correctamente.");
      cargarListas();
    } catch (error) {
      setMessage(error.message || "No se pudo crear el grupo.");
    } finally {
      setCreating("");
    }
  }
  async function crearSala(event) {
    event.preventDefault();
    if (isFree && Number(roomForm.maxParticipants) > 5)
      return setShowPremium(true);
    setCreating("room");
    try {
      const { room } = await api.post("/rooms", {
        ...roomForm,
        name: roomForm.name.trim(),
        description: roomForm.description.trim(),
        maxParticipants: Number(roomForm.maxParticipants),
      });
      navigate(`/sala?room=${room.id}`);
    } catch (error) {
      setMessage(error.message || "No se pudo abrir la sala.");
    } finally {
      setCreating("");
    }
  }
  if (!user)
    return (
      <>
        <EstiloPagina archivos={["MemberPages.css"]} />
        <main className="pagina">
          <p>Cargando…</p>
        </main>
      </>
    );
  return (
    <>
      <EstiloPagina archivos={["MemberPages.css"]} />
      <EncabezadoUsuario user={user} active="groups" />
      <main className="pagina">
        <p className="etiqueta">SALAS Y GRUPOS</p>
        <h1 className="titulo-pagina">Encuentra tu espacio</h1>
        <p className="subtitulo">Crea un grupo o únete a uno que ya exista.</p>
        <section className="tarjeta">
          <h2>Crear un grupo</h2>
          <form className="cuadricula" onSubmit={crearGrupo}>
            <label className="campo">
              Nombre del grupo
              <input
                required
                maxLength="80"
                value={groupForm.name}
                onChange={(event) =>
                  setGroupForm({ ...groupForm, name: event.target.value })
                }
                placeholder="Elige el nombre de tu grupo"
              />
            </label>
            <label className="campo">
              Materia
              <select
                required
                value={groupForm.subject}
                onChange={(event) =>
                  setGroupForm({ ...groupForm, subject: event.target.value })
                }
              >
                <option value="">Elige una materia</option>
                {[
                  "Cálculo",
                  "Programación",
                  "Física",
                  "Química",
                  "Estadística",
                  "Álgebra",
                  "Inglés",
                  "Otra",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="campo completo">
              Descripción
              <textarea
                maxLength="500"
                value={groupForm.description}
                onChange={(event) =>
                  setGroupForm({
                    ...groupForm,
                    description: event.target.value,
                  })
                }
                placeholder="Objetivo y dinámica del grupo"
              />
            </label>
            <label className="campo">
              Modalidad
              <select
                value={groupForm.modality}
                onChange={(event) =>
                  setGroupForm({ ...groupForm, modality: event.target.value })
                }
              >
                {["En línea", "Presencial", "Ambas"].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="campo">
              Máximo de miembros
              <input
                required
                type="number"
                min="2"
                max="999"
                value={groupForm.maxMembers}
                onChange={(event) => revisarCupo(event.target.value, "group")}
              />
            </label>
            <div className="completo">
              <button
                className="principal"
                type="submit"
                disabled={creating === "group"}
              >
                {creating === "group" ? "Creando…" : "Crear grupo"}
              </button>
              <p className="mensaje exito">{message}</p>
            </div>
          </form>
        </section>
        <section id="salas" className="tarjeta">
          <p className="etiqueta">SALAS EN VIVO</p>
          <h2>Crear sala pública</h2>
          <p className="subtitulo">
            Crea una videollamada abierta para tu grupo o la comunidad. Las
            salas privadas y de más de 5 personas son Premium.
          </p>
          <form className="cuadricula" onSubmit={crearSala}>
            <label className="campo">
              Nombre de la sala
              <input
                required
                maxLength="80"
                value={roomForm.name}
                onChange={(event) =>
                  setRoomForm({ ...roomForm, name: event.target.value })
                }
                placeholder="Elige el nombre de tu sala"
              />
            </label>
            <label className="campo">
              Máximo de participantes
              <input
                required
                type="number"
                min="2"
                max="999"
                value={roomForm.maxParticipants}
                onChange={(event) => revisarCupo(event.target.value, "room")}
              />
            </label>
            <label className="campo completo">
              Descripción
              <textarea
                maxLength="500"
                value={roomForm.description}
                onChange={(event) =>
                  setRoomForm({ ...roomForm, description: event.target.value })
                }
                placeholder="Qué se estudiará en esta sala"
              />
            </label>
            <div className="completo">
              <button
                className="principal"
                type="submit"
                disabled={creating === "room"}
              >
                {creating === "room" ? "Abriendo…" : "Abrir sala pública"}
              </button>
            </div>
          </form>
        </section>
        <section className="seccion-lista">
          <h2>Grupos disponibles</h2>
          <p className="mensaje">
            {groups.length
              ? `${groups.length} grupo(s) disponible(s).`
              : "Sé la primera persona en crear un grupo."}
          </p>
          <div className="lista-grupos">
            {groups.map((group, index) => (
              <article className="grupo" key={group.id}>
                <div className={`avatar ${index % 2 ? "ambar" : ""}`}>👥</div>
                <div className="contenido-grupo">
                  <span className="puntaje">
                    {group.memberCount}/{group.maxMembers} miembros
                  </span>
                  <h2>{group.name}</h2>
                  <p>
                    {group.subject} · {group.modality}
                  </p>
                  <div className="etiquetas">
                    <span>{group.description || "Sin descripción"}</span>
                  </div>
                </div>
                <Link className="principal" to={`/grupo?id=${group.id}`}>
                  Ver grupo
                </Link>
              </article>
            ))}
          </div>
        </section>
        <section className="seccion-lista">
          <h2>Salas públicas en vivo</h2>
          <p className="mensaje">
            {rooms.length
              ? `${rooms.length} sala(s) pública(s) en vivo.`
              : "No hay salas públicas en vivo por ahora."}
          </p>
          <div className="lista-grupos">
            {rooms.map((room) => (
              <article className="grupo" key={room.id}>
                <div className="avatar ambar">🎥</div>
                <div className="contenido-grupo">
                  <span className="puntaje">
                    Hasta {room.maxParticipants} participantes
                  </span>
                  <h2>{room.name}</h2>
                  <p>{room.description || "Sala pública de estudio"}</p>
                </div>
                <Link className="principal" to={`/sala?room=${room.id}`}>
                  Unirse
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      {showPremium && (
        <dialog className="modal-premium" open>
          <button
            className="cerrar-modal"
            type="button"
            onClick={() => setShowPremium(false)}
          >
            ×
          </button>
          <span className="brillo-premium">✦</span>
          <p className="etiqueta">JOINCREW PREMIUM</p>
          <h2>Tu círculo puede crecer aún más</h2>
          <p>
            Con Premium puedes reunir a más de 5 estudiantes, crear salas
            privadas y organizar sesiones sin límites para que su grupo estudie
            a su ritmo.
          </p>
          <div className="acciones-modal-premium">
            <button
              className="secundario"
              type="button"
              onClick={() => setShowPremium(false)}
            >
              Seguir con Free
            </button>
            <Link className="principal" to="/premium">
              Conocer Premium
            </Link>
          </div>
        </dialog>
      )}
    </>
  );
}
