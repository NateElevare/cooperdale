const isLocalHost = (hostname) => {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]"
  );
};

const API_URL = isLocalHost(window.location.hostname)
  ? "http://localhost:5050"
  : window.location.origin;

const TOKEN_KEY = "cooperdale_auth_token";

export class HttpError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

export async function http(path, options = {}) {
  const token = getAuthToken();
  const authHeaders = token ? { Authorization: `Bearer ${token}` } : {};
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!res.ok) {
    const ct = res.headers.get("content-type") || "";
    let message = `HTTP ${res.status}`;
    if (ct.includes("application/json")) {
      const data = await res.json().catch(() => null);
      message = data?.error || data?.message || message;
    } else {
      const text = await res.text().catch(() => "");
      message = text || message;
    }
    throw new HttpError(message, res.status);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}
