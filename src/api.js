export const API = "https://inai-col3.fishrungames.com/api";
export const WS_URL = "wss://inai-col3.fishrungames.com/chat/";
const TOKEN_KEY = "chat.access";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const saveToken = (t) =>
  t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY);

export function decodeJwt(token) {
  try {
    const part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(decodeURIComponent(escape(atob(part))));
  } catch {
    return null;
  }
}

export function isExpired(token, skewSec = 10) {
  const p = token && decodeJwt(token);
  return !p || !p.exp || p.exp * 1000 < Date.now() + skewSec * 1000;
}

function errorText(data, status) {
  if (data && typeof data === "object") {
    if (data.detail) return String(data.detail);
    const parts = Object.entries(data).map(
      ([k, v]) => `${k}: ${Array.isArray(v) ? v.join(" ") : v}`
    );
    if (parts.length) return parts.join("; ");
  }
  return status >= 500 ? "Ошибка сервера, попробуйте позже" : `Ошибка запроса (${status})`;
}

export async function api(path, { body, token } = {}) {
  const headers = { Accept: "application/json" };
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers.Authorization = "Bearer " + token;
  let res;
  try {
    res = await fetch(API + path, {
      method: "POST",
      headers,
      credentials: "include", // refresh-токен лежит в HttpOnly cookie
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error("Не удалось связаться с сервером");
  }
  let data = null;
  try {
    data = await res.json();
  } catch {
    /* 500 отдаёт HTML */
  }
  if (!res.ok) throw new Error(errorText(data, res.status));
  return data;
}

export async function refreshAccess() {
  try {
    const data = await api("/token/refresh/");
    if (data && data.access) {
      saveToken(data.access);
      return data.access;
    }
  } catch {
    /* cookie нет или истекла */
  }
  return null;
}
