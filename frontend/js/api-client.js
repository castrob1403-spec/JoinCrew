const LOCAL_API_URL = "http://localhost:3000/api";
const API_URL =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? LOCAL_API_URL
    : "/api";

async function request(path, options = {}) {
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
    const error = new Error(
      payload.error || "No se pudo comunicar con JoinCrew.",
    );
    error.data = payload;
    throw error;
  }
  return payload;
}

window.joinCrewApi = {
  request,
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  saveSession({ token, user }) {
    localStorage.setItem("joincrew_token", token);
    localStorage.setItem("joincrew_user", JSON.stringify(user));
  },
  clearSession() {
    localStorage.removeItem("joincrew_token");
    localStorage.removeItem("joincrew_user");
  },
};
