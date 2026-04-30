"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "murabaha_admin_token";

type Order = {
  id: string;
  createdAt: string;
  firstName: string;
  lastName: string;
  phone: string;
  firstPaymentDate: string;
  cost: number;
  firstPayment: number;
  period: number;
  monthlyPayment: number;
  summaryPayment: number;
  guarantorsCount: number;
  buyerPassportMainPath?: string;
  buyerPassportResidencePath?: string;
  buyerSelfiePath?: string;
  guarantor1PassportMainPath?: string;
  guarantor1PassportResidencePath?: string;
  guarantor2PassportMainPath?: string;
  guarantor2PassportResidencePath?: string;
};

function formatMoney(v: number) {
  return v.toLocaleString("ru-RU") + " ₽";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function imageUrl(relativePath: string) {
  // relativePath looks like: uploads/orders/{id}/filename.jpg
  return `${API_URL}/${relativePath}`;
}

function PhotoThumb({ path, label }: { path: string | undefined; label: string }) {
  const [open, setOpen] = useState(false);
  if (!path) return <span style={{ color: "rgba(11,20,37,0.3)", fontSize: "0.76rem" }}>—</span>;
  const url = imageUrl(path);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          border: "1px solid rgba(11,20,37,0.12)",
          borderRadius: "0.5rem",
          padding: 0,
          background: "none",
          cursor: "pointer",
          overflow: "hidden",
          width: 52,
          height: 52,
          flexShrink: 0,
        }}
        title={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </button>
      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(7,17,31,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "1.5rem",
          }}
          onClick={() => setOpen(false)}
        >
          <div style={{ position: "relative", maxWidth: "min(600px,90vw)", maxHeight: "90vh" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={label}
              style={{ display: "block", maxWidth: "100%", maxHeight: "90vh", borderRadius: "0.9rem", objectFit: "contain" }}
            />
            <div style={{ position: "absolute", bottom: "0.6rem", left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.9)", borderRadius: 999, padding: "0.25rem 0.75rem", fontSize: "0.76rem", fontWeight: 700, color: "#07111f", whiteSpace: "nowrap" }}>
              {label} · нажмите чтобы закрыть
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LoginForm({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? "Ошибка авторизации.");
        return;
      }
      const token = data.token;
      if (!token) {
        setError("Сервер не вернул токен.");
        return;
      }
      sessionStorage.setItem(TOKEN_KEY, token);
      onLogin(token);
    } catch {
      setError("Не удалось подключиться к серверу.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)", fontFamily: "var(--font-sans)" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "min(360px, 90vw)",
          border: "1px solid rgba(11,20,37,0.1)",
          borderRadius: "1.5rem",
          padding: "2rem 1.75rem",
          background: "#fff",
          boxShadow: "0 24px 60px rgba(10,18,35,0.12)",
          color: "var(--ink)",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "-0.04em" }}>Панель администратора</h1>
        <p style={{ margin: 0, color: "rgba(11,20,37,0.55)", fontSize: "0.88rem" }}>Войдите, чтобы просматривать заявки.</p>

        <label style={labelStyle}>
          <span>Логин</span>
          <input
            type="text"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            style={inputStyle}
            required
          />
        </label>

        <label style={labelStyle}>
          <span>Пароль</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={inputStyle}
            required
          />
        </label>

        {error && <span style={{ color: "#c93f2d", fontSize: "0.82rem" }}>{error}</span>}

        <button
          type="submit"
          disabled={loading}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "0.75rem 1.2rem",
            background: "var(--ink)",
            color: "var(--paper-strong)",
            fontWeight: 700,
            fontSize: "0.94rem",
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "0.3rem",
  fontSize: "0.88rem",
  fontWeight: 600,
};

const inputStyle: React.CSSProperties = {
  border: "1px solid rgba(11,20,37,0.14)",
  borderRadius: "0.9rem",
  padding: "0.62rem 0.78rem",
  background: "rgba(255,255,255,0.7)",
  color: "var(--ink)",
  fontSize: "0.94rem",
  width: "100%",
};

function OrderCard({ order }: { order: Order }) {
  const [open, setOpen] = useState(false);

  const photos = [
    { path: order.buyerPassportMainPath, label: "Паспорт: главная" },
    { path: order.buyerPassportResidencePath, label: "Паспорт: прописка" },
    { path: order.buyerSelfiePath, label: "Фото лица" },
    { path: order.guarantor1PassportMainPath, label: "Поручитель 1: главная" },
    { path: order.guarantor1PassportResidencePath, label: "Поручитель 1: прописка" },
    { path: order.guarantor2PassportMainPath, label: "Поручитель 2: главная" },
    { path: order.guarantor2PassportResidencePath, label: "Поручитель 2: прописка" },
  ].filter((p) => p.path);

  return (
    <article style={{ border: "1px solid rgba(11,20,37,0.1)", borderRadius: "1rem", background: "#fff", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0.9rem 1.1rem", background: "none", border: 0, cursor: "pointer", textAlign: "left", gap: "1rem" }}
      >
        <div>
          <strong style={{ fontSize: "0.98rem" }}>{order.lastName} {order.firstName}</strong>
          <span style={{ display: "block", color: "rgba(11,20,37,0.52)", fontSize: "0.78rem", marginTop: "0.15rem" }}>{order.phone} · {formatDate(order.createdAt)}</span>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <strong style={{ fontSize: "0.92rem" }}>{formatMoney(order.monthlyPayment)}/мес.</strong>
          <span style={{ display: "block", color: "rgba(11,20,37,0.52)", fontSize: "0.76rem" }}>{order.period} мес., {order.guarantorsCount} пор.</span>
        </div>
        <span style={{ color: "rgba(11,20,37,0.4)", fontSize: "0.8rem" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 1.1rem 1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.55rem", fontSize: "0.82rem" }}>
            <MetaRow label="Стоимость товара" value={formatMoney(order.cost)} />
            <MetaRow label="Первый взнос" value={formatMoney(order.firstPayment)} />
            <MetaRow label="Срок" value={`${order.period} мес.`} />
            <MetaRow label="Платёж в месяц" value={formatMoney(order.monthlyPayment)} />
            <MetaRow label="Итоговая сумма" value={formatMoney(order.summaryPayment)} />
            <MetaRow label="Первый платёж" value={new Date(order.firstPaymentDate).toLocaleDateString("ru-RU")} />
          </div>

          {photos.length > 0 && (
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.82rem", fontWeight: 700, color: "rgba(11,20,37,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Документы</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "flex-start" }}>
                {photos.map((p) => (
                  <div key={p.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem" }}>
                    <PhotoThumb path={p.path} label={p.label} />
                    <span style={{ fontSize: "0.66rem", color: "rgba(11,20,37,0.45)", maxWidth: 52, textAlign: "center", lineHeight: 1.2 }}>{p.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.1rem" }}>
      <span style={{ color: "rgba(11,20,37,0.5)", fontSize: "0.72rem" }}>{label}</span>
      <strong style={{ fontSize: "0.88rem" }}>{value}</strong>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  // Try to restore token from sessionStorage on mount
  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const loadOrders = async (tok: string) => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders`, {
        headers: { "x-api-key": tok },
      });
      if (res.status === 401) {
        sessionStorage.removeItem(TOKEN_KEY);
        setToken(null);
        return;
      }
      const data = (await res.json()) as Order[];
      setOrders(data);
    } catch {
      setFetchError("Не удалось загрузить заявки.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) void loadOrders(token);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefresh = () => {
    if (!token) return;
    loadedRef.current = false;
    void loadOrders(token);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setOrders([]);
    loadedRef.current = false;
  };

  if (!token) {
    return <LoginForm onLogin={(tok) => setToken(tok)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", fontFamily: "var(--font-sans)", color: "var(--ink)" }}>
      {/* Header */}
      <header style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem", borderBottom: "1px solid rgba(11,20,37,0.1)", background: "rgba(245,236,223,0.94)", backdropFilter: "blur(12px)", gap: "1rem" }}>
        <strong style={{ fontSize: "1rem", letterSpacing: "-0.03em" }}>Murabaha · Заявки</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span style={{ color: "rgba(11,20,37,0.5)", fontSize: "0.82rem" }}>{orders.length} заявок</span>
          <button
            type="button"
            onClick={handleRefresh}
            style={{ border: "1px solid rgba(11,20,37,0.14)", borderRadius: 999, padding: "0.4rem 0.8rem", background: "none", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer" }}
          >
            Обновить
          </button>
          <button
            type="button"
            onClick={handleLogout}
            style={{ border: "1px solid rgba(11,20,37,0.14)", borderRadius: 999, padding: "0.4rem 0.8rem", background: "none", fontSize: "0.8rem", fontWeight: 700, cursor: "pointer", color: "#c93f2d" }}
          >
            Выйти
          </button>
        </div>
      </header>

      {/* Content */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "1.5rem 1rem" }}>
        {loading && (
          <p style={{ textAlign: "center", color: "rgba(11,20,37,0.5)", padding: "3rem 0" }}>Загрузка заявок...</p>
        )}

        {fetchError && (
          <p style={{ color: "#c93f2d", fontSize: "0.9rem", textAlign: "center" }}>{fetchError}</p>
        )}

        {!loading && !fetchError && orders.length === 0 && (
          <p style={{ textAlign: "center", color: "rgba(11,20,37,0.5)", padding: "3rem 0" }}>Заявок пока нет.</p>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} />
          ))}
        </div>
      </main>
    </div>
  );
}
