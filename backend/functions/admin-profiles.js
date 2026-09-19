function response(statusCode, payload) {
    return {
        statusCode,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: JSON.stringify(payload),
    };
}

async function supabaseRequest(path, { token, serviceKey } = {}) {
    const result = await fetch(`${process.env.SUPABASE_URL}${path}`, {
        headers: { apikey: serviceKey, Authorization: `Bearer ${token || serviceKey}` },
    });
    if (!result.ok) throw new Error(await result.text());
    return result.json();
}

exports.handler = async (event) => {
    if (event.httpMethod !== "GET") return response(405, { error: "Method not allowed" });
    try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        if (!process.env.SUPABASE_URL || !serviceKey) throw new Error("La consulta segura de perfiles aún no está configurada.");
        const accessToken = (event.headers.authorization || event.headers.Authorization || "").replace(/^Bearer\s+/i, "");
        if (!accessToken) return response(401, { error: "Inicia sesión como administradora para consultar los perfiles." });

        const sessionUser = await supabaseRequest("/auth/v1/user", { token: accessToken, serviceKey });
        const adminRows = await supabaseRequest(`/rest/v1/profiles?id=eq.${encodeURIComponent(sessionUser.id)}&select=role,account_status`, { serviceKey });
        const adminProfile = adminRows[0];
        if (!adminProfile || adminProfile.role !== "admin" || adminProfile.account_status === "banned") {
            return response(403, { error: "Solo la administradora puede consultar los correos registrados." });
        }

        const [profileRows, authResult] = await Promise.all([
            supabaseRequest("/rest/v1/profiles?select=id,full_name,university,career,subjects,availability,study_preference,created_at,role,plan,account_status&order=created_at.desc", { serviceKey }),
            supabaseRequest("/auth/v1/admin/users?page=1&per_page=1000", { serviceKey }),
        ]);
        const emailsByUserId = new Map((authResult.users || []).map((user) => [user.id, user.email || ""]));
        const profiles = profileRows
            .filter((profile) => profile.role !== "admin")
            .map((profile) => ({ ...profile, email: emailsByUserId.get(profile.id) || "" }));
        return response(200, { profiles });
    } catch (error) {
        console.error("Admin profile lookup failed:", error);
        return response(400, { error: "No se pudieron consultar los perfiles registrados." });
    }
};