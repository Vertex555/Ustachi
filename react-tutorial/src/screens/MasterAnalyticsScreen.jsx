import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, TrendingUp, Receipt, Package, AlertCircle } from "lucide-react";
import { apiUrl, authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import { UBackBtn, UButton, UStatCard, USkeleton, UBadge, USeparator } from "../components/ui";
import { MiniChart } from "../components/MiniChart";

const MONTHS = ["Yan", "Fev", "Mar", "Apr", "May", "Iyn", "Iyl", "Avg", "Sen", "Okt", "Noy", "Dek"];

function fmt(n) {
  return new Intl.NumberFormat("uz-UZ").format(Math.round(Number(n) || 0));
}
function short(n) {
  const v = Number(n) || 0;
  if (v >= 1e9) return (v / 1e9).toFixed(1) + " mlrd";
  if (v >= 1e6) return (v / 1e6).toFixed(1) + " mln";
  if (v >= 1e3) return (v / 1e3).toFixed(0) + " min";
  return String(v);
}

export const MasterAnalyticsScreen = ({ onBack }) => {
  const { theme } = useTheme();
  const { t } = useTranslation();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["master-earnings"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/masters/me/earnings"), { headers: authHeaders() });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.message || "Xatolik");
      return data.data;
    },
  });

  const summary = data?.summary || {};
  const monthly = data?.monthly || [];
  const recent = data?.recent || [];

  // So'nggi 6 oy (ma'lumot bor oylar bo'yicha)
  const chartData = monthly.slice(-6).map((m) => ({
    label: MONTHS[(m.month - 1) % 12] || m.month,
    value: m.total,
  }));

  return (
    <div style={{ maxWidth: "820px", margin: "0 auto", padding: "16px", width: "100%", boxSizing: "border-box", fontFamily: theme.font.family }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
        <UBackBtn onClick={onBack} />
        <h1 style={{ margin: 0, fontSize: theme.font.xxl, fontWeight: theme.font.extrabold, color: theme.text, letterSpacing: "-0.02em" }}>
          {t("analyticsTitle") || "Daromad analitikasi"}
        </h1>
      </div>

      {isError ? (
        <div className="ust-neumo" style={{ padding: "32px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
          <AlertCircle size={28} style={{ color: theme.error }} />
          <div style={{ color: theme.text, fontWeight: theme.font.bold }}>{t("loadError") || "Yuklab bo'lmadi"}</div>
          <UButton onClick={() => refetch()} variant="secondary">{t("retry")}</UButton>
        </div>
      ) : isLoading ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
            {[0, 1, 2, 3].map((i) => (
              <USkeleton key={i} height="110px" radius={theme.radius.lg} style={{ flex: "1 1 150px" }} />
            ))}
          </div>
          <USkeleton height="200px" radius={theme.radius.lg} />
        </div>
      ) : (
        <>
          {/* Stat kartalar */}
          <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "16px" }}>
            <UStatCard icon={<Wallet size={19} />} label={t("totalEarnings") || "Jami daromad"} value={short(summary.total)} sub={`${fmt(summary.total)} so'm`} />
            <UStatCard icon={<TrendingUp size={19} />} label={t("netRevenue") || "Sof tushum"} value={short(summary.revenue)} accent={theme.gradient} />
            <UStatCard icon={<Receipt size={19} />} label={t("commission") || "Komissiya"} value={short(summary.commission)} />
            <UStatCard icon={<Package size={19} />} label={t("paidOrders") || "To'langan buyurtma"} value={fmt(summary.paidCount)} sub={`${t("totalOrdersLabel") || "Jami"}: ${fmt(summary.totalOrders)}`} />
          </div>

          {/* Oylik grafik */}
          <div className="ust-neumo" style={{ padding: "18px", marginBottom: "16px" }}>
            <div style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold, color: theme.text, marginBottom: "16px" }}>
              {t("monthlyEarnings") || "Oylik daromad"}
            </div>
            {chartData.length === 0 ? (
              <div style={{ padding: "30px 0", textAlign: "center", color: theme.textTertiary, fontSize: theme.font.sm }}>
                {t("noMonthlyData") || "Hozircha ma'lumot yo'q"}
              </div>
            ) : (
              <MiniChart data={chartData} height={170} format={(v) => `${short(v)} so'm`} />
            )}
          </div>

          {/* So'nggi buyurtmalar */}
          <div className="ust-neumo" style={{ padding: "18px" }}>
            <div style={{ fontSize: theme.font.lg, fontWeight: theme.font.extrabold, color: theme.text, marginBottom: "14px" }}>
              {t("recentPaidOrders") || "So'nggi to'langan buyurtmalar"}
            </div>
            {recent.length === 0 ? (
              <div style={{ padding: "20px 0", textAlign: "center", color: theme.textTertiary, fontSize: theme.font.sm }}>
                {t("noOrdersYet") || "Buyurtmalar hozircha yo'q"}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column" }}>
                {recent.map((o, i) => (
                  <div key={o.id || i}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 0" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: theme.font.base, fontWeight: theme.font.bold, color: theme.text }}>#{o.orderNumber || o.id?.slice(-6) || i + 1}</span>
                          <UBadge variant="success">{t("paid") || "To'langan"}</UBadge>
                        </div>
                        <div style={{ fontSize: theme.font.sm, color: theme.textSecondary, marginTop: "3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {o.device || "—"} · {new Date(o.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: theme.font.base, fontWeight: theme.font.extrabold, color: theme.primary }}>+{fmt(o.total)}</div>
                        <div style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>-{fmt(o.commission)} {t("commissionShort") || "komissiya"}</div>
                      </div>
                    </div>
                    {i < recent.length - 1 && <USeparator />}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

// Kichik yordamchi tugma (xatolik holati uchun)
function UButtonLike({ onClick, label }) {
  const { theme } = useTheme();
  return (
    <button
      onClick={onClick}
      style={{ padding: "10px 18px", borderRadius: theme.radius.full, border: "none", background: theme.gradient || theme.primary, color: "#fff", fontWeight: theme.font.bold, cursor: "pointer", fontFamily: theme.font.family, fontSize: theme.font.sm }}
    >
      {label || "OK"}
    </button>
  );
}

export default MasterAnalyticsScreen;
