const roomId = new URLSearchParams(window.location.search).get("room");
const callId = new URLSearchParams(window.location.search).get("call");
const roomStatus = document.querySelector("#room-status");
const ownerActions = document.querySelector("#room-owner-actions");
let meetingApi;
let roomChannel;

function loadJaasScript(appId) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://8x8.vc/${encodeURIComponent(appId)}/external_api.js`;
        script.onload = resolve;
        script.onerror = () => reject(new Error("No se pudo cargar el servicio de videollamada."));
        document.head.append(script);
    });
}

function leaveClosedRoom() {
    meetingApi?.executeCommand("hangup");
    roomStatus.textContent = "La sala fue finalizada por su creador.";
    ownerActions.hidden = true;
    setTimeout(() => { window.location.href = "grupos.html#salas"; }, 1300);
}

function subscribeToRoomClosure() {
    if (!roomId) return;
    roomChannel = window.studyCircleSupabase
        .channel(`study-room-status-${roomId}`)
        .on("postgres_changes", { event: "UPDATE", schema: "public", table: "study_rooms", filter: `id=eq.${roomId}` }, (payload) => {
            if (payload.new.status === "closed") leaveClosedRoom();
        })
        .subscribe();
}

async function endPublicRoom() {
    const confirmed = confirm("¿Finalizar esta sala para todas las personas? Ya no aparecerá en las salas públicas.");
    if (!confirmed) return;
    const { error } = await window.studyCircleSupabase.rpc("end_study_room", { target_room_id: roomId });
    if (error) {
        roomStatus.textContent = "No se pudo finalizar la sala.";
        return;
    }
    leaveClosedRoom();
}

async function startRoom() {
    const member = await protectMemberPage();
    if (!member || (!roomId && !callId)) {
        window.location.href = "grupos.html";
        return;
    }
    const { data: { session } } = await window.studyCircleSupabase.auth.getSession();
    try {
        const response = await fetch("/.netlify/functions/jaas-token", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
            body: JSON.stringify(roomId ? { roomId } : { callId }),
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo abrir la sala.");
        await loadJaasScript(payload.appId);
        meetingApi = new window.JitsiMeetExternalAPI("8x8.vc", {
            roomName: `${payload.appId}/${payload.roomName}`,
            jwt: payload.token,
            parentNode: document.querySelector("#jaas-meeting"),
            userInfo: { displayName: payload.displayName },
            configOverwrite: { prejoinPageEnabled: true, startWithVideoMuted: payload.callType === "audio" },
            interfaceConfigOverwrite: { MOBILE_APP_PROMO: false },
        });
        document.querySelector(".page-title").textContent = callId ? (payload.callType === "audio" ? "Llamada privada" : "Videollamada privada") : "Sala de estudio";
        roomStatus.textContent = callId ? "Esta llamada solo está disponible para las dos personas de este chat." : "Ya estás en una videollamada segura de StudyCircle.";
        if (roomId && payload.canEndRoom) {
            ownerActions.hidden = false;
            document.querySelector("#end-public-room").addEventListener("click", endPublicRoom);
        }
        subscribeToRoomClosure();
    } catch (error) {
        roomStatus.textContent = error.message || "No se pudo abrir la videollamada.";
    }
}

window.addEventListener("beforeunload", () => roomChannel?.unsubscribe());
startRoom();
