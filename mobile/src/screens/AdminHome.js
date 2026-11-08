import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View, Text, Pressable, ScrollView, TextInput, Modal, ActivityIndicator,
  Image, useWindowDimensions, Animated, Easing,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { apiUrl } from "../config";
import { authHeaders } from "../services/api";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { ConfirmLogoutModal } from "../components/ConfirmLogoutModal";
import { clearAuth } from "../services/authStore";

const TABS = { DASHBOARD: "dashboard", USERS: "users", MASTERS: "masters", FEEDBACK: "feedback" };

// Animatsiyalangan chiziqli grafik (tarmoq orqali chiziladi)
function LineChart({ data, color, height = 150 }) {
  const { theme } = useTheme();
  const { width: winWidth } = useWindowDimensions();
  const width = winWidth - 16 * 2 - 16 * 2 - 8;

  const max = Math.max(1, ...data.map((d) => d.count));
  const padL = 6, padT = 14, padB = 20;
  const innerW = width - padL * 2;
  const innerH = height - padT - padB;
  const pts = data.map((d, i) => ({
    x: padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
    y: padT + innerH - (d.count / max) * innerH,
    ...d,
  }));

  const segs = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    if (d < 2) continue;
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    segs.push({
      x: (a.x + b.x) / 2 - d / 2,
      y: (a.y + b.y) / 2 - 1.5,
      w: d,
      rot: `${ang}rad`,
      idx: i + 1,
    });
  }

  const values = useRef(pts.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    values.forEach((v) => v.setValue(0));
    Animated.stagger(
      70,
      values.map((v) =>
        Animated.timing(v, { toValue: 1, duration: 520, easing: Easing.out(Easing.cubic), useNativeDriver: true })
      )
    ).start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width]);

  const dashes = [];
  for (const f of [0.33, 0.66, 1]) {
    dashes.push({ top: padT + innerH * (1 - f) });
  }

  return (
    <View style={{ width, height }}>
      {dashes.map((d, i) => (
        <View
          key={i}
          pointerEvents="none"
          style={{
            position: "absolute", left: padL, right: padL, top: d.top,
            height: 1, backgroundColor: theme.border, opacity: 0.6,
          }}
        />
      ))}
      {segs.map((s, i) => (
        <Animated.View
          key={`s${i}`}
          pointerEvents="none"
          style={{
            position: "absolute", left: s.x, top: s.y, width: s.w, height: 3,
            borderRadius: 2, backgroundColor: color,
            transform: [{ rotate: s.rot }, {
              scaleX: values[s.idx] ? values[s.idx].interpolate({ inputRange: [0, 1], outputRange: [0, 1] }) : 1,
            }],
          }}
        />
      ))}
      {pts.map((p, i) => (
        <Animated.View
          key={`d${i}`}
          pointerEvents="none"
          style={{
            position: "absolute", left: p.x - 4, top: p.y - 4,
            width: 8, height: 8, borderRadius: 4, backgroundColor: theme.surface,
            borderWidth: 2, borderColor: color,
            opacity: values[i].interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          }}
        />
      ))}
      {pts.map((p, i) => (
        <Text
          key={`t${i}`}
          pointerEvents="none"
          style={{
            position: "absolute", left: p.x - 12, top: height - 15,
            width: 24, textAlign: "center",
            fontSize: 8, color: theme.textTertiary,
          }}
          numberOfLines={1}
        >
          {p.label}
        </Text>
      ))}
    </View>
  );
}

function StatCard({ icon, label, value, sub, accent, theme }) {
  return (
    <View style={{
      width: "48%", backgroundColor: theme.surface, borderRadius: theme.radius.lg,
      padding: 12, marginBottom: 10, ...theme.neumorph.raised,
    }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 6 }}>
        <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: (accent || theme.primary) + "22", alignItems: "center", justifyContent: "center" }}>
          <Icon name={icon} size={14} color={accent || theme.primary} />
        </View>
        <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary, fontWeight: "600", flex: 1 }} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={{ fontSize: theme.font.xxl, fontWeight: "800", color: theme.text }}>{value}</Text>
      {!!sub && <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginTop: 2 }}>{sub}</Text>}
    </View>
  );
}

