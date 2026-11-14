import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import { api } from "../services/api";

function cargarJitsi(appId) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[data-jaas-app="${appId}"]`);
    if (existing && window.JitsiMeetExternalAPI) return resolve();
    const script = document.createElement("script");
    script.src = `https://8x8.vc/${encodeURIComponent(appId)}/external_api.js`;
    script.dataset.jaasApp = appId;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("No se pudo cargar el servicio de videollamada."));
    document.head.append(script);
  });
}

export default function Sala() {
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const roomId = search.get("room");
  const groupId = search.get("group");
  const { user } = useUsuario();
  const meetingRef = useRef(null);
  const apiRef = useRef(null);
  const [status, setStatus] = useState(
    "Estamos preparando la videollamada segura.",
  );
  const [canEndRoom, setCanEndRoom] = useState(false);
  const [isGroupRoom, setIsGroupRoom] = useState(Boolean(groupId));
  function salirSalaCerrada() {
    apiRef.current?.executeCommand("hangup");
    setStatus("La sala fue finalizada por su creador.");
    setCanEndRoom(false);
    window.setTimeout(
      () =>
        navigate(groupId ? `/grupo-chat?group=${groupId}` : "/grupos#salas"),
      1300,
    );
  }
  useEffect(() => {
    if (!user || !roomId) {
      if (user) navigate("/grupos#salas", { replace: true });
      return;
    }
    let active = true;
    let timer;
    async function abrirSala() {
      try {
        const payload = await api.post("/meetings/token", { roomId });
        await cargarJitsi(payload.appId);
        if (!active) return;
        apiRef.current = new window.JitsiMeetExternalAPI("8x8.vc", {
          roomName: `${payload.appId}/${payload.roomName}`,
          jwt: payload.token,
          parentNode: meetingRef.current,
          userInfo: { displayName: payload.displayName },
          configOverwrite: {
            prejoinPageEnabled: true,
            startWithVideoMuted: false,
          },
          interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        });
        setStatus("Ya estás en una videollamada segura de JoinCrew.");
        setCanEndRoom(payload.canEndRoom);
        setIsGroupRoom(!payload.isPublic);
        timer = window.setInterval(async () => {
          try {
            const { room } = await api.get(`/rooms/${roomId}`);
            if (room.status === "closed") salirSalaCerrada();
          } catch {
            salirSalaCerrada();
          }
        }, 8000);
      } catch (error) {
        if (active)
          setStatus(error.message || "No se pudo abrir la videollamada.");
      }
    }
    abrirSala();
    return () => {
      active = false;
      window.clearInterval(timer);
      apiRef.current?.dispose?.();
    };
  }, [user, roomId]);
  async function finalizarSala() {
    if (
      !window.confirm(
        "¿Finalizar esta sala para todas las personas? Ya no aparecerá en las salas públicas.",
      )
    )
      return;
    try {
      await api.delete(
        groupId ? `/groups/${groupId}/rooms/${roomId}` : `/rooms/${roomId}`,
      );
      salirSalaCerrada();
    } catch (error) {
      setStatus(error.message || "No se pudo finalizar la sala.");
    }
  }
  if (!user)
    return (
      <>
        <main className="pagina">
          <p>Cargando…</p>
        </main>
      </>
    );
  return (
    <>
      <EncabezadoUsuario user={user} active="chat" />
      <main className="pagina">
        <Link
          className="volver-lista"
          to={groupId ? `/grupo-chat?group=${groupId}` : "/grupos#salas"}
        >
          ← Volver a salas
        </Link>
        <p className="etiqueta">SALA EN VIVO</p>
        <h1 className="titulo-pagina">Sala de estudio</h1>
        <p className="subtitulo">{status}</p>
        {canEndRoom && (
          <div className="acciones-llamada">
            <button
              className="terminar-llamada"
              type="button"
              onClick={finalizarSala}
            >
              {isGroupRoom
                ? "Finalizar llamada del grupo"
                : "Finalizar sala para todos"}
            </button>
          </div>
        )}
        <div className="reunion-jaas" ref={meetingRef} />
      </main>
    </>
  );
}
