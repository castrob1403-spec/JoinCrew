const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_KDsAg-Zv6RrgRrK0teSc1w_2bqXONJQ";

function result(statusCode, payload) {
    return { statusCode, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }, body: JSON.stringify(payload) };
}

async function request(path, { method = "GET", headers = {}, body } = {}) {
    const response = await fetch(`${process.env.SUPABASE_URL}${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!response.ok) throw new Error(await response.text());
    return response.status === 204 ? null : response.json();
}

exports.handler = async (event) => {
    if (event.httpMethod !== "POST") return result(405, { error: "Method not allowed" });
    try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!process.env.SUPABASE_URL || !serviceKey) throw new Error("El servicio de notificaciones aún no está configurado.");
        const accessToken = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
        if (!accessToken) return result(401, { error: "Tu sesión ya no es válida." });
        const user = await request("/auth/v1/user", { headers: { apikey: SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${accessToken}` } });
        const { action, notificationId } = JSON.parse(event.body || "{}");
        const baseHeaders = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, Prefer: "return=minimal" };

        if (action === "read-all") {
            await request(`/rest/v1/admin_notifications?recipient_id=eq.${encodeURIComponent(user.id)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}&read_at=is.null`, { method: "PATCH", headers: baseHeaders, body: { read_at: new Date().toISOString() } });
            return result(200, { ok: true });
        }

        if (!/^[0-9a-f-]{36}$/i.test(String(notificationId || "")) || !["hide", "restore"].includes(action)) {
            return result(400, { error: "Notificación no válida." });
        }
        const body = { hidden_at: action === "hide" ? new Date().toISOString() : null };
        if (action === "hide") body.read_at = new Date().toISOString();
        await request(`/rest/v1/admin_notifications?id=eq.${encodeURIComponent(notificationId)}&recipient_id=eq.${encodeURIComponent(user.id)}&expires_at=gt.${encodeURIComponent(new Date().toISOString())}`, { method: "PATCH", headers: baseHeaders, body });
        return result(200, { ok: true });
    } catch (error) {
        console.error("Notification state failed:", error);
        return result(400, { error: error.message || "No se pudo actualizar la notificación." });
    }
};