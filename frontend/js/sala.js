const roomId = new URLSearchParams(window.location.search).get("room");
const groupId = new URLSearchParams(window.location.search).get("group");
const roomStatus = document.querySelector("#room-status");
const ownerActions = document.querySelector("#room-owner-actions");
let meetingApi;
let roomStatusTimer;

function loadJaasScript(appId) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://8x8.vc/${encodeURIComponent(appId)}/external_api.js`;
    script.onload = resolve;
    script.onerror = () =>
      reject(new Error("No se pudo cargar el servicio de videollamada."));
    document.head.append(script);
  });
}

function leaveClosedRoom() {
  clearInterval(roomStatusTimer);
  meetingApi?.executeCommand("hangup");
  roomStatus.textContent = "La sala fue finalizada por su creador.";
  ownerActions.hidden = true;
  setTimeout(() => {
    window.location.href = groupId
      ? `grupo-chat.html?group=${encodeURIComponent(groupId)}`
      : "grupos.html#salas";
  }, 1300);
}

async function checkRoomStatus() {
  try {
    const { room } = await window.joinCrewApi.get(`/rooms/${roomId}`);
    if (room.status === "closed") leaveClosedRoom();
  } catch {
    leaveClosedRoom();
  }
}

async function endPublicRoom() {
  const confirmed = confirm(
    "¿Finalizar esta sala para todas las personas? Ya no aparecerá en las salas públicas.",
  );
  if (!confirmed) return;
  try {
    const endpoint = groupId
      ? `/groups/${encodeURIComponent(groupId)}/rooms/${encodeURIComponent(roomId)}`
      : `/rooms/${encodeURIComponent(roomId)}`;
    await window.joinCrewApi.request(endpoint, { method: "DELETE" });
    leaveClosedRoom();
  } catch (error) {
    roomStatus.textContent = error.message || "No se pudo finalizar la sala.";
  }
}

async function startRoom() {
  const member = await protectMemberPage();
  if (!member || !roomId) {
    window.location.href = "grupos.html#salas";
    return;
  }
  try {
    const payload = await window.joinCrewApi.post("/meetings/token", {
      roomId,
    });
    await loadJaasScript(payload.appId);
    meetingApi = new window.JitsiMeetExternalAPI("8x8.vc", {
      roomName: `${payload.appId}/${payload.roomName}`,
      jwt: payload.token,
      parentNode: document.querySelector("#jaas-meeting"),
      userInfo: { displayName: payload.displayName },
      configOverwrite: {
        prejoinPageEnabled: true,
        startWithVideoMuted: false,
      },
      interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
    });
    document.querySelector(".page-title").textContent = "Sala de estudio";
    roomStatus.textContent = "Ya estás en una videollamada segura de JoinCrew.";
    if (payload.canEndRoom) {
      ownerActions.hidden = false;
      if (!payload.isPublic) {
        document.querySelector("#end-public-room").textContent =
          "Finalizar llamada del grupo";
      }
      document
        .querySelector("#end-public-room")
        .addEventListener("click", endPublicRoom);
    }
    roomStatusTimer = setInterval(checkRoomStatus, 8000);
  } catch (error) {
    roomStatus.textContent =
      error.message || "No se pudo abrir la videollamada.";
  }
}

window.addEventListener("beforeunload", () => clearInterval(roomStatusTimer));
startRoom();
