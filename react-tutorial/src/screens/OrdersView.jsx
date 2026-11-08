import React, { useState, useEffect, useCallback } from "react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { attachSocket } from "../services/socket";
import { displayName } from "../utils/display";

const statusMeta = (status, theme) => {
  const map = {
    placed: { key: "pending", color: theme.warning, bg: theme.warningLight },
    accepted: { key: "pending", color: theme.warning, bg: theme.warningLight },
    in_progress: { key: "pending", color: theme.warning, bg: theme.warningLight },
    ready: { key: "pending", color: theme.warning, bg: theme.warningLight },
    completed: { key: "completed", color: theme.success, bg: theme.successLight },
    rejected: { key: "rejected", color: theme.error, bg: theme.errorLight },
  };
  return map[status] || { key: "pending", color: theme.warning, bg: theme.warningLight };
};

export const OrdersView = ({ user, onViewOrder, onBadgeRefresh }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const isMaster = !!user?.isMaster;
  const [orders, setOrders] = useState([]);
  const [pendingRatings, setPendingRatings] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const ORDER_PAGE_SIZE = 50;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const view = isMaster ? "view=master&" : "";
      const res = await fetch(apiUrl(`/api/orders?${view}page=1&limit=${ORDER_PAGE_SIZE}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setOrders(data.data);
        setPage(1);
        setHasMore(!!data.pagination && data.pagination.page < data.pagination.pages);
      }
    } catch {}
    setLoading(false);
}, [isMaster]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const view = isMaster ? "view=master&" : "";
      const res = await fetch(apiUrl(`/api/orders?${view}page=${next}&limit=${ORDER_PAGE_SIZE}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setOrders((list) => [...list, ...data.data]);
        setPage(next);
        setHasMore(!!data.pagination && data.pagination.page < data.pagination.pages);
      }
    } catch {}
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, isMaster]);

  useEffect(() => { load(); }, [load]);

  // Bo'lim ochilganda barcha faol buyurtmalarni "ko'rildi" deb belgilaymiz (badge o'chadi)
  const markSeen = useCallback(async () => {
    try {
      await fetch(apiUrl("/api/orders/seen"), {
        method: "POST",
        headers: authHeaders(),
      });
    } catch {}
    if (onBadgeRefresh) onBadgeRefresh();
  }, [onBadgeRefresh]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await markSeen();
      if (!cancelled) load();
    })();
    return () => { cancelled = true; };
  }, [markSeen, load]);

  // Real-time: status o'zgarishlarini roʻyxatga aks ettirish (usta qabul qilganda)
  useEffect(() => {
    const { detach } = attachSocket({
      onOrderUpdate: (p) => {
        const updated = p && p.order;
        if (!updated || !updated.id) return;
        setOrders((list) => {
          const has = list.some((o) => o.id === updated.id);
          if (!has) return list;
          return list.map((o) => (o.id === updated.id ? { ...o, ...updated } : o));
        });
        // Bo'lim ichida turgan paytda buyurtma yangilansa — ko'rildi deb belgilaymiz (badge o'chadi)
        markSeen();
      },
    });
    return detach;
  }, [markSeen]);

  const isCompleted = (s) => s === "completed";

  const handleRate = async (orderId, stars) => {
    if (!stars) return;
    const prev = pendingRatings[orderId];
    setPendingRatings((p) => ({ ...p, [orderId]: stars }));
    setError("");
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/rate`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ rating: stars }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("error"));
        if (!prev) setPendingRatings((p) => { const c = { ...p }; delete c[orderId]; return c; });
        return;
      }
      setOrders((list) => list.map((o) => (o.id === orderId ? { ...o, rating: stars } : o)));
    } catch {
      setError(t("error"));
    }
  };

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [completeTarget, setCompleteTarget] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);

  const changeStatus = async (orderId, status, rejectionReason) => {
    setError("");
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/status`), {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ status, rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("error"));
        return;
      }
      setOrders((list) => list.map((o) => (o.id === orderId ? data.data : o)));
    } catch {
      setError(t("error"));
    }
  };

  const cancelOrder = async (orderId) => {
    setError("");
    try {
      const res = await fetch(apiUrl(`/api/orders/${orderId}/cancel`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ reason: t("cancelOrder") }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || t("error"));
        return;
      }
      setOrders((list) => list.map((o) => (o.id === orderId ? data.data : o)));
    } catch {
      setError(t("error"));
    }
  };

  const handleCancelClick = (orderId) => {
    setCancelTarget(orderId);
  };

  const confirmComplete = async () => {
    if (!completeTarget) return;
    await changeStatus(completeTarget, "completed");
    setCompleteTarget(null);
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    if (!rejectReason.trim()) { setError(t("rejectionReason") + "!"); return; }
    await changeStatus(rejectTarget, "rejected", rejectReason.trim());
    setRejectTarget(null);
    setRejectReason("");
  };

  const NEXT_STATUS = {
    placed: "accepted",
    accepted: "in_progress",
    in_progress: "ready",
    ready: "completed",
  };

  const renderMasterActions = (order) => {
    if (order.status === "rejected") return null;
    if (order.status === "completed") return null;
    const next = NEXT_STATUS[order.status];
    const isComplete = order.status === "ready";
    return (
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", paddingTop: "10px", marginTop: "10px", borderTop: `1px solid ${theme.border}` }}>
        {order.status === "placed" && (
          <button onClick={(e) => { e.stopPropagation(); setRejectTarget(order.id); setRejectReason(""); }}
            className="btn-act"
            style={{ backgroundColor: theme.errorLight, color: theme.error, border: "none", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
            {t("rejectOrder")}
          </button>
        )}
        {next && !isComplete && (
          <button onClick={(e) => { e.stopPropagation(); changeStatus(order.id, next); }}
            className="btn-act"
            style={{ backgroundColor: theme.primary, color: theme.textInverse, border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>
            {next === "accepted" ? t("acceptOrder") : t("advance")} →
          </button>
        )}
        {order.status === "ready" && (
          <button onClick={(e) => { e.stopPropagation(); setCompleteTarget(order.id); }}
            className="btn-act"
            style={{ backgroundColor: theme.success, color: theme.textInverse, border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "12px", fontWeight: "800", cursor: "pointer" }}>
            ✓ {t("confirmCompleted")}
          </button>
        )}
      </div>
    );
  };

  const renderStars = (order) => {
    const current = order.rating || pendingRatings[order.id] || 0;
    const canRate = isCompleted(order.status) && !order.rating;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "2px" }}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} onClick={(e) => { e.stopPropagation(); handleRate(order.id, n); }} disabled={!canRate || !!order.rating}
            style={{ background: "none", border: "none", cursor: canRate && !order.rating ? "pointer" : "default", padding: 0, fontSize: "22px", lineHeight: 1 }}>
<span style={{ color: n <= current ? "#059669" : "#d1d5db" }}><img src={`https://api.iconify.design/lucide:star.svg?color=${encodeURIComponent(n <= current ? "#059669" : "#d1d5db")}&fill=${encodeURIComponent(n <= current ? "#059669" : "#d1d5db")}`} width="20" height="20" alt="" /></span>
          </button>
        ))}
        {order.rating > 0 && (
          <span style={{ fontSize: "12px", fontWeight: "800", color: "#059669", marginLeft: "6px" }}>{order.rating}.0</span>
        )}
        {!order.rating && isCompleted(order.status) && (
          <span style={{ fontSize: "10px", color: theme.textTertiary, marginLeft: "6px" }}>{t("rateMaster")}</span>
        )}
        {!isCompleted(order.status) && (
          <span style={{ fontSize: "10px", color: theme.textTertiary, marginLeft: "6px" }}>{t("pending")}</span>
        )}
      </div>
    );
  };

  return (
    <div style={{ padding: "16px", boxSizing: "border-box", width: "100%", maxWidth: "100%", margin: "0 auto", backgroundColor: theme.bg, minHeight: "80vh" }}>
      <h1 style={{ fontSize: "18px", fontWeight: "800", margin: "0 0 16px 0", color: theme.text }}>{t("myOrders")}</h1>

      {error && <div style={{ backgroundColor: theme.errorLight, color: theme.error, padding: "10px 14px", borderRadius: theme.radius.md, fontSize: "13px", fontWeight: "700", marginBottom: "12px" }}>{error}</div>}

      {loading && <p style={{ color: theme.textSecondary, textAlign: "center" }}>...</p>}
      {!loading && orders.length === 0 && (
        <div style={{ textAlign: "center", padding: "50px 0", color: theme.textTertiary }}>
          <img src="https://api.iconify.design/lucide:package-open.svg?color=%2394a3b8" width="48" height="48" alt="" />
          <p style={{ fontSize: "14px", fontWeight: "600", margin: "12px 0 0 0" }}>{t("noOrdersForUser")}</p>
        </div>
      )}

<div className="ust-list-grid">
        {orders.map((o, i) => {
          const st = statusMeta(o.status, theme);
          return (
            <div key={o.id} className="ust-screen-up" style={{ backgroundColor: theme.surface, border: `1.5px solid ${theme.border}`, borderRadius: theme.radius.md, padding: "14px", boxShadow: theme.shadowSm, animationDelay: `${Math.min(i, 8) * 40}ms` }}>
              <div role="button" tabIndex={0} onClick={() => onViewOrder(o)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onViewOrder(o); } }} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: theme.text, width: "100%", textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                  <div style={{ fontSize: "13px", fontWeight: "700", color: theme.text, display: "flex", flexDirection: "column", gap: "2px" }}>
                    <span>{String(o.orderNumber || "").replace(/^UST-/i, "") || String(o.id).slice(-6)}</span>
                    <span style={{ fontWeight: "600", color: theme.textSecondary }}>{o.master?.name || t("master")}</span>
                  </div>
                  <span style={{ fontSize: "11px", fontWeight: "800", color: st.color, backgroundColor: st.bg, padding: "4px 10px", borderRadius: "12px", whiteSpace: "nowrap" }}>{t(st.key)}</span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "8px", fontSize: "12px", color: theme.textSecondary }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><img src="https://api.iconify.design/lucide:smartphone.svg?color=%2359656e" width="13" height="13" alt="" />{o.device || o.deviceModel || "—"}</span>
                  <span>{o.total ? `${Number(o.total).toLocaleString()} so'm` : ""}</span>
                  <span>{o.createdAt ? new Date(o.createdAt).toLocaleDateString() : ""}</span>
                  {isMaster && o.user?.phone && (
                    <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span style={{ width: "20px", height: "20px", borderRadius: "50%", backgroundColor: theme.primary, color: theme.textInverse, display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: "9px", fontWeight: "800", overflow: "hidden", flexShrink: 0 }}>
                        {o.user.photo ? <img src={o.user.photo && (o.user.photo.startsWith("data:") || o.user.photo.startsWith("http")) ? o.user.photo : apiUrl(o.user.photo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : (o.user.avatarCh || "?")}
                      </span>
                      {displayName(o.user.name, o.user.phone) || t("user")}
                    </span>
                  )}
                </div>
                {o.paymentMethod && o.paymentMethod !== "cash_on_delivery" && (
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", fontSize: "11px", fontWeight: "700" }}>
                    <span style={{ padding: "3px 10px", borderRadius: "12px", backgroundColor: o.paymentStatus === "paid" ? theme.successLight : theme.warningLight, color: o.paymentStatus === "paid" ? theme.success : theme.warning }}>
                      {o.paymentStatus === "paid" ? "✓ " : ""}{o.payment?.cardLast4 ? `💳 •••• ${o.payment.cardLast4}` : "💳"} • {o.paymentStatus === "paid" ? t("paid") : t("paymentPending")}
                    </span>
                  </div>
                )}
              </div>

              {!isMaster && (
                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${theme.border}`, display: "flex", flexDirection: "column", gap: "6px" }}>
                  <span style={{ fontSize: "12px", fontWeight: "700", color: theme.text }}>{t("rateMaster")}</span>
                  {renderStars(o)}
                  {o.status !== "completed" && o.status !== "rejected" && (
                    <button onClick={(e) => { e.stopPropagation(); handleCancelClick(o.id); }} className="btn-act"
                      style={{ alignSelf: "flex-start", backgroundColor: theme.bgTertiary, color: theme.error, border: `1px solid ${theme.errorLight}`, borderRadius: "8px", padding: "7px 14px", fontSize: "12px", fontWeight: "700", cursor: "pointer" }}>
                      {t("cancelOrder")}
                    </button>
                  )}
                </div>
              )}

              {isMaster && renderMasterActions(o)}
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button onClick={loadMore} disabled={loadingMore} className="btn-act"
          style={{ width: "100%", marginTop: "14px", backgroundColor: theme.surface, color: theme.primary, border: `1.5px solid ${theme.border}`, borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "800", cursor: loadingMore ? "default" : "pointer" }}>
          {loadingMore ? "..." : t("loadMore")}
        </button>
      )}

      {cancelTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px", boxSizing: "border-box" }} onClick={() => setCancelTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="ust-scale" style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: "22px", width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "14px", boxSizing: "border-box", boxShadow: theme.shadowXl, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "800", color: theme.text, margin: 0 }}>{t("cancelOrderTitle")}</h3>
            <p style={{ fontSize: "13px", color: theme.textSecondary, margin: 0, lineHeight: "1.5" }}>{t("cancelOrderConfirm")}</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setCancelTarget(null)} className="btn-act" style={{ flex: 1, backgroundColor: theme.bgTertiary, color: theme.text, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>{t("no")}</button>
              <button onClick={() => { cancelOrder(cancelTarget); setCancelTarget(null); }} className="btn-act" style={{ flex: 1, backgroundColor: theme.error, color: theme.textInverse, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}>{t("yes")}</button>
            </div>
          </div>
        </div>
      )}
      {rejectTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px", boxSizing: "border-box" }} onClick={() => setRejectTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="ust-scale" style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: "22px", width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "14px", boxSizing: "border-box", boxShadow: theme.shadowXl, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "800", color: theme.text, margin: 0 }}>{t("rejectOrder")}</h3>
            <textarea name="rejectReason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t("rejectionReason")}
              rows={3} style={{ width: "100%", padding: "12px", borderRadius: "10px", border: `1px solid ${theme.border}`, fontSize: "14px", outline: "none", boxSizing: "border-box", backgroundColor: theme.bgSecondary, color: theme.text, resize: "none", fontFamily: "inherit" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setRejectTarget(null)} className="btn-act" style={{ flex: 1, backgroundColor: theme.bgTertiary, color: theme.text, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>{t("cancel")}</button>
              <button onClick={confirmReject} className="btn-act" style={{ flex: 1, backgroundColor: theme.error, color: theme.textInverse, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}>{t("confirm")}</button>
            </div>
          </div>
        </div>
      )}
      {completeTarget && (
        <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: "16px", boxSizing: "border-box" }} onClick={() => setCompleteTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="ust-scale" style={{ backgroundColor: theme.surface, borderRadius: theme.radius.lg, padding: "22px", width: "100%", maxWidth: "360px", display: "flex", flexDirection: "column", gap: "14px", boxSizing: "border-box", boxShadow: theme.shadowXl, maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ fontSize: "17px", fontWeight: "800", color: theme.text, margin: 0 }}>{t("confirmCompletedTitle")}</h3>
            <p style={{ fontSize: "13px", color: theme.textSecondary, margin: 0, lineHeight: "1.5" }}>{t("confirmCompletedDesc")}</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button onClick={() => setCompleteTarget(null)} className="btn-act" style={{ flex: 1, backgroundColor: theme.bgTertiary, color: theme.text, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "700", cursor: "pointer" }}>{t("cancel")}</button>
              <button onClick={confirmComplete} className="btn-act" style={{ flex: 1, backgroundColor: theme.success, color: theme.textInverse, border: "none", borderRadius: "12px", padding: "12px", fontSize: "13px", fontWeight: "800", cursor: "pointer" }}>{t("confirmAction")}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrdersView;


