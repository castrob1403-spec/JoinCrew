const nodemailer = require("nodemailer");

function response(statusCode, payload) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
    body: JSON.stringify(payload),
  };
}

async function supabaseRequest(path, { method = "GET", token, body } = {}) {
  const result = await fetch(`${process.env.SUPABASE_URL}${path}`, {
    method,
    headers: {
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${token || process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!result.ok) throw new Error(await result.text());
  return result.status === 204 ? null : result.json();
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST")
    return response(405, { error: "Method not allowed" });

  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailPassword = process.env.GMAIL_APP_PASSWORD;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (
      !process.env.SUPABASE_URL ||
      !serviceKey ||
      !gmailUser ||
      !gmailPassword
    ) {
      throw new Error("El correo de JoinCrew todavía no está configurado.");
    }

    const accessToken = (
      event.headers.authorization ||
      event.headers.Authorization ||
      ""
    ).replace(/^Bearer\s+/i, "");
    if (!accessToken)
      return response(401, {
        error: "Inicia sesión como administradora para enviar una respuesta.",
      });

    const user = await supabaseRequest("/auth/v1/user", { token: accessToken });
    const profiles = await supabaseRequest(
      `/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,account_status`,
    );
    if (
      profiles?.[0]?.role !== "admin" ||
      profiles[0].account_status === "banned"
    ) {
      return response(403, {
        error: "Solo la administradora puede enviar respuestas.",
      });
    }

    const { contactId, reply } = JSON.parse(event.body || "{}");
    const normalizedReply = String(reply || "").trim();
    if (
      !/^[0-9a-f-]{36}$/i.test(String(contactId || "")) ||
      normalizedReply.length < 1 ||
      normalizedReply.length > 2000
    ) {
      return response(400, {
        error: "La respuesta o el mensaje de contacto no son válidos.",
      });
    }

    const contacts = await supabaseRequest(
      `/rest/v1/contact_messages?id=eq.${encodeURIComponent(contactId)}&select=id,full_name,email,subject`,
    );
    const contact = contacts?.[0];
    if (!contact)
      return response(404, {
        error: "No encontramos este mensaje de contacto.",
      });

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: gmailUser, pass: gmailPassword.replace(/\s/g, "") },
    });
    await transporter.sendMail({
      from: `JoinCrew <${gmailUser}>`,
      to: contact.email,
      replyTo: gmailUser,
      subject: `Respuesta de JoinCrew: ${contact.subject}`,
      text: `Hola ${contact.full_name},\n\n${normalizedReply}\n\nEquipo JoinCrew`,
    });

    await supabaseRequest(
      `/rest/v1/contact_messages?id=eq.${encodeURIComponent(contactId)}`,
      {
        method: "PATCH",
        body: {
          admin_reply: normalizedReply,
          replied_at: new Date().toISOString(),
          replied_by: user.id,
          status: "resolved",
        },
      },
    );
    return response(200, { message: "Respuesta enviada por correo." });
  } catch (error) {
    console.error("Contact email failed:", error);
    return response(400, {
      error: error.message || "No se pudo enviar el correo.",
    });
  }
};