function ConfirmModal({ open, title, body, confirmLabel, confirmColor, loading, onCancel, onConfirm, children }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={open} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.55)", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <View style={{
          width: "100%", maxWidth: 420, backgroundColor: theme.surface, borderRadius: theme.radius.xl,
          padding: 18, ...theme.neumorph.raised,
        }}>
          <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text, marginBottom: 8 }}>{title}</Text>
          <Text style={{ fontSize: theme.font.base, color: theme.textSecondary, lineHeight: 20, marginBottom: 16 }}>{body}</Text>
          {children}
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable onPress={onCancel} style={({ pressed }) => [
              { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, backgroundColor: theme.bgSecondary, alignItems: "center", ...theme.neumorph.raisedSm },
              pressed && { ...theme.neumorph.pressed },
            ]}>
              <Text style={{ fontSize: 14, fontWeight: "700", color: theme.text }}>{t("cancel")}</Text>
            </Pressable>
            <Pressable onPress={onConfirm} style={({ pressed }) => [
              { flex: 1, paddingVertical: 12, borderRadius: theme.radius.md, backgroundColor: confirmColor || theme.error, alignItems: "center", ...theme.neumorph.raisedSm },
              pressed && { ...theme.neumorph.pressed },
            ]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ fontSize: 14, fontWeight: "800", color: "#FFFFFF" }}>{confirmLabel}</Text>}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const FEEDBACK_ICONS = { suggestion: "lightbulb", complaint: "alert-triangle", question: "help-circle", praise: "thumbs-up" };

export function AdminHome({ user }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [tab, setTab] = useState(TABS.DASHBOARD);
  const [confirmLogout, setConfirmLogout] = useState(false);

  const tabBtn = (key, label, icon) => {
    const active = tab === key;
    return (
      <Pressable onPress={() => setTab(key)} style={{ alignItems: "center", gap: 2, flex: 1, paddingVertical: 4 }}>
        <Icon name={icon} size={22} color={active ? theme.primary : theme.textTertiary} />
        <Text style={{ fontSize: 10, fontWeight: active ? "800" : "600", color: active ? theme.primary : theme.textTertiary }}>{label}</Text>
        {active && <View style={{ width: 20, height: 3, borderRadius: 2, backgroundColor: theme.primary }} />}
      </Pressable>
    );
  };

  const press3D = (pressed) => [theme.neumorph.raisedSm, pressed && { ...theme.neumorph.pressed }];

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, gap: 10 }}>
        <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", ...theme.neumorph.raised }}>
          <Icon name="shield" size={20} color="#FFFFFF" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text }}>{"Admin"}</Text>
          <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary }} numberOfLines={1}>{user?.name || user?.phone}</Text>
        </View>
        <Pressable onPress={() => navigation.navigate("Settings")} style={({ pressed }) => [press3D(pressed), { padding: 8, borderRadius: theme.radius.md, backgroundColor: theme.bgSecondary }]}>
          <Icon name="settings" size={18} color={theme.textSecondary} />
        </Pressable>
        <Pressable onPress={() => setConfirmLogout(true)} style={({ pressed }) => [press3D(pressed), { padding: 8, borderRadius: theme.radius.md, backgroundColor: theme.errorLight }]}>
          <Icon name="log-out" size={18} color={theme.error} />
        </Pressable>
      </View>

      <View style={{ flex: 1 }}>
        {tab === TABS.DASHBOARD && <DashboardTab />}
        {tab === TABS.USERS && <UsersTab />}
        {tab === TABS.MASTERS && <MastersTab />}
        {tab === TABS.FEEDBACK && <FeedbackTab />}
      </View>

      <View style={{ flexDirection: "row", backgroundColor: theme.neumorph.surface, paddingVertical: 8, paddingHorizontal: 8, ...theme.neumorph.raisedSm }}>
        {tabBtn(TABS.DASHBOARD, t("up_admDashboard"), "home")}
        {tabBtn(TABS.USERS, t("up_admUsers"), "users")}
        {tabBtn(TABS.MASTERS, t("up_admMasters"), "wrench")}
        {tabBtn(TABS.FEEDBACK, t("up_admFeedback"), "message-circle")}
      </View>

      <ConfirmLogoutModal open={confirmLogout} onCancel={() => setConfirmLogout(false)} onConfirm={() => { setConfirmLogout(false); clearAuth(); }} />
    </View>
  );
}

