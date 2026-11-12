import { useCallback, useEffect, useState } from "react";
import { api, decodeJwt, getToken, isExpired, refreshAccess, saveToken } from "./api.js";
import AuthForm from "./AuthForm.jsx";
import Chat from "./Chat.jsx";

export default function App() {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState(null); // { token, username }
  const [notice, setNotice] = useState("");

  // При загрузке страницы восстанавливаем сессию из сохранённого токена
  useEffect(() => {
    (async () => {
      let token = getToken();
      if (token && isExpired(token)) token = await refreshAccess();
      if (token) {
        const p = decodeJwt(token);
        setSession({ token, username: p && p.username });
      } else {
        saveToken(null);
      }
      setReady(true);
    })();
  }, []);

  const onAuth = (token, username) => { setNotice(""); setSession({ token, username }); };

  const onSessionLost = useCallback((message) => {
    saveToken(null);
    setNotice(message);
    setSession(null);
  }, []);

  async function logout() {
    const token = session && session.token;
    saveToken(null);
    setNotice("");
    setSession(null);
    try { await api("/logout/", { token }); } catch { /* локально мы уже вышли */ }
  }

  if (!ready) return null;
  return session
    ? <Chat token={session.token} username={session.username} onLogout={logout} onSessionLost={onSessionLost} />
    : <AuthForm key={notice} initialError={notice} onAuth={onAuth} />;
}
