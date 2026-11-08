import React, { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard, Users, Wrench, MessageSquare, Search, Ban,
  TrendingUp, X, UserX, Check, Eye, Lightbulb, AlertTriangle, HelpCircle,
  ThumbsUp, LogOut, ShieldCheck, Send, Inbox, MapPin, Clock,
  CalendarDays, MessageCircle, Phone,
} from "lucide-react";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { apiUrl, authHeaders } from "../services/api";

const TABS = { DASHBOARD: "dashboard", USERS: "users", MASTERS: "masters", FEEDBACK: "feedback", SUPPORT: "support" };

// Bosishda 3D -> 2D cho'kadigan tugma
function useRaise(theme) {
  const bind = {
    onMouseDown: (e) => { e.currentTarget.style.boxShadow = theme.pressSm.boxShadow; e.currentTarget.style.transform = "translateY(2px)"; },
    onMouseUp: (e) => { e.currentTarget.style.boxShadow = theme.raiseSm.boxShadow; e.currentTarget.style.transform = "translateY(0)"; },
    onMouseLeave: (e) => { e.currentTarget.style.boxShadow = theme.raiseSm.boxShadow; e.currentTarget.style.transform = "translateY(0)"; },
  };
  const style = { boxShadow: theme.raiseSm.boxShadow, transform: "translateY(0)", transition: "transform .12s ease, box-shadow .12s ease" };
  return { bind, style };
}