function DashboardTab() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [overview, setOverview] = useState(null);
  const [series, setSeries] = useState(null);
  const [range, setRange] = useState("daily");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (r) => {
    setLoading(true);
    try {
      const [o, s] = await Promise.all([
        fetch(apiUrl("/api/admin/overview"), { headers: authHeaders() }).then((x) => x.json()),
        fetch(apiUrl(`/api/admin/series?range=${r}`), { headers: authHeaders() }).then((x) => x.json()),
      ]);
      setOverview(o.data);
      setSeries(s.data);
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { load(range); }, [load, range]);

  const chart = (label, data, color) => (
    <View style={{ marginTop: 10 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
        <Text style={{ fontSize: theme.font.xs, color: theme.textSecondary, fontWeight: "600" }}>{label}</Text>
      </View>
      <LineChart key={`${label}-${range}`} data={data || []} color={color} />
    </View>
  );

  if (loading && !overview) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator size="large" color={theme.primary} /></View>;
  }

  const ranges = [
    { key: "daily", label: t("up_admDaily") },
    { key: "monthly", label: t("up_admMonthly") },
    { key: "yearly", label: t("up_admYearly") },
  ];

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
        <StatCard icon="users" label={t("up_admUsers")} value={overview?.totalUsers ?? 0} sub={`+${overview?.users?.month ?? 0} ${t("up_admMonth")}`} theme={theme} />
        <StatCard icon="wrench" label={t("up_admMasters")} value={overview?.totalMasters ?? 0} sub={`+${overview?.masters?.month ?? 0} ${t("up_admMonth")}`} theme={theme} accent="#7C3AED" />
        <StatCard icon="shopping-cart" label={t("up_admOrders")} value={overview?.totalOrders ?? 0} sub={`+${overview?.orders?.month ?? 0} ${t("up_admMonth")}`} theme={theme} accent="#EA580C" />
        <StatCard icon="message-square" label={t("up_admChats")} value={overview?.totalChats ?? 0} theme={theme} accent="#0284C7" />
        <StatCard icon="x-circle" label={t("up_admBanned")} value={overview?.bannedUsers ?? 0} sub={`${overview?.feedback?.pending ?? 0} ${t("up_admFeedback")}`} theme={theme} accent="#DC2626" />
      </View>

      <View style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.radius.lg, padding: 14, marginTop: 4, ...theme.neumorph.raised }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
          <Text style={{ fontSize: theme.font.base, fontWeight: "700", color: theme.text }}>{t("up_admStats")}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {ranges.map((r) => (
              <Pressable
                key={r.key}
                onPress={() => setRange(r.key)}
                style={({ pressed }) => [
                  { paddingVertical: 6, paddingHorizontal: 10, borderRadius: theme.radius.md, backgroundColor: range === r.key ? theme.primary : theme.bgSecondary, ...theme.neumorph.raisedSm },
                  pressed && { ...theme.neumorph.pressed },
                ]}
              >
                <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: range === r.key ? "#FFFFFF" : theme.textSecondary }}>{r.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {series ? (
          <View>
            {chart(t("up_admUsers"), series.users || [], theme.primary)}
            {chart(t("up_admMasters"), series.masters || [], "#7C3AED")}
            {chart(t("up_admOrders"), series.orders || [], "#EA580C")}
          </View>
        ) : (
          <View style={{ paddingVertical: 30, alignItems: "center" }}>
            <Text style={{ color: theme.textTertiary, fontSize: theme.font.sm }}>...</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

function useBanList(endpoint, queryKey = "q") {
  const { theme } = useTheme();
  const [list, setList] = useState(null);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 50;

  const load = useCallback(async (query, p = 1, append = false) => {
    try {
      const base = `${endpoint}${query ? `?${queryKey}=${encodeURIComponent(query)}&` : "?"}page=${p}&limit=${PAGE_SIZE}`;
      const res = await fetch(apiUrl(base), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setList((prev) => (append ? [...(prev || []), ...data.data] : data.data));
        setPage(p);
        setHasMore(!!(data.pagination && data.pagination.page < data.pagination.pages));
      }
    } catch {}
  }, [endpoint, queryKey]);

  useEffect(() => {
    const id = setTimeout(() => load(q), 280);
    return () => clearTimeout(id);
  }, [q, load]);

  const next = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(q, page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, q, page, load]);

  const doToggle = async (item) => {
    const banned = item.banned || item.owner?.banned;
    const id = item.id;
    try {
      await fetch(apiUrl(`${endpoint}/${id}/ban`), {
        method: "POST",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
        body: JSON.stringify({ banned: !banned }),
      });
      load(q);
    } catch {}
  };

  return { list, q, setQ, load, next, hasMore, loadingMore, doToggle, theme };
}

function UsersTab() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { list, q, setQ, next, hasMore, loadingMore, doToggle } = useBanList("/api/admin/users");
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    await doToggle(target);
    setBusy(false);
    setTarget(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <SearchBox q={q} setQ={setQ} placeholder={t("up_admSearch")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {(list || []).map((u) => (
          <Row key={u.id} theme={theme}>
            <Avatar ch={(u.name || u.phone || "?").charAt(0)} photo={u.photo} banned={u.banned} theme={theme} />
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <Text style={{ fontSize: theme.font.base, fontWeight: "700", color: theme.text }} numberOfLines={1}>{u.name || u.phone}</Text>
                {u.role === "admin" && <Chip label="ADMIN" color={theme.primary} bg={theme.primaryLight} />}
                {u.role === "master" && <Chip label="USTA" color="#7C3AED" bg="#F4E8FF" />}
              </View>
              <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>
                {u.phone} • {t("up_admOrders")}: {u.orders || 0}
              </Text>
              {!!u.banned && (
                <Text style={{ fontSize: theme.font.xs, color: theme.error, marginTop: 2 }}>{u.bannedReason || t("up_admBanned")}</Text>
              )}
            </View>
            {u.role !== "admin" && (
              <Pressable onPress={() => setTarget(u)} style={({ pressed }) => [
                { paddingVertical: 7, paddingHorizontal: 10, borderRadius: theme.radius.md, backgroundColor: u.banned ? theme.bgSecondary : theme.errorLight, ...theme.neumorph.raisedSm },
                pressed && { ...theme.neumorph.pressed },
              ]}>
                <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: u.banned ? theme.textSecondary : theme.error }}>{u.banned ? t("up_admUnban") : t("up_admBan")}</Text>
              </Pressable>
            )}
          </Row>
        ))}
        {list && list.length === 0 && <Empty theme={theme} />}
        {hasMore && (
          <Pressable
            onPress={next}
            disabled={loadingMore}
            style={({ pressed }) => [
              {
                marginTop: 14,
                backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm,
                paddingVertical: 12,
                alignItems: "center",
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.primary }}>
              {loadingMore ? "..." : t("loadMore")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
      <ConfirmModal
        open={!!target}
        title={target?.banned ? t("up_admUnban") : t("up_admBan")}
        body={(target?.banned ? t("up_admUnbanConfirm") : t("up_admBanConfirm")).replace("{name}", target?.name || target?.phone || "")}
        confirmLabel={target?.banned ? t("up_admUnban") : t("up_admBan")}
        loading={busy}
        onCancel={() => setTarget(null)}
        onConfirm={confirm}
      />
    </View>
  );
}

function MastersTab() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const { list, q, setQ, next, hasMore, loadingMore, doToggle } = useBanList("/api/admin/masters");
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    if (!target) return;
    setBusy(true);
    await doToggle(target);
    setBusy(false);
    setTarget(null);
  };

  return (
    <View style={{ flex: 1 }}>
      <SearchBox q={q} setQ={setQ} placeholder={t("up_admSearch")} />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
        {(list || []).map((m) => {
          const banned = m.owner?.banned;
          return (
            <Row key={m.id} theme={theme}>
              <Avatar ch={m.name.charAt(0)} photo={m.photo} banned={banned} theme={theme} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: theme.font.base, fontWeight: "700", color: theme.text }} numberOfLines={1}>{m.name}</Text>
                <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary }}>
                  {m.phone} • {t("up_admOrders")}: {m.orders || 0} • {"\u2605"} {Number(m.rating || 0).toFixed(1)}
                </Text>
                {!!banned && (
                  <Text style={{ fontSize: theme.font.xs, color: theme.error, marginTop: 2 }}>{m.owner?.bannedReason || t("up_admBanned")}</Text>
                )}
              </View>
              <Pressable onPress={() => setTarget(m)} style={({ pressed }) => [
                { paddingVertical: 7, paddingHorizontal: 10, borderRadius: theme.radius.md, backgroundColor: banned ? theme.bgSecondary : theme.errorLight, ...theme.neumorph.raisedSm },
                pressed && { ...theme.neumorph.pressed },
              ]}>
                <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: banned ? theme.textSecondary : theme.error }}>{banned ? t("up_admUnban") : t("up_admBan")}</Text>
              </Pressable>
            </Row>
          );
        })}
        {list && list.length === 0 && <Empty theme={theme} />}
        {hasMore && (
          <Pressable
            onPress={next}
            disabled={loadingMore}
            style={({ pressed }) => [
              {
                marginTop: 14,
                backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm,
                paddingVertical: 12,
                alignItems: "center",
              },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.primary }}>
              {loadingMore ? "..." : t("loadMore")}
            </Text>
          </Pressable>
        )}
      </ScrollView>
      <ConfirmModal
        open={!!target}
        title={target?.owner?.banned ? t("up_admUnban") : t("up_admBan")}
        body={(target?.owner?.banned ? t("up_admUnbanConfirm") : t("up_admBanConfirm")).replace("{name}", target?.name || "")}
        confirmLabel={target?.owner?.banned ? t("up_admUnban") : t("up_admBan")}
        loading={busy}
        onCancel={() => setTarget(null)}
        onConfirm={confirm}
      />
    </View>
  );
}

