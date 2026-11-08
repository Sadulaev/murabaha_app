"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { buildPartnerLink } from "@/lib/partner";
import { CategoriesPanel } from "@/components/admin/CategoriesPanel";
const TOKEN_KEY = "murabaha_admin_token";

type AdminTab = "partners" | "categories";

type Partner = {
  id: string;
  name: string;
  createdAt: string;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
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
      const res = await fetch(apiUrl("/api/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { token?: string; error?: string };
      if (!res.ok) { setError(data.error ?? "Ошибка авторизации."); return; }
      const token = data.token;
      if (!token) { setError("Сервер не вернул токен."); return; }
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
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "min(360px, 90vw)", border: "1px solid rgba(11,20,37,0.1)", borderRadius: "1.5rem", padding: "2rem 1.75rem", background: "#fff", boxShadow: "0 24px 60px rgba(10,18,35,0.12)", color: "var(--ink)" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "-0.04em" }}>Панель администратора</h1>
        <p style={{ margin: 0, color: "rgba(11,20,37,0.55)", fontSize: "0.88rem" }}>Войдите, чтобы управлять партнёрами и условиями рассрочки.</p>
        <label style={labelStyle}><span>Логин</span><input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} required /></label>
        <label style={labelStyle}><span>Пароль</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required /></label>
        {error && <span style={{ color: "#c93f2d", fontSize: "0.82rem" }}>{error}</span>}
        <button type="submit" disabled={loading} style={{ border: 0, borderRadius: 999, padding: "0.75rem 1.2rem", background: "var(--ink)", color: "var(--paper-strong)", fontWeight: 700, fontSize: "0.94rem", cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Вход..." : "Войти"}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.88rem", fontWeight: 600 };
const inputStyle: React.CSSProperties = { border: "1px solid rgba(11,20,37,0.14)", borderRadius: "0.9rem", padding: "0.62rem 0.78rem", background: "rgba(255,255,255,0.7)", color: "var(--ink)", fontSize: "0.94rem", width: "100%" };

function PartnersPanel({ token, onUnauthorized }: { token: string; onUnauthorized: () => void }) {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const loadPartners = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/partners"), {
        headers: { "x-api-key": token },
      });
      if (res.status === 401) { onUnauthorized(); return; }
      const data = (await res.json()) as Partner[];
      setPartners(data);
    } catch {
      setError("Не удалось загрузить партнёров.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPartners();
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch(apiUrl("/api/admin/partners"), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": token },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = (await res.json()) as Partner | { error?: string };
      if (!res.ok) {
        setError((data as { error?: string }).error ?? "Не удалось создать партнёра.");
        return;
      }
      setPartners((prev) => [data as Partner, ...prev]);
      setName("");
    } catch {
      setError("Не удалось создать партнёра.");
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async (partnerId: string) => {
    const link = buildPartnerLink(partnerId);
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(partnerId);
      setTimeout(() => setCopiedId((current) => (current === partnerId ? null : current)), 2000);
    } catch {
      setError("Не удалось скопировать ссылку.");
    }
  };

  const handleDelete = async (partner: Partner) => {
    if (!confirm(`Удалить партнёра «${partner.name}» вместе с его категориями?`)) return;
    setDeletingId(partner.id);
    setError(null);
    try {
      const res = await fetch(apiUrl(`/api/admin/partners/${partner.id}`), {
        method: "DELETE",
        headers: { "x-api-key": token },
      });
      if (res.status === 401) { onUnauthorized(); return; }
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setError(data.error ?? "Не удалось удалить партнёра.");
        return;
      }
      setPartners((prev) => prev.filter((p) => p.id !== partner.id));
    } catch {
      setError("Не удалось удалить партнёра.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <form onSubmit={(e) => void handleCreate(e)} style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end", border: "1px solid rgba(11,20,37,0.1)", borderRadius: "1rem", background: "#fff", padding: "1rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: "1 1 220px" }}>
          <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "rgba(11,20,37,0.55)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Название партнёра</label>
          <input
            type="text"
            placeholder="Например, Магазин Ахмад"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            style={{ ...inputStyle, width: "100%", fontSize: "0.84rem", padding: "0.5rem 0.7rem" }}
            required
          />
        </div>
        <button type="submit" disabled={creating || !name.trim()} style={{ border: 0, borderRadius: 999, padding: "0.5rem 1rem", background: "var(--ink)", color: "var(--paper-strong)", fontWeight: 700, fontSize: "0.82rem", cursor: creating ? "wait" : "pointer" }}>
          {creating ? "Создаём..." : "Добавить"}
        </button>
      </form>

      {error && <p style={{ color: "#c93f2d", fontSize: "0.9rem", margin: 0 }}>{error}</p>}
      {loading && <p style={{ textAlign: "center", color: "rgba(11,20,37,0.5)", padding: "2rem 0" }}>Загрузка партнёров...</p>}
      {!loading && partners.length === 0 && (
        <p style={{ textAlign: "center", color: "rgba(11,20,37,0.5)", padding: "2rem 0" }}>Партнёров пока нет.</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
        {partners.map((partner) => {
          const link = buildPartnerLink(partner.id);
          return (
            <article key={partner.id} style={{ border: "1px solid rgba(11,20,37,0.1)", borderRadius: "1rem", background: "#fff", padding: "0.95rem 1.1rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", alignItems: "flex-start" }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ fontSize: "1rem" }}>{partner.name}</strong>
                  <span style={{ display: "block", color: "rgba(11,20,37,0.45)", fontSize: "0.76rem", marginTop: "0.15rem" }}>
                    Создан {formatDate(partner.createdAt)} · ID {partner.id}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                  <button type="button" onClick={() => void handleCopy(partner.id)} style={ghostBtnStyle}>
                    {copiedId === partner.id ? "Скопировано" : "Копировать ссылку"}
                  </button>
                  <button
                    type="button"
                    disabled={deletingId === partner.id}
                    onClick={() => void handleDelete(partner)}
                    style={{ ...ghostBtnStyle, color: "#c93f2d" }}
                  >
                    {deletingId === partner.id ? "Удаляем..." : "Удалить"}
                  </button>
                </div>
              </div>
              <code style={{ display: "block", fontSize: "0.74rem", color: "rgba(11,20,37,0.55)", background: "rgba(11,20,37,0.04)", borderRadius: "0.65rem", padding: "0.55rem 0.7rem", wordBreak: "break-all" }}>
                {link}
              </code>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null);
  const [tab, setTab] = useState<AdminTab>("partners");

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const handleUnauthorized = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  const handleLogout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    setToken(null);
  };

  if (!token) {
    return <LoginForm onLogin={(tok) => setToken(tok)} />;
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper)", fontFamily: "var(--font-sans)", color: "var(--ink)" }}>
      <header style={{ position: "sticky", top: 0, zIndex: 20, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.75rem 1.5rem", borderBottom: "1px solid rgba(11,20,37,0.1)", background: "rgba(245,236,223,0.94)", backdropFilter: "blur(12px)", gap: "1rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem", flexWrap: "wrap" }}>
          <strong style={{ fontSize: "1rem", letterSpacing: "-0.03em" }}>Murabaha · Админ</strong>
          <div style={{ display: "flex", gap: "0.3rem" }}>
            {([
              { id: "partners" as const, label: "Партнёры" },
              { id: "categories" as const, label: "Категории" },
            ]).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                style={{
                  border: 0,
                  borderRadius: 999,
                  padding: "0.35rem 0.8rem",
                  fontSize: "0.8rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  background: tab === item.id ? "var(--ink)" : "transparent",
                  color: tab === item.id ? "var(--paper-strong)" : "rgba(11,20,37,0.55)",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <button type="button" onClick={handleLogout} style={{ ...ghostBtnStyle, color: "#c93f2d" }}>Выйти</button>
        </div>
      </header>

      <main style={{ maxWidth: tab === "categories" ? 1120 : 860, margin: "0 auto", padding: "1rem 1rem 2rem" }}>
        {tab === "partners" && (
          <PartnersPanel token={token} onUnauthorized={handleUnauthorized} />
        )}

        {tab === "categories" && (
          <CategoriesPanel token={token} onUnauthorized={handleUnauthorized} />
        )}
      </main>
    </div>
  );
}

const ghostBtnStyle: React.CSSProperties = {
  border: "1px solid rgba(11,20,37,0.14)",
  borderRadius: 999,
  padding: "0.4rem 0.8rem",
  background: "none",
  fontSize: "0.8rem",
  fontWeight: 700,
  cursor: "pointer",
};
