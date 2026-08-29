const roomId = new URLSearchParams(window.location.search).get("room");
const roomStatus = document.querySelector("#room-status");

function loadJaasScript(appId) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = `https://8x8.vc/${encodeURIComponent(appId)}/external_api.js`;
        script.onload = resolve; script.onerror = () => reject(new Error("No se pudo cargar el servicio de videollamada."));
        document.head.append(script);
    });
}

async function startRoom() {
    const member = await protectMemberPage();
    if (!member || !roomId) { window.location.href = "grupos.html"; return; }
    const { data: { session } } = await window.studyCircleSupabase.auth.getSession();
    try {
        const response = await fetch("/.netlify/functions/jaas-token", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ roomId }) });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "No se pudo abrir la sala.");
        await loadJaasScript(payload.appId);
        new window.JitsiMeetExternalAPI("8x8.vc", { roomName: `${payload.appId}/${payload.roomName}`, jwt: payload.token, parentNode: document.querySelector("#jaas-meeting"), userInfo: { displayName: payload.displayName }, configOverwrite: { prejoinPageEnabled: true }, interfaceConfigOverwrite: { MOBILE_APP_PROMO: false } });
        document.querySelector(".page-title").textContent = "Sala de estudio";
        roomStatus.textContent = "Ya estás en una videollamada segura de StudyCircle.";
    } catch (error) { roomStatus.textContent = error.message || "No se pudo abrir la videollamada."; }
}
startRoom();