function FeedbackTab() {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [list, setList] = useState(null);
  const [answerFor, setAnswerFor] = useState(null);
  const [note, setNote] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

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

  const next = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    await load(page + 1, true);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, load]);

  useEffect(() => { load(); }, [load]);

  const setStatus = async (id, status, adminNote) => {
    try {
      await fetch(apiUrl(`/api/feedback/admin/${id}`), {
        method: "PATCH",
        headers: { ...authHeaders(), "Content-Type": "application/json" },
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
    await setStatus(answerFor.id, "answered", note.trim());
    setAnswerFor(null);
    setNote("");
  };

  const roleMap = { master: "wrench", user: "users" };

  return (
    <>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} showsVerticalScrollIndicator={false}>
      {(list || []).map((f) => {
        const TypeIcon = FEEDBACK_ICONS[f.type] || "message-circle";
        const RoleIcon = roleMap[f.role] || "users";
        return (
          <Row key={f.id} theme={theme}>
            <View style={{ alignItems: "center", gap: 6, width: 30 }}>
              <Icon name={TypeIcon} size={20} color={theme.primary} />
              <Icon name={RoleIcon} size={13} color={theme.textTertiary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                <Text style={{ fontSize: theme.font.sm, fontWeight: "800", color: theme.text }}>{t(`fb_type_${f.type}`)}</Text>
                <StatusChip status={f.status} theme={theme} />
              </View>
              <Text style={{ fontSize: theme.font.xs, color: theme.textTertiary, marginBottom: 4 }}>
                {f.name || f.phone} {f.contact ? `• ${f.contact}` : ""} • {new Date(f.createdAt).toLocaleString()}
              </Text>
              <Text style={{ fontSize: theme.font.base, color: theme.text, marginBottom: 8 }}>{f.text}</Text>
              {!!f.adminNote && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: theme.infoLight, borderRadius: theme.radius.md, padding: 6, marginBottom: 8 }}>
                  <Icon name="message-square" size={11} color={theme.info} />
                  <Text style={{ fontSize: theme.font.xs, color: theme.info, flex: 1 }}>{f.adminNote}</Text>
                </View>
              )}
              <View style={{ flexDirection: "row", gap: 6 }}>
                {f.status !== "answered" && (
                  <Pressable onPress={() => openAnswer(f)} style={({ pressed }) => [
                    { paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radius.md, backgroundColor: theme.primary, ...theme.neumorph.raisedSm },
                    pressed && { ...theme.neumorph.pressed },
                  ]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon name="message-square" size={12} color="#FFFFFF" />
                      <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: "#FFFFFF" }}>{t("admin_answerBtn")}</Text>
                    </View>
                  </Pressable>
                )}
                {f.status !== "viewed" && (
                  <Pressable onPress={() => setStatus(f.id, "viewed")} style={({ pressed }) => [
                    { paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radius.md, backgroundColor: theme.bgSecondary, ...theme.neumorph.raisedSm },
                    pressed && { ...theme.neumorph.pressed },
                  ]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon name="eye" size={12} color={theme.textSecondary} />
                      <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.textSecondary }}>{t("fb_viewed")}</Text>
                    </View>
                  </Pressable>
                )}
                {f.status === "answered" && (
                  <Pressable onPress={() => openAnswer(f)} style={({ pressed }) => [
                    { paddingVertical: 6, paddingHorizontal: 12, borderRadius: theme.radius.md, backgroundColor: theme.bgSecondary, ...theme.neumorph.raisedSm },
                    pressed && { ...theme.neumorph.pressed },
                  ]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                      <Icon name="check-circle" size={12} color={theme.success} />
                      <Text style={{ fontSize: theme.font.xs, fontWeight: "700", color: theme.success }}>{t("admin_answerEdit")}</Text>
                    </View>
                  </Pressable>
                )}
              </View>
            </View>
          </Row>
        );
      })}
      {list && list.length === 0 && <Empty theme={theme} />}
      {hasMore && (
        <Pressable
          onPress={next}
          disabled={loadingMore}
          style={({ pressed }) => [
            {
              marginTop: 14,
              backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm,
              paddingVertical: 12,
              alignItems: "center",
            },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={{ fontSize: theme.font.sm, fontWeight: "700", color: theme.primary }}>
            {loadingMore ? "..." : t("loadMore")}
          </Text>
        </Pressable>
      )}
    </ScrollView>

    {answerFor && (
      <Modal transparent animationType="fade" visible onRequestClose={() => setAnswerFor(null)}>
        <View style={{ flex: 1, backgroundColor: "rgba(2,6,23,0.6)", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <View style={{ width: "100%", maxWidth: 440, backgroundColor: theme.neumorph.surface, borderRadius: theme.radius.xl, padding: 18, ...theme.neumorph.raised }}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.text }}>{t("admin_answerTitle")}</Text>
              <Pressable onPress={() => setAnswerFor(null)} hitSlop={8}>
                <Icon name="x-circle" size={22} color={theme.textTertiary} />
              </Pressable>
            </View>
            <View style={{ padding: 10, backgroundColor: theme.bgSecondary, borderRadius: theme.radius.md, borderLeftWidth: 3, borderLeftColor: theme.primary, marginBottom: 10 }}>
              <Text style={{ fontSize: theme.font.sm, color: theme.textSecondary }}>
                <Text style={{ fontWeight: "700" }}>({answerFor.name || answerFor.phone})</Text> {answerFor.text}
              </Text>
            </View>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder={t("admin_answerPlaceholder")}
              placeholderTextColor={theme.textTertiary}
              multiline
              numberOfLines={4}
              style={{ backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm, padding: 10, color: theme.text, fontSize: theme.font.base, marginBottom: 10, textAlignVertical: "top", minHeight: 80 }}
            />
            <Pressable onPress={saveAnswer} style={({ pressed }) => [
              { paddingVertical: 12, borderRadius: theme.radius.md, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 6, ...theme.neumorph.raisedSm },
              pressed && { ...theme.neumorph.pressed },
            ]}>
              <Icon name="check-circle" size={16} color="#FFFFFF" />
              <Text style={{ fontSize: theme.font.base, fontWeight: "700", color: "#FFFFFF" }}>{t("admin_answerSave")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      )}
    </>
  );
}

function SearchBox({ q, setQ, placeholder }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 8,
      backgroundColor: theme.surface, borderRadius: theme.radius.md,
      paddingHorizontal: 12, paddingVertical: 10, margin: 16, ...theme.neumorph.raised,
    }}>
      <Icon name="search" size={16} color={theme.textTertiary} />
      <TextInput
        value={q}
        onChangeText={setQ}
        placeholder={placeholder}
        placeholderTextColor={theme.textTertiary}
        style={{ flex: 1, color: theme.text, fontSize: theme.font.base, padding: 0 }}
      />
      {!!q && (
        <Pressable onPress={() => setQ("")} hitSlop={8}>
          <Icon name="x-circle" size={16} color={theme.textTertiary} />
        </Pressable>
      )}
    </View>
  );
}

