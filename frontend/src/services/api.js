const LOCAL_API_URL = "http://localhost:3000/api";

const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? LOCAL_API_URL
    : "/api";

export async function solicitar(path, options = {}) {
  const token = localStorage.getItem("joincrew_token");
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || "No se pudo comunicar con JoinCrew.");
  }
  return payload;
}

export const api = {
  get: (path) => solicitar(path),
  post: (path, body) =>
    solicitar(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) =>
    solicitar(path, { method: "PATCH", body: JSON.stringify(body) }),
  delete: (path, body) =>
    solicitar(path, {
      method: "DELETE",
      ...(body ? { body: JSON.stringify(body) } : {}),
    }),
};

export function guardarSesion({ token, user }) {
  localStorage.setItem("joincrew_token", token);
  localStorage.setItem("joincrew_user", JSON.stringify(user));
}

export function limpiarSesion() {
  localStorage.removeItem("joincrew_token");
  localStorage.removeItem("joincrew_user");
}
