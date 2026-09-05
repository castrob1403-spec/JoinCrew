const crypto = require("node:crypto");
// Esta clave es pública (la misma que utiliza el frontend). Solo se usa para
// validar el access token actual contra Auth; los datos sensibles usan service role.
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KDsAg-Zv6RrgRrK0teSc1w_2bqXONJQ";

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

function normalizePrivateKey(value) {
    const input = value?.replace(/\\n/g, "\n").replace(/\r/g, "").trim();
    const match = input?.match(/-----BEGIN ([A-Z ]*PRIVATE KEY)-----([\s\S]*?)-----END \1-----/);
    if (!match) throw new Error("La clave privada de JaaS no tiene un formato válido.");
    const body = match[2].replace(/\s/g, "");
    const lines = body.match(/.{1,64}/g)?.join("\n");
    return `-----BEGIN ${match[1]}-----\n${lines}\n-----END ${match[1]}-----`;
}

async function supabaseRequest(path, accessToken, serviceKey, purpose) {
    const response = await fetch(`${process.env.SUPABASE_URL}${path}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${accessToken}` },
    });
    if (!response.ok) {
        const detail = await response.text();
        console.error(`Supabase ${purpose || path} failed:`, response.status, detail);
        if (response.status === 401 || response.status === 403) {
            throw new Error("Tu sesión ya no es válida. Cierra sesión e ingresa nuevamente para continuar.");
        }
        throw new Error("No se pudo conectar con la base de datos para abrir la sala.");
    }
    return response.json();
}

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method not allowed" };
    try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const appId = process.env.JAAS_APP_ID;
        const keyId = process.env.JAAS_KEY_ID;
        const privateKey = normalizePrivateKey(process.env.JAAS_PRIVATE_KEY);
        const authorization = event.headers.authorization || event.headers.Authorization;
        const accessToken = authorization?.replace(/^Bearer\s+/i, "");
        const { roomId, callId } = JSON.parse(event.body || "{}");
        if (!serviceKey || !appId || !keyId || !privateKey) throw new Error("La videollamada aún no está configurada.");
        if (!accessToken || (!roomId && !callId) || (roomId && callId)) throw new Error("Debes iniciar sesión para entrar a una llamada o sala.");

        const user = await supabaseRequest("/auth/v1/user", accessToken, SUPABASE_PUBLISHABLE_KEY, "auth user");
        const profiles = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=full_name,account_status`, serviceKey, serviceKey, "profile");
        const profile = profiles[0];
        if (!profile || profile.account_status === "banned") throw new Error("Tu cuenta no tiene acceso a esta sala.");

        let jaasRoomName;
        let isModerator = false;
        let callType = "video";
        let canEndRoom = false;

        if (roomId) {
            const rooms = await supabaseRequest(`/rest/v1/study_rooms?id=eq.${encodeURIComponent(roomId)}&select=id,group_id,created_by,status,is_public`, serviceKey, serviceKey, "room");
            const room = rooms[0];
            if (!room || room.status !== "live") throw new Error("Esta sala ya no está disponible.");
            let membership;
            if (room.group_id) {
                const members = await supabaseRequest(`/rest/v1/group_members?group_id=eq.${encodeURIComponent(room.group_id)}&user_id=eq.${encodeURIComponent(user.id)}&select=member_role`, serviceKey, serviceKey, "membership");
                membership = members[0];
                if (!room.is_public && !membership) throw new Error("Esta es una sala privada del grupo.");
            }
            jaasRoomName = `StudyCircle_room_${room.id}`;
            isModerator = room.created_by === user.id || membership?.member_role === "leader";
            canEndRoom = room.created_by === user.id;
        } else {
            const calls = await supabaseRequest(`/rest/v1/direct_calls?id=eq.${encodeURIComponent(callId)}&select=id,conversation_id,started_by,call_type,status,expires_at`, serviceKey, serviceKey, "direct call");
            const call = calls[0];
            if (!call || call.status !== "active" || new Date(call.expires_at) <= new Date()) throw new Error("Esta llamada ya terminó o ya no está disponible.");
            const conversations = await supabaseRequest(`/rest/v1/direct_conversations?id=eq.${encodeURIComponent(call.conversation_id)}&select=user_one,user_two`, serviceKey, serviceKey, "conversation");
            const conversation = conversations[0];
            if (!conversation || ![conversation.user_one, conversation.user_two].includes(user.id)) throw new Error("Esta llamada es privada para los participantes del chat.");
            jaasRoomName = `StudyCircle_call_${call.id}`;
            isModerator = call.started_by === user.id;
            callType = call.call_type;
        }

        const now = Math.floor(Date.now() / 1000);
        const token = signJwt(
            { alg: "RS256", kid: keyId, typ: "JWT" },
            {
                aud: "jitsi", iss: "chat", sub: appId, room: jaasRoomName,
                nbf: now - 10, exp: now + 60 * 60,
                context: {
                    user: { id: user.id, name: profile.full_name || "Estudiante", moderator: String(isModerator) },
                    features: { livestreaming: false, recording: false, transcription: false, "outbound-call": false },
                    room: { regex: false },
                },
            },
            privateKey,
        );
        return { statusCode: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify({ token, appId, roomName: jaasRoomName, callType, canEndRoom, displayName: profile.full_name || "Estudiante" }) };
    } catch (error) {
        return { statusCode: 400, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ error: error.message || "No se pudo abrir la videollamada." }) };
    }
};