function Row({ children }) {
  const { theme } = useTheme();
  return (
    <View style={{
      flexDirection: "row", alignItems: "center", gap: 12,
      backgroundColor: theme.surface, borderRadius: theme.radius.lg,
      padding: 12, marginBottom: 10, ...theme.neumorph.raised,
    }}>
      {children}
    </View>
  );
}

function Avatar({ ch, photo, banned }) {
  const { theme } = useTheme();
  if (photo) {
    return <View style={{ width: 42, height: 42, borderRadius: 21, overflow: "hidden", opacity: banned ? 0.4 : 1 }}>
      <Image source={{ uri: photo }} style={{ width: 42, height: 42 }} />
    </View>;
  }
  return (
    <View style={{
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: theme.primaryLight, alignItems: "center", justifyContent: "center", opacity: banned ? 0.4 : 1,
    }}>
      <Text style={{ fontSize: theme.font.lg, fontWeight: "800", color: theme.primary }}>{ch}</Text>
    </View>
  );
}

function Chip({ label, color, bg }) {
  return (
    <Text style={{ fontSize: 9, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: bg, color, fontWeight: "800", overflow: "hidden" }}>
      {label}
    </Text>
  );
}

function StatusChip({ status, theme }) {
  const map = {
    new: { label: "YANGI", color: theme.warning, bg: theme.warningLight },
    viewed: { label: "KO'RILDI", color: theme.info, bg: theme.infoLight },
    answered: { label: "JAVOB", color: theme.success, bg: theme.successLight },
  };
  const s = map[status] || map.viewed;
  return <Text style={{ fontSize: 9, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10, backgroundColor: s.bg, color: s.color, fontWeight: "800", overflow: "hidden" }}>{s.label}</Text>;
}

function Empty({ theme }) {
  return <Text style={{ textAlign: "center", color: theme.textTertiary, paddingVertical: 40, fontSize: theme.font.sm }}>{"Bo'sh"}</Text>;
}

export default AdminHome;