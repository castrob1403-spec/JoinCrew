const crypto = require("node:crypto");

function base64Url(value) {
    return Buffer.from(typeof value === "string" ? value : JSON.stringify(value))
        .toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function signJwt(header, payload, privateKey) {
    const unsignedToken = `${base64Url(header)}.${base64Url(payload)}`;
    const signer = crypto.createSign("RSA-SHA256");
    signer.update(unsignedToken);
    signer.end();
    return `${unsignedToken}.${signer.sign(privateKey, "base64url")}`;
}

async function supabaseRequest(path, accessToken, serviceKey) {
    const response = await fetch(`${process.env.SUPABASE_URL}${path}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) throw new Error("No se pudo validar tu sesión.");
    return response.json();
}

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const appId = process.env.JAAS_APP_ID;
        const keyId = process.env.JAAS_KEY_ID;
        const privateKey = process.env.JAAS_PRIVATE_KEY?.replace(/\\n/g, "\n");
        const accessToken = event.headers.authorization?.replace(/^Bearer\s+/i, "");
        const { roomId } = JSON.parse(event.body || "{}");
        if (!serviceKey || !appId || !keyId || !privateKey) throw new Error("La videollamada aún no está configurada.");
        if (!accessToken || !roomId) throw new Error("Debes iniciar sesión para entrar a una sala.");

        const user = await supabaseRequest("/auth/v1/user", accessToken, serviceKey);
        const profiles = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=full_name,account_status`, serviceKey, serviceKey);
        const profile = profiles[0];
        if (!profile || profile.account_status === "banned") throw new Error("Tu cuenta no tiene acceso a esta sala.");

        const rooms = await supabaseRequest(`/rest/v1/study_rooms?id=eq.${encodeURIComponent(roomId)}&select=id,group_id,created_by,status,is_public`, serviceKey, serviceKey);
        const room = rooms[0];
        if (!room || room.status !== "live") throw new Error("Esta sala ya no está disponible.");

        let membership;
        if (room.group_id) {
            const members = await supabaseRequest(`/rest/v1/group_members?group_id=eq.${encodeURIComponent(room.group_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=member_role`, serviceKey, serviceKey);
            membership = members[0];
            if (!room.is_public && !membership) throw new Error("Esta es una sala privada del grupo.");
        }

        const now = Math.floor(Date.now() / 1000);
        const token = signJwt(
            { alg: "RS256", kid: keyId, typ: "JWT" },
            {
                aud: "jitsi", iss: "chat", sub: appId, room: `StudyCircle_${room.id}`,
                nbf: now - 10, exp: now + 60 * 60,
                context: {
                    user: { id: user.id, name: profile.full_name || "Estudiante", moderator: String(room.created_by === user.id || membership?.member_role === "leader") },
                    features: { livestreaming: false, recording: false, transcription: false, "outbound-call": false },
                    room: { regex: false },
                },
            },
            privateKey,
        );
        return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ token, appId, roomName: `StudyCircle_${room.id}`, displayName: profile.full_name || "Estudiante" }) };
    } catch (error) {
        return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: error.message || "No se pudo abrir la videollamada." }) };
    }
};
