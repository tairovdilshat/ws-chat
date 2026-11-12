import { useState } from "react";
import { api, saveToken } from "./api.js";

export default function AuthForm({ initialError, onAuth }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [error, setError] = useState(initialError || "");
  const [busy, setBusy] = useState(false);
  const register = mode === "register";

  async function submit(e) {
    e.preventDefault();
    const u = username.trim();
    if (!u || !password) return setError("Введите имя и пароль");
    if (register && password !== password2) return setError("Пароли не совпадают");
    setBusy(true);
    setError("");
    try {
      let data = null;
      if (register) {
        data = await api("/register/", { body: { username: u, password } });
        if (!data || !data.access) data = null; // токена нет — войдём отдельно
      }
      if (!data) data = await api("/login/", { body: { username: u, password } });
      if (!data || !data.access) throw new Error("Сервер не вернул токен");
      saveToken(data.access);
      onAuth(data.access, (data.user && data.user.username) || u);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="card auth">
      <h1>Групповой чат</h1>
      <div className="tabs" role="tablist">
        {[["login", "Вход"], ["register", "Регистрация"]].map(([m, label]) => (
          <button
            key={m}
            type="button"
            role="tab"
            className={"tab" + (mode === m ? " active" : "")}
            onClick={() => { setMode(m); setError(""); }}
          >
            {label}
          </button>
        ))}
      </div>
      <form onSubmit={submit} noValidate>
        <label>Имя пользователя
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
        </label>
        <label>Пароль
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                 autoComplete={register ? "new-password" : "current-password"} />
        </label>
        {register && (
          <label>Повторите пароль
            <input type="password" value={password2} onChange={(e) => setPassword2(e.target.value)}
                   autoComplete="new-password" />
          </label>
        )}
        <p className="error" role="alert">{error}</p>
        <button className="primary" type="submit" disabled={busy}>
          {register ? "Зарегистрироваться" : "Войти"}
        </button>
      </form>
    </main>
  );
}