// Animatsiyalangan chiziqli grafik (Line Chart + area)
function LineChart({ data, color, theme, height = 160, delay = 0 }) {
  const [progress, setProgress] = useState(0);
  const pad = { l: 4, r: 4, t: 12, b: 22 };
  const list = Array.isArray(data) ? data : [];
  const width = Math.max(list.length * 34, 320);
  const h = height;
  const max = Math.max(1, ...list.map((d) => d.count));
  const innerW = width - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;
  if (list.length === 0) {
    return (
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "center",
        height: h, color: theme.textTertiary, fontSize: theme.font.xs,
      }}>
        {String.fromCharCode(8212)}
      </div>
    );
  }
  const pts = list.map((d, i) => ({
    x: pad.l + (list.length === 1 ? innerW / 2 : (i / (list.length - 1)) * innerW),
    y: pad.t + innerH - Math.round((d.count / max) * innerH),
    ...d,
  }));
  const linePath = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${h - pad.b} L ${pts[0].x.toFixed(1)} ${h - pad.b} Z`;
  const totalLen = pts.reduce((acc, p, i) => (i === 0 ? 0 : acc + Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y)), 0);
  const maxLen = totalLen * (1.25 + 0.35);

  useEffect(() => {
    let raf; const start = performance.now();
    const dur = 900 + delay;
    const tick = (now) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setProgress(eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [delay]);

  const reveal = Math.max(0, progress * maxLen - (maxLen - totalLen)) / totalLen;

  return (
    <svg width="100%" viewBox={`0 0 ${width} ${h}`} style={{ display: "block", maxHeight: h, overflow: "visible" }}>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad.l} x2={width - pad.r} y1={pad.t + innerH * (1 - f)} y2={pad.t + innerH * (1 - f)} stroke={theme.border} strokeDasharray="3 5" strokeWidth="1" opacity="0.7" />
      ))}
      <path d={areaPath} fill={color} fillOpacity="0.06" style={{ transition: "opacity .4s ease", opacity: reveal >= 1 ? 1 : 0 }} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"
        strokeDasharray={totalLen.toFixed(1)} strokeDashoffset={((1 - reveal) * totalLen).toFixed(1)} />
      {pts.map((p, i) => {
        const shown = reveal >= (i + 1) / pts.length;
        return (
          <g key={i} style={{ opacity: shown ? 1 : 0, transition: "opacity .15s ease" }}>
            <circle cx={p.x} cy={p.y} r="4" fill={theme.surface} stroke={color} strokeWidth="2.5" />
            <title>{p.label}: {p.count}</title>
          </g>
        );
      })}
      {pts.filter((_, i) => data.length <= 10 || i % Math.ceil(data.length / 10) === 0).map((p, i) => (
        <text key={`t${i}`} x={p.x} y={h - 5} fontSize="8" fill={theme.textTertiary} textAnchor="middle">{p.label}</text>
      ))}
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, sub, theme, accent }) {
  return (
    <div style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.lg, padding: "14px", boxShadow: theme.raiseMd.boxShadow, flex: "1 1 130px", minWidth: "120px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
        <div style={{ width: "30px", height: "30px", borderRadius: theme.radius.md, background: accent || theme.primary, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.raiseSm.boxShadow }}>
          <Icon size={16} color={theme.textInverse} />
        </div>
        <span style={{ fontSize: theme.font.xs, color: theme.textSecondary, fontWeight: theme.font.semibold }}>{label}</span>
      </div>
      <div style={{ fontSize: theme.font.xxl, fontWeight: theme.font.extrabold }}>{value}</div>
      {sub ? <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: "4px" }}>{sub}</div> : null}
    </div>
  );
}

export function AdminHome({ user, tab, setTab, onOpenSettings, onLogout, onSupport }) {
  const { theme, mode } = useTheme();
  const { t } = useTranslation();
  const raise = useRaise(theme);

  return (
    <div style={{
      display: "flex", flexDirection: "column", minHeight: "100vh",
      backgroundColor: "transparent", color: theme.text, fontFamily: theme.font.family,
    }}>
      {/* Header */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", backgroundColor: "transparent",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: theme.radius.md, background: theme.primary, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.raiseMd.boxShadow }}>
            <ShieldCheck size={22} color={theme.textInverse} />
          </div>
          <div>
            <h1 style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold, margin: 0 }}>{"Admin"}</h1>
            <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, display: "flex", alignItems: "center", gap: "4px" }}>
              <span style={{ display: "inline-flex" }}><ShieldCheck size={11} color={theme.primary} /></span>
              {user?.name || user?.phone}
            </div>
          </div>
        </div>
        <button onClick={onLogout} style={{ padding: "9px 14px", borderRadius: theme.radius.md, border: "none", backgroundColor: theme.errorLight, color: theme.error, fontWeight: theme.font.semibold, fontSize: theme.font.sm, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
          <LogOut size={14} /> {t("logout")}
        </button>
      </div>

      {/* Main */}
      {tab === TABS.DASHBOARD && <DashboardPanel theme={theme} mode={mode} />}
      {tab === TABS.USERS && <UsersPanel theme={theme} mode={mode} />}
      {tab === TABS.MASTERS && <MastersPanel theme={theme} mode={mode} />}
      {tab === TABS.FEEDBACK && <FeedbackPanel theme={theme} mode={mode} />}
      {tab === TABS.SUPPORT && <SupportPanel theme={theme} mode={mode} />}
    </div>
  );
}

function rangeOptions() {
  return [
    { key: "daily", label: "Kunlik" },
    { key: "monthly", label: "Oylik" },
    { key: "yearly", label: "Yillik" },
  ];
}

function useRaiseC(theme) {
  return useRaise(theme);
}

function DashboardPanel({ theme }) {
  const [range, setRange] = useState("daily");
  const { t } = useTranslation();
  const raise = useRaiseC(theme);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ["admin-dashboard", range],
    queryFn: async () => {
      const [o, s] = await Promise.all([
        fetch(apiUrl("/api/admin/overview"), { headers: authHeaders() }).then((x) => x.json()),
        fetch(apiUrl(`/api/admin/series?range=${range}`), { headers: authHeaders() }).then((x) => x.json()),
      ]);
      return { overview: o.data, series: s.data };
    },
  });

  const overview = dashboard?.overview;
  const series = dashboard?.series;

  if (isLoading && !overview) {
    return <div style={{ padding: "20px", textAlign: "center", color: theme.textTertiary }}>{"Loading..."}</div>;
  }

  const chart = (label, data, color) => (
    <div style={{ marginTop: "10px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", backgroundColor: color, boxShadow: theme.raiseSm.boxShadow }} />
        <span style={{ fontSize: theme.font.xs, color: theme.textSecondary, fontWeight: theme.font.semibold }}>{label}</span>
      </div>
      <LineChart data={data} color={color} theme={theme} height={130} />
    </div>
  );

  return (
    <div style={{ padding: "16px", paddingBottom: "90px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "16px" }}>
        <StatCard icon={Users} label={t("up_users")} value={overview?.totalUsers ?? 0} sub={`+${overview?.users?.month ?? 0} ${t("thisMonth").toLowerCase()}`} theme={theme} />
        <StatCard icon={Wrench} label={t("up_masters")} value={overview?.totalMasters ?? 0} sub={`+${overview?.masters?.month ?? 0} ${t("thisMonth").toLowerCase()}`} theme={theme} accent="#7C3AED" />
        <StatCard icon={TrendingUp} label={t("up_orders")} value={overview?.totalOrders ?? 0} sub={`+${overview?.orders?.month ?? 0} ${t("thisMonth").toLowerCase()}`} theme={theme} accent="#EA580C" />
        <StatCard icon={MessageSquare} label={t("up_chats")} value={overview?.totalChats ?? 0} theme={theme} accent="#0284C7" />
        <StatCard icon={Ban} label={t("banned")} value={overview?.bannedUsers ?? 0} sub={`${overview?.feedback?.pending ?? 0} ${t("up_feedbackPending").toLowerCase()}`} theme={theme} accent="#DC2626" />
      </div>

      <div style={{ backgroundColor: theme.surface, border: `1px solid ${theme.border}`, borderRadius: theme.radius.lg, padding: "16px", boxShadow: theme.raiseLg.boxShadow }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px", flexWrap: "wrap", gap: "8px" }}>
          <span style={{ fontSize: theme.font.base, fontWeight: theme.font.semibold }}>{t("up_stats")}</span>
          <div style={{ display: "flex", gap: "6px" }}>
            {rangeOptions().map((o) => (
              <button
                key={o.key}
                onClick={() => setRange(o.key)}
                style={{
                  padding: "6px 12px", borderRadius: theme.radius.md, cursor: "pointer",
                  border: `1px solid ${theme.border}`,
                  backgroundColor: range === o.key ? theme.primary : theme.bgSecondary,
                  color: range === o.key ? theme.textInverse : theme.textSecondary,
                  fontSize: theme.font.xs, fontWeight: theme.font.semibold,
                  boxShadow: range === o.key ? theme.raiseSm.boxShadow : theme.raiseSm.boxShadow,
                  ...raise.bind,
                }}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {series ? (
          <div>
            {chart(t("up_users"), series.users || [], theme.primary)}
            {chart(t("up_masters"), series.masters || [], "#7C3AED")}
            {chart(t("up_orders"), series.orders || [], "#EA580C")}
          </div>
        ) : (
          <div style={{ color: theme.textTertiary, fontSize: theme.font.sm, padding: "20px 0", textAlign: "center" }}>...</div>
        )}
      </div>
    </div>
  );
}

function Modal({ title, children, onClose, theme }) {
  return (
    <div style={{
      position: "fixed", inset: 0, backgroundColor: "rgba(2,6,23,0.6)", zIndex: 999,
      display: "flex", alignItems: "center", justifyContent: "center", padding: "16px",
    }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: "460px", maxHeight: "calc(100vh - 110px)", overflowY: "auto",
          backgroundColor: theme.surface, borderRadius: theme.radius.xl, padding: "clamp(14px, 3vw, 20px)",
          border: `1px solid ${theme.border}`,
          boxShadow: theme.raiseXl.boxShadow,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
          <span style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: theme.textTertiary }}>
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function UsersPanel({ theme }) {
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  const [banUser, setBanUser] = useState(null);
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { t } = useTranslation();
  const raise = useRaiseC(theme);

  const load = useCallback(async (query, p = 1, append = false) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/users?page=${p}&limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setList((prev) => (append ? [...(prev || []), ...data.data] : data.data));
        setPage(p);
        setHasMore(!!(data.pagination && data.pagination.page < data.pagination.pages));
      }
    } catch {}
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(q, page + 1, true);
    setLoadingMore(false);
  };

  useEffect(() => {
    const id = setTimeout(() => load(q), 300);
    return () => clearTimeout(id);
  }, [q, load]);

  const doBan = async (id, banned) => {
    setBanUser(null);
    try {
      await fetch(apiUrl(`/api/admin/users/${id}/ban`), {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ banned }),
      });
      load(q);
    } catch {}
  };

  return (
    <div style={{ padding: "16px", paddingBottom: "90px" }}>
      <SearchBox q={q} setQ={setQ} theme={theme} placeholder={t("up_search")} />
      <List>
        {(list || []).map((u) => (
          <Row key={u.id} theme={theme}>
            <Avatar ch={(u.name || u.phone || "?").charAt(0)} photo={u.photo} banned={u.banned} theme={theme} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: theme.font.semibold, fontSize: theme.font.base, display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                {u.name || u.phone}
                {u.role === "admin" && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: theme.radius.full, backgroundColor: theme.primaryLight, color: theme.primary, fontWeight: theme.font.bold }}>{"ADMIN"}</span>}
                {u.role === "master" && <span style={{ fontSize: "10px", padding: "2px 7px", borderRadius: theme.radius.full, backgroundColor: "#F4E8FF", color: "#7C3AED", fontWeight: theme.font.bold }}>{"USTA"}</span>}
              </div>
              <div style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>
                {u.phone} • {t("up_orders")}: {u.orders || 0}
              </div>
              {u.banned && <div style={{ fontSize: theme.font.xs, color: theme.error, marginTop: "2px", display: "flex", alignItems: "center", gap: "3px" }}><Ban size={11} /> {u.bannedReason || "Bloklangan"}</div>}
            </div>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", minWidth: 0, flexShrink: 1 }}>
              <IconBtn icon={Eye} hint={t("up_profile")} theme={theme} onClick={() => setView(u)} />
              <button title={t("up_message")} aria-label={t("up_message")} onClick={() => setMsg({ peerType: "user", peerId: u.id, name: u.name || u.phone })}
                style={{ height: "32px", flexShrink: 0, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px", padding: "0 12px", borderRadius: theme.radius.full, border: "none", backgroundColor: theme.primary, color: theme.textInverse, fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
                <MessageSquare size={13} /> {t("up_write")}
              </button>
              {u.role !== "admin" && (
                <button onClick={() => setBanUser(u)} style={{ padding: "7px 10px", borderRadius: theme.radius.md, cursor: "pointer", border: `1px solid ${theme.border}`, backgroundColor: u.banned ? theme.bgSecondary : theme.errorLight, color: u.banned ? theme.textSecondary : theme.error, fontSize: theme.font.xs, fontWeight: theme.font.semibold, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
                  <Ban size={12} /> {u.banned ? t("up_unban") : t("banned")}
                </button>
              )}
            </div>
          </Row>
        ))}
        {list && list.length === 0 && <Empty theme={theme} />}
      </List>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{ width: "100%", marginTop: "14px", padding: "12px", borderRadius: theme.radius.md, cursor: loadingMore ? "default" : "pointer", border: `1.5px solid ${theme.border}`, backgroundColor: theme.surface, color: theme.primary, fontSize: theme.font.sm, fontWeight: theme.font.bold, boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}
        >
          {loadingMore ? "..." : t("loadMore")}
        </button>
      )}

      {banUser && (
        <Modal title={banUser.banned ? t("up_unban") : t("banned")} onClose={() => setBanUser(null)} theme={theme}>
          <div style={{ fontSize: theme.font.base, marginBottom: "16px", color: theme.textSecondary }}>
            {banUser.banned ? t("up_unbanConfirm").replace("{name}", banUser.name || banUser.phone) : t("up_banConfirm").replace("{name}", banUser.name || banUser.phone)}
          </div>
          {!banUser.banned && (
            <div style={{ marginBottom: "16px" }}>
              <input
                name="banUserReason"
                placeholder={t("up_banReason")}
                onChange={(e) => setBanUser((p) => ({ ...p, reason: e.target.value }))}
                style={{
                  width: "100%", boxSizing: "border-box", padding: "11px 12px",
                  borderRadius: theme.radius.md, border: "none", outline: "none",
                  backgroundColor: theme.bgSecondary, color: theme.text,
                  fontSize: theme.font.base, boxShadow: `inset 0 2px 4px rgba(15,23,42,0.08)`,
                }}
              />
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setBanUser(null)} style={{ padding: "10px 16px", borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, backgroundColor: theme.bgSecondary, color: theme.text, cursor: "pointer", fontWeight: theme.font.semibold, boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
              {t("cancel")}
            </button>
            <button onClick={() => doBan(banUser.id, !banUser.banned)} style={{ padding: "10px 16px", borderRadius: theme.radius.md, border: "none", backgroundColor: banUser.banned ? theme.primary : theme.error, color: theme.textInverse, cursor: "pointer", fontWeight: theme.font.bold, display: "flex", alignItems: "center", gap: "6px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
              <UserX size={14} /> {banUser.banned ? t("up_unban") : t("banned")}
            </button>
          </div>
        </Modal>
      )}

      {view && <ProfileModal data={view} peerType="user" theme={theme} onClose={() => setView(null)} />}
      {msg && <MessageModal target={msg} theme={theme} onClose={() => setMsg(null)} />}
    </div>
  );
}

function MastersPanel({ theme }) {
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  const [banM, setBanM] = useState(null);
  const [view, setView] = useState(null);
  const [msg, setMsg] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const { t } = useTranslation();
  const raise = useRaiseC(theme);

  const load = useCallback(async (query, p = 1, append = false) => {
    try {
      const res = await fetch(apiUrl(`/api/admin/masters?page=${p}&limit=50${query ? `&q=${encodeURIComponent(query)}` : ""}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setList((prev) => (append ? [...(prev || []), ...data.data] : data.data));
        setPage(p);
        setHasMore(!!(data.pagination && data.pagination.page < data.pagination.pages));
      }
    } catch {}
  }, []);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(q, page + 1, true);
    setLoadingMore(false);
  };

  useEffect(() => {
    const id = setTimeout(() => load(q), 300);
    return () => clearTimeout(id);
  }, [q, load]);

  const doBan = async (id, banned) => {
    setBanM(null);
    try {
      await fetch(apiUrl(`/api/admin/masters/${id}/ban`), {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ banned }),
      });
      load(q);
    } catch {}
  };

  return (
    <div style={{ padding: "16px", paddingBottom: "90px" }}>
      <SearchBox q={q} setQ={setQ} theme={theme} placeholder={t("up_search")} />
      <List>
        {(list || []).map((m) => {
          const banned = m.owner?.banned;
          return (
            <Row key={m.id} theme={theme}>
              <Avatar ch={m.name.charAt(0)} photo={m.photo} banned={banned} theme={theme} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: theme.font.semibold, fontSize: theme.font.base }}>{m.name}</div>
                <div style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>
                  {m.phone} • {t("up_orders")}: {m.orders || 0} •{" "}
                  <span style={{ color: "#059669" }}>★</span> {Number(m.rating || 0).toFixed(1)}
                </div>
                {banned && <div style={{ fontSize: theme.font.xs, color: theme.error, marginTop: "2px", display: "flex", alignItems: "center", gap: "3px" }}><Ban size={11} /> {m.owner?.bannedReason || "Bloklangan"}</div>}
              </div>
              <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end", minWidth: 0, flexShrink: 1 }}>
                <IconBtn icon={Eye} hint={t("up_profile")} theme={theme} onClick={() => setView(m)} />
                <button title={t("up_message")} aria-label={t("up_message")} onClick={() => setMsg({ peerType: "master", peerId: m.id, name: m.name })}
                  style={{ height: "32px", flexShrink: 0, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px", padding: "0 12px", borderRadius: theme.radius.full, border: "none", backgroundColor: theme.primary, color: theme.textInverse, fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
                  <MessageSquare size={13} /> {t("up_write")}
                </button>
                <button onClick={() => setBanM(m)} style={{ padding: "7px 10px", borderRadius: theme.radius.md, cursor: "pointer", border: `1px solid ${theme.border}`, backgroundColor: banned ? theme.bgSecondary : theme.errorLight, color: banned ? theme.textSecondary : theme.error, fontSize: theme.font.xs, fontWeight: theme.font.semibold, whiteSpace: "nowrap", display: "flex", alignItems: "center", gap: "5px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
                  <Ban size={12} /> {banned ? t("up_unban") : t("banned")}
                </button>
              </div>
            </Row>
          );
        })}
        {list && list.length === 0 && <Empty theme={theme} />}
      </List>

      {hasMore && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          style={{ width: "100%", marginTop: "14px", padding: "12px", borderRadius: theme.radius.md, cursor: loadingMore ? "default" : "pointer", border: `1.5px solid ${theme.border}`, backgroundColor: theme.surface, color: theme.primary, fontSize: theme.font.sm, fontWeight: theme.font.bold, boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}
        >
          {loadingMore ? "..." : t("loadMore")}
        </button>
      )}

      {banM && (
        <Modal title={banM.owner?.banned ? t("up_unban") : t("banned")} onClose={() => setBanM(null)} theme={theme}>
          <div style={{ fontSize: theme.font.base, marginBottom: "16px", color: theme.textSecondary }}>
            {banM.owner?.banned ? t("up_unbanConfirm").replace("{name}", banM.name) : t("up_banConfirm").replace("{name}", banM.name)}
          </div>
          {!banM.owner?.banned && (
            <div style={{ marginBottom: "16px" }}>
              <input
                name="banMasterReason"
                placeholder={t("up_banReason")}
                onChange={(e) => setBanM((p) => ({ ...p, reason: e.target.value }))}
                style={{ width: "100%", boxSizing: "border-box", padding: "11px 12px", borderRadius: theme.radius.md, border: "none", outline: "none", backgroundColor: theme.bgSecondary, color: theme.text, fontSize: theme.font.base, boxShadow: `inset 0 2px 4px rgba(15,23,42,0.08)` }}
              />
            </div>
          )}
          <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
            <button onClick={() => setBanM(null)} style={{ padding: "10px 16px", borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, backgroundColor: theme.bgSecondary, color: theme.text, cursor: "pointer", fontWeight: theme.font.semibold, boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
              {t("cancel")}
            </button>
            <button onClick={() => doBan(banM.id, !banM.owner?.banned)} style={{ padding: "10px 16px", borderRadius: theme.radius.md, border: "none", backgroundColor: banM.owner?.banned ? theme.primary : theme.error, color: theme.textInverse, cursor: "pointer", fontWeight: theme.font.bold, display: "flex", alignItems: "center", gap: "6px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
              <UserX size={14} /> {banM.owner?.banned ? t("up_unban") : t("banned")}
            </button>
          </div>
        </Modal>
      )}

      {view && <ProfileModal data={view} peerType="master" theme={theme} onClose={() => setView(null)} />}
      {msg && <MessageModal target={msg} theme={theme} onClose={() => setMsg(null)} />}
    </div>
  );
}

const FEEDBACK_ICONS = { suggestion: Lightbulb, complaint: AlertTriangle, question: HelpCircle, praise: ThumbsUp };

function FeedbackPanel({ theme }) {
  const [list, setList] = useState(null);
  const [answerFor, setAnswerFor] = useState(null);
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const { t } = useTranslation();
  const raise = useRaiseC(theme);

  const load = useCallback(async (p = 1, append = false) => {
    try {
      const res = await fetch(apiUrl(`/api/feedback/admin/all?page=${p}&limit=50`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setList((prev) => (append ? [...(prev || []), ...data.data] : data.data));
        setPage(p);
        setHasMore(!!(data.pagination && data.pagination.page < data.pagination.pages));
      }
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status, adminNote) => {
    try {
      await fetch(apiUrl(`/api/feedback/admin/${id}`), {
        method: "PATCH", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status, adminNote }),
      });
      load();
    } catch {}
  };

  const openAnswer = (f) => {
    setNote(f.adminNote || "");
    setAnswerFor(f);
  };

  const saveAnswer = async () => {
    if (!answerFor) return;
    await updateStatus(answerFor.id, "answered", note.trim());
    setAnswerFor(null);
    setNote("");
  };

  return (
    <div style={{ padding: "16px", paddingBottom: "90px" }}>
      <List>
        {(list || []).map((f, i) => {
          const TypeIcon = FEEDBACK_ICONS[f.type] || MessageSquare;
          const RoleIcon = f.role === "master" ? Wrench : Users;
          return (
            <Row key={f.id} theme={theme}>
              <div style={{ flexDirection: "column", display: "flex", alignItems: "center", gap: "6px", width: "34px" }}>
                <TypeIcon size={20} color={theme.primary} />
                <RoleIcon size={13} color={theme.textTertiary} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px", flexWrap: "wrap" }}>
                  <span style={{ fontSize: theme.font.sm, fontWeight: theme.font.bold }}>{t(`fb_type_${f.type}`)}</span>
                  <span style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>
                    {f.name || f.phone} {f.contact ? `• ${f.contact}` : ""} • {new Date(f.createdAt).toLocaleString()}
                  </span>
                  <StatusChip status={f.status} theme={theme} />
                </div>
                <div style={{ fontSize: theme.font.base, marginBottom: "8px" }}>{f.text}</div>
                {f.adminNote && (
                  <div style={{ fontSize: theme.font.xs, color: theme.info, backgroundColor: theme.infoLight, borderRadius: theme.radius.md, padding: "6px 10px", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <ShieldCheck size={11} /> {f.adminNote}
                  </div>
                )}
                <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                  {f.status !== "answered" && (
                    <button onClick={() => openAnswer(f)} style={{ padding: "6px 12px", borderRadius: theme.radius.md, border: "none", backgroundColor: theme.primary, color: theme.textInverse, fontSize: theme.font.xs, fontWeight: theme.font.semibold, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
                      <MessageSquare size={12} /> {t("admin_answerBtn")}
                    </button>
                  )}
                  {f.status !== "viewed" && (
                    <button onClick={() => updateStatus(f.id, "viewed")} style={{ padding: "6px 12px", borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, backgroundColor: theme.bgSecondary, color: theme.textSecondary, fontSize: theme.font.xs, fontWeight: theme.font.semibold, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
                      <Eye size={12} /> {t("fb_viewed")}
                    </button>
                  )}
                  {f.status === "answered" && (
                    <button onClick={() => openAnswer(f)} style={{ padding: "6px 12px", borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, backgroundColor: theme.bgSecondary, color: theme.success, fontSize: theme.font.xs, fontWeight: theme.font.semibold, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
                      <Check size={12} /> {t("admin_answerEdit")}
                    </button>
                  )}
                </div>
              </div>
            </Row>
          );
        })}
        {list && list.length === 0 && <Empty theme={theme} />}
      </List>

      {hasMore && (
        <button
          onClick={() => load(page + 1, true)}
          style={{ width: "100%", marginTop: "14px", padding: "12px", borderRadius: theme.radius.md, cursor: "pointer", border: `1.5px solid ${theme.border}`, backgroundColor: theme.surface, color: theme.primary, fontSize: theme.font.sm, fontWeight: theme.font.bold, boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}
        >
          {t("loadMore")}
        </button>
      )}

      {answerFor && (
        <Modal title={t("admin_answerTitle")} onClose={() => setAnswerFor(null)} theme={theme}>
          <div style={{ fontSize: theme.font.sm, color: theme.textSecondary, marginBottom: "10px", padding: "10px", backgroundColor: theme.bgSecondary, borderRadius: theme.radius.md, borderLeft: `3px solid ${theme.primary}` }}>
            <span style={{ fontWeight: theme.font.bold }}>({answerFor.name || answerFor.phone})</span> {answerFor.text}
          </div>
          <textarea
            name="adminAnswer"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t("admin_answerPlaceholder")}
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: theme.radius.md, padding: "10px", color: theme.text, outline: "none", fontSize: theme.font.base, fontFamily: theme.font.family, marginBottom: "10px" }}
          />
          <button onClick={saveAnswer} style={{ width: "100%", padding: "12px", borderRadius: theme.radius.md, border: "none", backgroundColor: theme.primary, color: theme.textInverse, fontSize: theme.font.base, fontWeight: theme.font.bold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: theme.raiseMd.boxShadow, ...raise.bind }}>
            <Check size={16} /> {t("admin_answerSave")}
          </button>
        </Modal>
      )}
    </div>
  );
}

function SearchBox({ q, setQ, theme, placeholder }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "8px",
      backgroundColor: theme.surface, border: `1px solid ${theme.border}`, outline: "none",
      borderRadius: theme.radius.md, padding: "10px 12px", marginBottom: "12px",
      boxShadow: theme.raiseMd.boxShadow,
    }}>
      <Search size={16} color={theme.textTertiary} />
      <input
        name="adminSearch"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={placeholder}
        style={{ flex: 1, border: "none", outline: "none", background: "transparent", color: theme.text, fontSize: theme.font.base }}
      />
    </div>
  );
}

function List({ children }) {
  return <div>{children}</div>;
}

function Row({ children, theme }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "12px",
      backgroundColor: theme.surface, border: `1px solid ${theme.border}`,
      borderRadius: theme.radius.lg, padding: "12px", marginBottom: "10px", boxShadow: theme.raiseMd.boxShadow,
    }}>
      {children}
    </div>
  );
}

function Avatar({ ch, photo, banned, theme }) {
  if (photo) {
    return <img src={photo} alt="" style={{ width: "42px", height: "42px", borderRadius: "50%", objectFit: "cover", opacity: banned ? 0.4 : 1 }} />;
  }
  return (
    <div style={{
      width: "42px", height: "42px", borderRadius: "50%",
      backgroundColor: theme.primaryLight, color: theme.primary,
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: theme.font.lg, fontWeight: theme.font.bold, opacity: banned ? 0.4 : 1,
    }}>
      {ch}
    </div>
  );
}

function StatusChip({ status, theme }) {
  const map = {
    new: { label: "YANGI", color: theme.warning, bg: theme.warningLight },
    viewed: { label: "KO'RILDI", color: theme.info, bg: theme.infoLight },
    answered: { label: "JAVOB BERILDI", color: theme.success, bg: theme.successLight },
  };
  const s = map[status] || map.viewed;
  return (
    <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: theme.radius.full, backgroundColor: s.bg, color: s.color, fontWeight: theme.font.bold }}>
      {s.label}
    </span>
  );
}

function Empty({ theme }) {
  return <div style={{ textAlign: "center", color: theme.textTertiary, padding: "40px 0", fontSize: theme.font.sm }}>{"Bo'sh"}</div>;
}

// --- Admin profil / xabar / support (murojaat) komponentlari ---

function IconBtn({ icon: Icon, hint, theme, onClick }) {
  const raise = useRaiseC(theme);
  return (
    <button title={hint} aria-label={hint} onClick={onClick} style={{
      width: "36px", height: "36px", borderRadius: "50%", flexShrink: 0, cursor: "pointer",
      border: "none", backgroundColor: theme.bgSecondary, color: theme.textSecondary,
      display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.raiseSm.boxShadow,
      transition: theme.transition.fast, ...raise.bind,
    }}>
      <Icon size={15} />
    </button>
  );
}

function InfoRow({ icon: Icon, label, value, theme }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 0", borderBottom: `1px solid ${theme.borderLight}` }}>
      <Icon size={14} color={theme.textTertiary} style={{ flexShrink: 0 }} />
      <span style={{ fontSize: theme.font.xs, color: theme.textTertiary, width: "90px", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: theme.font.sm, fontWeight: theme.font.semibold, color: theme.text, wordBreak: "break-word", flex: 1 }}>{value || "—"}</span>
    </div>
  );
}

function ProfileModal({ data, peerType, theme, onClose }) {
  const { t } = useTranslation();
  const isMaster = peerType === "master";
  const fmt = (v) => (v ? new Date(v).toLocaleDateString() : "—");
  return (
    <Modal title={isMaster ? t("up_masterProfile") : t("up_profile")} onClose={onClose} theme={theme}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
        <div style={{
          width: "52px", height: "52px", borderRadius: "50%", background: theme.primary,
          color: theme.textInverse, fontSize: "20px", fontWeight: "800", display: "flex", alignItems: "center", justifyContent: "center",
          textTransform: "uppercase", flexShrink: 0, boxShadow: theme.raiseMd.boxShadow,
        }}>
          {(data.name || data.phone || "?").charAt(0)}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: theme.font.base, fontWeight: theme.font.extrabold, wordBreak: "break-word" }}>{data.name || data.phone || "Noma'lum"}</div>
          <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, display: "flex", alignItems: "center", gap: "4px" }}>
            <Phone size={11} /> {data.phone || "—"}
          </div>
        </div>
      </div>

      <InfoRow icon={CalendarDays} label={t("up_registered")} value={fmt(data.createdAt)} theme={theme} />
      <InfoRow icon={ShieldCheck} label={t("up_role")} value={data.role || "—"} theme={theme} />
      <InfoRow icon={MessageSquare} label={t("up_orders")} value={String(data.orders || 0)} theme={theme} />
      {isMaster ? (
        <>
          <InfoRow icon={Wrench} label={t("up_price")} value={data.price ? `${data.price} ${(data.currency || "uzs").toUpperCase()}` : "0"} theme={theme} />
          <InfoRow icon={ShieldCheck} label={t("up_rating")} value={`★ ${Number(data.rating || 0).toFixed(1)} (${data.reviewsCount || 0})`} theme={theme} />
          <InfoRow icon={Clock} label={t("up_exp")} value={data.experience} theme={theme} />
          <InfoRow icon={Clock} label={t("up_hours")} value={data.workingHours} theme={theme} />
          <InfoRow icon={Wrench} label={t("up_devices")} value={(data.devices || []).join(", ")} theme={theme} />
          <InfoRow icon={MapPin} label={t("up_address")} value={(data.location && data.location.address) || "—"} theme={theme} />
        </>
      ) : (
        data.master ? (
          <>
            <InfoRow icon={Wrench} label={t("up_masters")} value={data.master.name || "—"} theme={theme} />
            <InfoRow icon={ShieldCheck} label={t("up_price")} value={data.master.price ? `${data.master.price} uZS` : "0"} theme={theme} />
            <InfoRow icon={ShieldCheck} label={t("up_rating")} value={`★ ${Number(data.master.rating || 0).toFixed(1)}`} theme={theme} />
          </>
        ) : null
      )}
      {data.banned && (
        <InfoRow icon={Ban} label={t("banned")} value={data.bannedReason || "—"} theme={theme} />
      )}
    </Modal>
  );
}

