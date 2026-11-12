import { useEffect, useRef, useState } from "react";
import { WS_URL, isExpired, refreshAccess } from "./api.js";

const STATUS = {
  connecting: "подключение…",
  online: "в сети",
  offline: "нет соединения",
};

export default function Chat({ token, username, onLogout, onSessionLost }) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState("connecting");
  const [me, setMe] = useState(username);
  const [text, setText] = useState("");
  const wsRef = useRef(null);
  const listRef = useRef(null);
  const tokenRef = useRef(token);

  // Подключение и переподключение. Один эффект на всё время жизни экрана чата.
  useEffect(() => {
    let stopped = false;
    let timer = null;
    let attempts = 0;

    async function connect() {
      if (stopped) return;
      setStatus("connecting");
      if (isExpired(tokenRef.current)) {
        const fresh = await refreshAccess();
        if (!fresh) return !stopped && onSessionLost("Сессия истекла, войдите снова");
        tokenRef.current = fresh;
      }
      if (stopped) return;

      const socket = new WebSocket(WS_URL);
      wsRef.current = socket;
      let authed = false;

      socket.onopen = () =>
        socket.send(JSON.stringify({ type: "AUTH", payload: { token: tokenRef.current } }));

      socket.onmessage = (ev) => {
        let msg;
        try { msg = JSON.parse(ev.data); } catch { return; }
        if (msg.type === "AUTH_SUCCESS") {
          authed = true;
          attempts = 0;
          if (msg.payload && msg.payload.username) setMe(msg.payload.username);
          setStatus("online");
        } else if (msg.type === "NEW_MESSAGE" && msg.payload) {
          setMessages((m) => [...m, msg.payload]);
        }
      };

      socket.onclose = async () => {
        if (stopped || wsRef.current !== socket) return;
        setStatus("offline");
        if (!authed) {
          // отрубили до AUTH_SUCCESS — скорее всего токен не принят
          const fresh = attempts++ < 1 ? await refreshAccess() : null;
          if (!fresh) return !stopped && onSessionLost("Сервер отклонил авторизацию, войдите снова");
          tokenRef.current = fresh;
        }
        timer = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15000));
      };
    }

    connect();
    return () => {
      stopped = true;
      clearTimeout(timer);
      const s = wsRef.current;
      if (s) { s.onclose = null; s.close(); }
      wsRef.current = null;
    };
  }, [onSessionLost]);

  // Автопрокрутка вниз, если пользователь и так был внизу или это его сообщение
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const last = messages[messages.length - 1];
    const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (near || (last && last.sender === me)) el.scrollTop = el.scrollHeight;
  }, [messages, me]);

  function send(e) {
    e.preventDefault();
    const t = text.trim();
    const s = wsRef.current;
    if (!t || !s || s.readyState !== WebSocket.OPEN) return;
    s.send(JSON.stringify({ type: "CHAT_MESSAGE", payload: { text: t } }));
    setText("");
  }

  const online = status === "online";

  return (
    <main className="card chat">
      <header>
        <div>
          <strong>{me}</strong>
          <span className={"status " + status}>{STATUS[status]}</span>
        </div>
        <button type="button" onClick={onLogout}>Выйти</button>
      </header>
      <ul id="messages" ref={listRef} aria-live="polite">
        {messages.map((m, i) => (
          <li key={i} className={"msg" + (m.sender === me ? " mine" : "")}>
            <div className="meta">
              <b>{m.sender}</b> ·{" "}
              {new Date(m.timestamp || Date.now()).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </div>
            {/* React экранирует текст сам, XSS нет */}
            <div className="body">{m.text}</div>
          </li>
        ))}
      </ul>
      <form id="send-form" onSubmit={send} autoComplete="off">
        <input value={text} onChange={(e) => setText(e.target.value)}
               placeholder="Напишите сообщение…" maxLength={1000} disabled={!online} />
        <button className="primary" type="submit" disabled={!online}>Отправить</button>
      </form>
    </main>
  );
}
