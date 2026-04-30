"use client";

import { useEffect, useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
const TOKEN_KEY = "murabaha_admin_token";

type OrderStatus = "pending" | "in_progress" | "rejected";

type Order = {
  id: string;
  createdAt: string;
  status: OrderStatus;
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

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Р’ РѕР±СЂР°Р±РѕС‚РєРµ",
  in_progress: "РџСЂРёРЅСЏС‚Рѕ РІ СЂР°Р±РѕС‚Сѓ",
  rejected: "РћС‚РєР»РѕРЅРµРЅРѕ",
};

const STATUS_COLOR: Record<OrderStatus, React.CSSProperties> = {
  pending:     { background: "rgba(239,111,77,0.12)", color: "#bb4c2f" },
  in_progress: { background: "rgba(32,134,96,0.12)",  color: "#1f7255" },
  rejected:    { background: "rgba(201,63,45,0.1)",   color: "#c93f2d" },
};

function formatMoney(v: number) {
  return v.toLocaleString("ru-RU") + " в‚Ѕ";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function imageUrl(relativePath: string) {
  return `${API_URL}/${relativePath}`;
}

function PhotoThumb({ path, label }: { path: string | undefined; label: string }) {
  const [open, setOpen] = useState(false);
  if (!path) return <span style={{ color: "rgba(11,20,37,0.3)", fontSize: "0.76rem" }}>вЂ”</span>;
  const url = imageUrl(path);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ border: "1px solid rgba(11,20,37,0.12)", borderRadius: "0.5rem", padding: 0, background: "none", cursor: "pointer", overflow: "hidden", width: 52, height: 52, flexShrink: 0 }}
        title={label}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      </button>
      {open && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(7,17,31,0.82)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1.5rem" }}
          onClick={() => setOpen(false)}
        >
          <div style={{ position: "relative", maxWidth: "min(600px,90vw)", maxHeight: "90vh" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={label} style={{ display: "block", maxWidth: "100%", maxHeight: "90vh", borderRadius: "0.9rem", objectFit: "contain" }} />
            <div style={{ position: "absolute", bottom: "0.6rem", left: "50%", transform: "translateX(-50%)", background: "rgba(255,255,255,0.9)", borderRadius: 999, padding: "0.25rem 0.75rem", fontSize: "0.76rem", fontWeight: 700, color: "#07111f", whiteSpace: "nowrap" }}>
              {label} В· РЅР°Р¶РјРёС‚Рµ С‡С‚РѕР±С‹ Р·Р°РєСЂС‹С‚СЊ
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
      if (!res.ok) { setError(data.error ?? "РћС€РёР±РєР° Р°РІС‚РѕСЂРёР·Р°С†РёРё."); return; }
      const token = data.token;
      if (!token) { setError("РЎРµСЂРІРµСЂ РЅРµ РІРµСЂРЅСѓР» С‚РѕРєРµРЅ."); return; }
      sessionStorage.setItem(TOKEN_KEY, token);
      onLogin(token);
    } catch {
      setError("РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕРґРєР»СЋС‡РёС‚СЊСЃСЏ Рє СЃРµСЂРІРµСЂСѓ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--paper)", fontFamily: "var(--font-sans)" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "min(360px, 90vw)", border: "1px solid rgba(11,20,37,0.1)", borderRadius: "1.5rem", padding: "2rem 1.75rem", background: "#fff", boxShadow: "0 24px 60px rgba(10,18,35,0.12)", color: "var(--ink)" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", letterSpacing: "-0.04em" }}>РџР°РЅРµР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°</h1>
        <p style={{ margin: 0, color: "rgba(11,20,37,0.55)", fontSize: "0.88rem" }}>Р’РѕР№РґРёС‚Рµ, С‡С‚РѕР±С‹ РїСЂРѕСЃРјР°С‚СЂРёРІР°С‚СЊ Р·Р°СЏРІРєРё.</p>
        <label style={labelStyle}><span>Р›РѕРіРёРЅ</span><input type="text" autoComplete="username" value={username} onChange={(e) => setUsername(e.target.value)} style={inputStyle} required /></label>
        <label style={labelStyle}><span>РџР°СЂРѕР»СЊ</span><input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={inputStyle} required /></label>
        {error && <span style={{ color: "#c93f2d", fontSize: "0.82rem" }}>{error}</span>}
        <button type="submit" disabled={loading} style={{ border: 0, borderRadius: 999, padding: "0.75rem 1.2rem", background: "var(--ink)", color: "var(--paper-strong)", fontWeight: 700, fontSize: "0.94rem", cursor: loading ? "wait" : "pointer" }}>
          {loading ? "Р’С…РѕРґ..." : "Р’РѕР№С‚Рё"}
        </button>
      </form>
    </div>
  );
}

const labelStyle: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.3rem", fontSize: "0.88rem", fontWeight: 600 };
const inputStyle: React.CSSProperties = { border: "1px solid rgba(11,20,37,0.14)", borderRadius: "0.9rem", padding: "0.62rem 0.78rem", background: "rgba(255,255,255,0.7)", color: "var(--ink)", fontSize: "0.94rem", width: "100%" };

function StatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", borderRadius: 999, padding: "0.25rem 0.65rem", fontSize: "0.72rem", fontWeight: 700, letterSpacing: "0.02em", ...STATUS_COLOR[status] }}>
      {STATUS_LABEL[status]}
    </span>
  );
}

function OrderCard({ order, token, onUpdated }: { order: Order; token: string; onUpdated: (updated: Order) => void }) {
  const [open, setOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filesDeleted, setFilesDeleted] = useState(false);

  const hasFiles = !filesDeleted && [
    order.buyerPassportMainPath, order.buyerPassportResidencePath, order.buyerSelfiePath,
    order.guarantor1PassportMainPath, order.guarantor1PassportResidencePath,
    order.guarantor2PassportMainPath, order.guarantor2PassportResidencePath,
  ].some(Boolean);

  const photos = [
    { path: order.buyerPassportMainPath, label: "РџР°СЃРїРѕСЂС‚: РіР»Р°РІРЅР°СЏ" },
    { path: order.buyerPassportResidencePath, label: "РџР°СЃРїРѕСЂС‚: РїСЂРѕРїРёСЃРєР°" },
    { path: order.buyerSelfiePath, label: "Р¤РѕС‚Рѕ Р»РёС†Р°" },
    { path: order.guarantor1PassportMainPath, label: "РџРѕСЂСѓС‡РёС‚РµР»СЊ 1: РіР»Р°РІРЅР°СЏ" },
    { path: order.guarantor1PassportResidencePath, label: "РџРѕСЂСѓС‡РёС‚РµР»СЊ 1: РїСЂРѕРїРёСЃРєР°" },
    { path: order.guarantor2PassportMainPath, label: "РџРѕСЂСѓС‡РёС‚РµР»СЊ 2: РіР»Р°РІРЅР°СЏ" },
    { path: order.guarantor2PassportResidencePath, label: "РџРѕСЂСѓС‡РёС‚РµР»СЊ 2: РїСЂРѕРїРёСЃРєР°" },
  ].filter((p) => p.path && !filesDeleted);

  const handleStatusChange = async (newStatus: OrderStatus) => {
    if (newStatus === order.status) return;
    setStatusLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", "x-api-key": token },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = (await res.json()) as Order | { error?: string };
      if (!res.ok) { setActionError((data as { error?: string }).error ?? "РћС€РёР±РєР°."); return; }
      onUpdated(data as Order);
    } catch {
      setActionError("РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ СЃС‚Р°С‚СѓСЃ.");
    } finally {
      setStatusLoading(false);
    }
  };

  const handleDeleteFiles = async () => {
    if (!confirm("РЈРґР°Р»РёС‚СЊ РІСЃРµ РїСЂРёРєСЂРµРїР»С‘РЅРЅС‹Рµ С„Р°Р№Р»С‹ СЌС‚РѕР№ Р·Р°СЏРІРєРё? Р­С‚Рѕ РґРµР№СЃС‚РІРёРµ РЅРµР»СЊР·СЏ РѕС‚РјРµРЅРёС‚СЊ.")) return;
    setDeleteLoading(true);
    setActionError(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/orders/${order.id}/files`, {
        method: "DELETE",
        headers: { "x-api-key": token },
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        setActionError(data.error ?? "РћС€РёР±РєР° СѓРґР°Р»РµРЅРёСЏ С„Р°Р№Р»РѕРІ.");
        return;
      }
      setFilesDeleted(true);
    } catch {
      setActionError("РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ С„Р°Р№Р»С‹.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <article style={{ border: "1px solid rgba(11,20,37,0.1)", borderRadius: "1rem", background: "#fff", overflow: "hidden" }}>
      {/* Header row */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "0.9rem 1.1rem", background: "none", border: 0, cursor: "pointer", textAlign: "left", gap: "1rem" }}
      >
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
            <strong style={{ fontSize: "0.98rem" }}>{order.lastName} {order.firstName}</strong>
            <StatusBadge status={order.status} />
          </div>
          <span style={{ display: "block", color: "rgba(11,20,37,0.52)", fontSize: "0.78rem", marginTop: "0.15rem" }}>{order.phone} В· {formatDate(order.createdAt)}</span>
          <span style={{ display: "block", color: "rgba(11,20,37,0.35)", fontSize: "0.7rem", marginTop: "0.1rem", fontFamily: "monospace" }}>{order.id}</span>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <strong style={{ fontSize: "0.92rem" }}>{formatMoney(order.monthlyPayment)}/РјРµСЃ.</strong>
          <span style={{ display: "block", color: "rgba(11,20,37,0.52)", fontSize: "0.76rem" }}>{order.period} РјРµСЃ., {order.guarantorsCount} РїРѕСЂ.</span>
        </div>
        <span style={{ color: "rgba(11,20,37,0.4)", fontSize: "0.8rem", flexShrink: 0 }}>{open ? "в–І" : "в–ј"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 1.1rem 1.1rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          {/* Financial details */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.55rem", fontSize: "0.82rem" }}>
            <MetaRow label="РЎС‚РѕРёРјРѕСЃС‚СЊ С‚РѕРІР°СЂР°" value={formatMoney(order.cost)} />
            <MetaRow label="РџРµСЂРІС‹Р№ РІР·РЅРѕСЃ" value={formatMoney(order.firstPayment)} />
            <MetaRow label="РЎСЂРѕРє" value={`${order.period} РјРµСЃ.`} />
            <MetaRow label="РџР»Р°С‚С‘Р¶ РІ РјРµСЃСЏС†" value={formatMoney(order.monthlyPayment)} />
            <MetaRow label="РС‚РѕРіРѕРІР°СЏ СЃСѓРјРјР°" value={formatMoney(order.summaryPayment)} />
            <MetaRow label="РџРµСЂРІС‹Р№ РїР»Р°С‚С‘Р¶" value={new Date(order.firstPaymentDate).toLocaleDateString("ru-RU")} />
          </div>

          {/* Status controls */}
          <div>
            <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "rgba(11,20,37,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>РЎС‚Р°С‚СѓСЃ</p>
            <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
              {(["pending", "in_progress", "rejected"] as OrderStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={statusLoading || order.status === s}
                  onClick={() => void handleStatusChange(s)}
                  style={{
                    border: `1px solid ${order.status === s ? "transparent" : "rgba(11,20,37,0.14)"}`,
                    borderRadius: 999,
                    padding: "0.34rem 0.75rem",
                    fontSize: "0.78rem",
                    fontWeight: 700,
                    cursor: order.status === s ? "default" : "pointer",
                    ...(order.status === s ? STATUS_COLOR[s] : { background: "transparent", color: "rgba(11,20,37,0.55)" }),
                  }}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
              {statusLoading && <span style={{ fontSize: "0.78rem", color: "rgba(11,20,37,0.45)", alignSelf: "center" }}>РЎРѕС…СЂР°РЅРµРЅРёРµ...</span>}
            </div>
          </div>

          {/* Photos */}
          {photos.length > 0 && (
            <div>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.78rem", fontWeight: 700, color: "rgba(11,20,37,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Р”РѕРєСѓРјРµРЅС‚С‹</p>
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

          {/* Delete files */}
          {hasFiles && (
            <div>
              <button
                type="button"
                disabled={deleteLoading}
                onClick={() => void handleDeleteFiles()}
                style={{ border: "1px solid rgba(201,63,45,0.3)", borderRadius: 999, padding: "0.38rem 0.85rem", background: "rgba(201,63,45,0.06)", color: "#c93f2d", fontSize: "0.78rem", fontWeight: 700, cursor: deleteLoading ? "wait" : "pointer" }}
              >
                {deleteLoading ? "РЈРґР°Р»СЏРµРј..." : "РЈРґР°Р»РёС‚СЊ С„Р°Р№Р»С‹ Р·Р°СЏРІРєРё"}
              </button>
            </div>
          )}
          {filesDeleted && (
            <span style={{ fontSize: "0.78rem", color: "rgba(11,20,37,0.45)" }}>Р¤Р°Р№Р»С‹ СѓРґР°Р»РµРЅС‹.</span>
          )}

          {actionError && <span style={{ color: "#c93f2d", fontSize: "0.8rem" }}>{actionError}</span>}
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

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [searchInput, setSearchInput] = useState<string>("");

  const loadedRef = useRef(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(TOKEN_KEY);
    if (saved) setToken(saved);
  }, []);

  const loadOrders = async (tok: string, status?: string, search?: string) => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    setFetchError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      const qs = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`${API_URL}/api/admin/orders${qs}`, {
        headers: { "x-api-key": tok },
      });
      if (res.status === 401) { sessionStorage.removeItem(TOKEN_KEY); setToken(null); return; }
      const data = (await res.json()) as Order[];
      setOrders(data);
    } catch {
      setFetchError("РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ Р·Р°СЏРІРєРё.");
    } finally {
      setLoading(false);
    }
  };

  const reload = (status = filterStatus, search = filterSearch) => {
    if (!token) return;
    loadedRef.current = false;
    void loadOrders(token, status, search);
  };

  useEffect(() => {
    if (token) void loadOrders(token);
  }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilters = () => {
    setFilterSearch(searchInput);
    reload(filterStatus, searchInput);
  };

  const handleStatusFilter = (s: string) => {
    setFilterStatus(s);
    reload(s, filterSearch);
  };

  const handleReset = () => {
    setFilterStatus("");
    setFilterSearch("");
    setSearchInput("");
    reload("", "");
  };

  const handleOrderUpdated = (updated: Order) => {
    setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
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
        <strong style={{ fontSize: "1rem", letterSpacing: "-0.03em" }}>Murabaha В· Р—Р°СЏРІРєРё</strong>
        <div style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
          <span style={{ color: "rgba(11,20,37,0.5)", fontSize: "0.82rem" }}>{orders.length} Р·Р°СЏРІРѕРє</span>
          <button type="button" onClick={() => reload()} style={ghostBtnStyle}>РћР±РЅРѕРІРёС‚СЊ</button>
          <button type="button" onClick={handleLogout} style={{ ...ghostBtnStyle, color: "#c93f2d" }}>Р’С‹Р№С‚Рё</button>
        </div>
      </header>

      {/* Filters */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "1rem 1rem 0" }}>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          {/* Search input */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", flex: "1 1 200px" }}>
            <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "rgba(11,20,37,0.55)", textTransform: "uppercase", letterSpacing: "0.06em" }}>РџРѕРёСЃРє (ID / РРјСЏ / Р¤Р°РјРёР»РёСЏ)</label>
            <input
              type="text"
              placeholder="Р’РІРµРґРёС‚Рµ Р·Р°РїСЂРѕСЃ..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleApplyFilters()}
              style={{ ...inputStyle, width: "100%", fontSize: "0.84rem", padding: "0.5rem 0.7rem" }}
            />
          </div>

          {/* Status filter */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}>
            <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "rgba(11,20,37,0.55)", textTransform: "uppercase", letterSpacing: "0.06em" }}>РЎС‚Р°С‚СѓСЃ</label>
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              style={{ ...inputStyle, width: "auto", fontSize: "0.84rem", padding: "0.5rem 0.7rem", cursor: "pointer" }}
            >
              <option value="">Р’СЃРµ СЃС‚Р°С‚СѓСЃС‹</option>
              <option value="pending">Р’ РѕР±СЂР°Р±РѕС‚РєРµ</option>
              <option value="in_progress">РџСЂРёРЅСЏС‚Рѕ РІ СЂР°Р±РѕС‚Сѓ</option>
              <option value="rejected">РћС‚РєР»РѕРЅРµРЅРѕ</option>
            </select>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", gap: "0.4rem", alignSelf: "flex-end" }}>
            <button type="button" onClick={handleApplyFilters} style={{ border: 0, borderRadius: 999, padding: "0.5rem 1rem", background: "var(--ink)", color: "var(--paper-strong)", fontWeight: 700, fontSize: "0.82rem", cursor: "pointer" }}>
              РќР°Р№С‚Рё
            </button>
            {(filterStatus || filterSearch) && (
              <button type="button" onClick={handleReset} style={{ ...ghostBtnStyle, fontSize: "0.82rem" }}>
                РЎР±СЂРѕСЃРёС‚СЊ
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <main style={{ maxWidth: 860, margin: "0 auto", padding: "1rem 1rem 2rem" }}>
        {loading && <p style={{ textAlign: "center", color: "rgba(11,20,37,0.5)", padding: "3rem 0" }}>Р—Р°РіСЂСѓР·РєР° Р·Р°СЏРІРѕРє...</p>}
        {fetchError && <p style={{ color: "#c93f2d", fontSize: "0.9rem", textAlign: "center" }}>{fetchError}</p>}
        {!loading && !fetchError && orders.length === 0 && (
          <p style={{ textAlign: "center", color: "rgba(11,20,37,0.5)", padding: "3rem 0" }}>Р—Р°СЏРІРѕРє РЅРµ РЅР°Р№РґРµРЅРѕ.</p>
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {orders.map((order) => (
            <OrderCard key={order.id} order={order} token={token} onUpdated={handleOrderUpdated} />
          ))}
        </div>
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