function MessageModal({ target, theme, onClose }) {
  const { t } = useTranslation();
  const raise = useRaiseC(theme);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const send = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl("/api/admin/support/send"), {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ peerType: target.peerType, peerId: target.peerId, text: v }),
      });
      const data = await res.json();
      if (res.ok && data.success) { setSent(true); setText(""); }
      else alert(data.message || "Xatolik yuz berdi");
    } catch {
      alert("Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title={t("up_message")} onClose={onClose} theme={theme}>
      {sent ? (
        <div style={{ textAlign: "center", padding: "12px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div style={{ width: "48px", height: "48px", borderRadius: "50%", backgroundColor: theme.successLight, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Check size={26} color={theme.success} />
          </div>
          <div style={{ fontSize: theme.font.base, fontWeight: theme.font.bold }}>{t("up_messageSent")}</div>
          <div style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>{t("up_messageSentHint")}</div>
          <button onClick={onClose} style={{ marginTop: "6px", padding: "10px 18px", borderRadius: theme.radius.full, border: "none", background: theme.primary, color: theme.textInverse, fontSize: theme.font.sm, fontWeight: theme.font.bold, cursor: "pointer", boxShadow: theme.raiseSm.boxShadow, ...raise.bind }}>
            OK
          </button>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: theme.font.sm, color: theme.textSecondary, marginBottom: "10px", padding: "10px 12px", backgroundColor: theme.bgSecondary, borderRadius: theme.radius.md, borderLeft: `3px solid ${theme.primary}` }}>
            <span style={{ fontWeight: theme.font.bold }}>{t("up_messageTo")}: {target.name}</span>
          </div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("up_messagePlaceholder")}
            rows={4}
            style={{ width: "100%", boxSizing: "border-box", resize: "vertical", backgroundColor: theme.bgSecondary, border: `1px solid ${theme.border}`, borderRadius: theme.radius.md, padding: "10px", color: theme.text, outline: "none", fontSize: theme.font.base, fontFamily: theme.font.family, marginBottom: "10px" }}
          />
          <button onClick={send} disabled={busy} style={{ width: "100%", padding: "12px", borderRadius: theme.radius.full, border: "none", background: theme.primary, color: theme.textInverse, fontSize: theme.font.base, fontWeight: theme.font.bold, cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", boxShadow: theme.raiseMd.boxShadow, ...raise.bind }}>
            <Send size={16} /> {busy ? "..." : t("up_send")}
          </button>
        </div>
      )}
    </Modal>
  );
}

function SupportPanel({ theme }) {
  const [threads, setThreads] = useState(null);
  const [open, setOpen] = useState(null);
  const { t } = useTranslation();
  const raise = useRaiseC(theme);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl("/api/admin/support/inbox"), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) setThreads(data.data);
    } catch {}
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div style={{ padding: "16px", paddingBottom: "90px" }}>
      <div style={{
        display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", flexWrap: "wrap",
        padding: "12px 14px", borderRadius: theme.radius.lg, background: theme.primary,
        color: theme.textInverse, boxShadow: theme.raiseMd.boxShadow,
      }}>
        <Inbox size={18} />
        <span style={{ fontSize: theme.font.base, fontWeight: theme.font.bold }}>{t("up_supportTitle")}</span>
        <span style={{ marginLeft: "auto", fontSize: theme.font.xs, opacity: 0.9 }}>{threads ? `${threads.length}` : "..."}</span>
      </div>
      <List>
        {(threads || []).map((th) => (
          <Row key={th.id} theme={theme}>
            <Avatar ch={(th.peer && th.peer.avatarCh) || "?"} photo={th.peer && th.peer.photo} banned={false} theme={theme} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: theme.font.semibold, fontSize: theme.font.base }}>{th.peer ? th.peer.name : "?"}</span>
                <span style={{
                  fontSize: "10px", padding: "2px 7px", borderRadius: theme.radius.full,
                  backgroundColor: th.peerType === "master" ? "#F4E8FF" : theme.primaryLight,
                  color: th.peerType === "master" ? "#7C3AED" : theme.primary, fontWeight: theme.font.bold,
                }}>{th.peerType === "master" ? "USTA" : "USER"}</span>
              </div>
              <div style={{ fontSize: theme.font.xs, color: theme.textTertiary, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{th.lastMessage || "..."}</div>
            </div>
            <button onClick={() => setOpen(th)} style={{ flexShrink: 0, padding: "7px 12px", borderRadius: theme.radius.full, border: "none", background: theme.primary, color: theme.textInverse, fontSize: theme.font.xs, fontWeight: theme.font.bold, cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", boxShadow: theme.raiseSm.boxShadow, ...raise.bind, whiteSpace: "nowrap" }}>
              <MessageCircle size={13} /> {t("up_open")}
            </button>
          </Row>
        ))}
        {threads && threads.length === 0 && <Empty theme={theme} />}
      </List>
      {open && <ThreadModal thread={open} theme={theme} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

function ThreadModal({ thread, theme, onClose }) {
  const { t } = useTranslation();
  const raise = useRaiseC(theme);
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(apiUrl(`/api/admin/support/${thread.id}/messages`), { headers: authHeaders() });
      const d = await res.json();
      if (res.ok && d.success) setData(d.data);
    } catch {}
  }, [thread.id]);
  useEffect(() => { load(); }, [load]);

  const send = async () => {
    const v = text.trim();
    if (!v || busy) return;
    setBusy(true);
    try {
      const res = await fetch(apiUrl(`/api/admin/support/${thread.id}/send`), {
        method: "POST", headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ text: v }),
      });
      const d = await res.json();
      if (res.ok && d.success) { setText(""); await load(); }
      else alert(d.message || "Xatolik yuz berdi");
    } catch {
      alert("Xatolik yuz berdi");
    } finally {
      setBusy(false);
    }
  };

  const fmtTime = (v) => (v ? new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");

  return (
    <Modal title={`${t("up_supportTitle")}: ${(thread.peer && thread.peer.name) || ""}`} onClose={onClose} theme={theme}>
      <div style={{ maxHeight: "46vh", overflowY: "auto", display: "flex", flexDirection: "column", gap: "6px", padding: "2px 0 10px" }}>
        {(data && data.messages ? data.messages : []).map((m) => (
          <div key={m.id} style={{
            alignSelf: m.fromSupport ? "flex-end" : "flex-start",
            maxWidth: "82%", padding: "8px 12px", borderRadius: "14px",
            fontSize: theme.font.sm, fontWeight: "500", lineHeight: 1.4,
            color: m.fromSupport ? "#fff" : theme.text,
            background: m.fromSupport ? theme.primary : theme.bgSecondary,
            border: m.fromSupport ? "none" : `1px solid ${theme.border}`,
            boxShadow: theme.raiseSm.boxShadow, wordBreak: "break-word", whiteSpace: "pre-wrap",
          }}>
            {m.text}
            <div style={{ fontSize: "10px", opacity: 0.75, marginTop: "3px", textAlign: m.fromSupport ? "right" : "left" }}>
              {m.fromSupport ? `Ustachi • ${fmtTime(m.createdAt)}` : fmtTime(m.createdAt)}
            </div>
          </div>
        ))}
        {data && data.messages.length === 0 && <Empty theme={theme} />}
      </div>
      <div style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder={t("up_messagePlaceholder")}
          style={{ flex: 1, boxSizing: "border-box", padding: "11px 12px", borderRadius: theme.radius.md, border: `1px solid ${theme.border}`, outline: "none", backgroundColor: theme.bgSecondary, color: theme.text, fontSize: theme.font.base }}
        />
        <button onClick={send} disabled={busy} style={{ width: "42px", height: "42px", borderRadius: "50%", border: "none", background: theme.primary, color: theme.textInverse, cursor: busy ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: theme.raiseSm.boxShadow, ...raise.bind, flexShrink: 0 }}>
          <Send size={16} />
        </button>
      </div>
    </Modal>
  );
}

export default AdminHome;