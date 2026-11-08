import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, Pressable, TextInput, FlatList, Image, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import EmptyState from "../components/EmptyState";
import Badge from "../components/Badge";
import Card from "../components/Card";
import ScreenHeader from "../components/ScreenHeader";
import { apiUrl, authHeaders } from "../services/api";
import { attachSocket } from "../services/socket";
import { getAuthUser } from "../services/authStore";
import { displayName, displayPhone } from "../utils/display";
import { readThreads, mergeThreads, markAllThreadsRead } from "../services/chatStore";
import { absoluteUrl } from "../config";

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatRelativeTime(iso, t) {
  if (!iso && iso !== 0) return "";
  // Lokal store vaqtni millisekund raqam sifatida saqlaydi
  const d = typeof iso === "number" ? new Date(iso) : new Date(iso);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - day.getTime()) / 86400000);
  if (diffDays <= 0) return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
  if (diffDays === 1) return t("yesterday", "Kecha");
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function ChatsView({ user, onOpenChat, onBadgeRefresh }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const authUser = user && user.id ? user : getAuthUser();
  const myId = authUser && authUser.id ? String(authUser.id) : "";
  const [threads, setThreads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const CHAT_PAGE_SIZE = 50;

  const load = useCallback(async () => {
    // 1) Avval QURILMADAN — internet yo'q bo'lsa ham chatlar ko'rinadi
    try {
      const local = await readThreads();
      if (local.length) setThreads(local);
    } catch {}
    // 2) Serverdan kelgan ro'yxatni lokal bilan birlashtiramiz
    try {
      const res = await fetch(apiUrl(`/api/chat/my?page=1&limit=${CHAT_PAGE_SIZE}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        const merged = await mergeThreads(data.data);
        setThreads(merged);
        setPage(1);
        setHasMore(!!data.pagination && data.pagination.page < data.pagination.pages);
      }
    } catch {}
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const res = await fetch(apiUrl(`/api/chat/my?page=${next}&limit=${CHAT_PAGE_SIZE}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success && Array.isArray(data.data)) {
        setThreads((list) => [...list, ...data.data]);
        setPage(next);
        setHasMore(!!data.pagination && data.pagination.page < data.pagination.pages);
      }
    } catch {}
    setLoadingMore(false);
  }, [loadingMore, hasMore, page]);

  // Bo'lim ochilganda va yangi xabar kelganda barcha chatlarni "o'qildi" deb belgilaymiz
  const markAllRead = useCallback(async () => {
    try {
      await markAllThreadsRead();
      setThreads((list) => list.map((c) => ({ ...c, unread: 0 })));
    } catch {}
    try {
      await fetch(apiUrl("/api/chat/read"), { method: "POST", headers: authHeaders() });
    } catch {}
    if (onBadgeRefresh) onBadgeRefresh();
  }, [onBadgeRefresh]);

  // Tab fokuslanayotganda ro'yxat va unread badge'ni yangilaymiz
  useFocusEffect(
    useCallback(() => {
      let active = true;
      setLoading(true);
      (async () => {
        await markAllRead();
        if (!active) return;
        await load();
        if (active) setLoading(false);
      })();
      return () => { active = false; };
    }, [markAllRead, load])
  );

  // Bo'lim ichida turgan paytda yangi xabar kelib qolsa — darhol o'qilgan deb belgilaymiz (badge o'chadi)
  useEffect(() => {
    const { detach } = attachSocket({
      onChatNew: () => {
        markAllRead();
        load();
      },
    });
    return detach;
  }, [markAllRead, load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await markAllRead();
    await load();
    setRefreshing(false);
  }, [markAllRead, load]);

  const openChat = useCallback(
    (chat) => {
      const peer = chat.peer || {};
      const peerName = displayName(peer.name, peer.phone) || t("chatPeer");
      const params = {
        chatId: chat.id || chat._id,
        peerName,
        otherUserId: peer.id || chat.peerId || chat.otherUserId,
        otherPhone: peer.phone || chat.otherPhone,
      };
      if (onOpenChat) onOpenChat(params);
      else navigation.navigate("ChatWindow", params);
    },
    [onOpenChat, navigation, t]
  );

  const threadList = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return threads;
    return threads.filter((c) => {
      const peer = c.peer || {};
      const name = String(peer.name || peer.phone || "").toLowerCase();
      const last = String(c.lastMessage || "").toLowerCase();
      return name.includes(q) || last.includes(q);
    });
  }, [threads, query]);

  const renderRow = ({ item }) => {
    const peer = item.peer || {};
    const peerName = displayName(peer.name, peer.phone) || t("chatPeer");
    const photo = peer.photo
      ? peer.photo.startsWith("data:") || peer.photo.startsWith("http")
        ? peer.photo
        : absoluteUrl(peer.photo)
      : null;
    const initial = String(peer.avatarCh || peerName.charAt(0) || "?").toUpperCase();
    const last = item.lastMessage || "";
    const phone = displayPhone(peer.phone);
    const unread = !!item.unread;
    const time = formatRelativeTime(item.lastActivity, t);
    const peerRole = peer.role;
    const isPeerMaster = peerRole === "master";
    const lastIsMine = !!myId && !!item.lastSenderId && String(item.lastSenderId) === myId;
    return (
      <Card
        padding={12}
        accent={unread ? theme.primary : undefined}
        onPress={() => openChat(item)}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {photo ? (
              <Image source={{ uri: photo }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ color: theme.textInverse, fontWeight: "800", fontSize: 17 }}>{initial}</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={1} style={[theme.type.sub, { color: theme.text, flexShrink: 1 }]}>{peerName}</Text>
              {!!peerRole && peerRole !== "guest" && (
                <Badge
                  label={t(isPeerMaster ? "chatRoleMaster" : "chatRoleUser")}
                  tone={isPeerMaster ? "primary" : "secondary"}
                  size="sm"
                />
              )}
            </View>
            <Text numberOfLines={1} style={[theme.type.bodySm, { color: theme.textSecondary, marginTop: 3 }]}>
              {lastIsMine && last ? (
                <Text style={{ fontWeight: "700", color: theme.textTertiary }}>{t("you")}: </Text>
              ) : null}
              {last || t("chat")}
            </Text>
            {!!phone && (
              <Text numberOfLines={1} style={[theme.type.caption, { color: theme.textTertiary, marginTop: 2 }]}>{phone}</Text>
            )}
          </View>
          <View style={{ alignItems: "flex-end", gap: 8 }}>
            {!!time && <Text style={[theme.type.caption, { color: theme.textTertiary, fontWeight: "600" }]}>{time}</Text>}
            {unread && (
              <View style={{ minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ color: theme.textInverse, fontSize: 9.5, fontWeight: "800" }}>1</Text>
              </View>
            )}
          </View>
        </View>
      </Card>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <ScreenHeader
        icon="message-circle"
        title={t("chatTitle")}
        subtitle={t("tabChats")}
        count={threads.length}
      >
        {/* Qidiruv — sarlavha ichida glass pill */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
            marginTop: 16,
            backgroundColor: "rgba(255,255,255,0.16)",
            borderRadius: 16,
            paddingHorizontal: 13,
            paddingVertical: 10,
            borderWidth: 1,
            borderColor: "rgba(255,255,255,0.24)",
          }}
        >
          <Icon name="search" size={17} color="rgba(255,255,255,0.85)" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("search")}
            placeholderTextColor="rgba(255,255,255,0.65)"
            style={{ flex: 1, color: "#FFFFFF", fontSize: 14, padding: 0 }}
          />
          {!!query && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Icon name="close" size={16} color="rgba(255,255,255,0.8)" />
            </Pressable>
          )}
        </View>
      </ScreenHeader>

      {loading && threads.length === 0 ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={theme.primary} />
        </View>
      ) : threadList.length === 0 ? (
        <View style={{ flex: 1, justifyContent: "center" }}>
          <EmptyState
            theme={theme}
            icon={query ? "search" : "message-circle"}
            title={query ? t("noChatsFound") : t("noChats")}
            subtitle={query ? t("noChatsFoundHint") : t("noChatsHint")}
            action={t("goToOrders")}
            onAction={() => navigation.navigate("Orders")}
          />
        </View>
      ) : (
        <FlatList
          data={threadList}
          keyExtractor={(c) => c.id || c._id || String(c)}
          renderItem={renderRow}
          contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
          refreshing={refreshing}
          onRefresh={onRefresh}
          keyboardShouldPersistTaps="handled"
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            loadingMore ? (
              <View style={{ paddingVertical: 16, alignItems: "center" }}>
                <ActivityIndicator color={theme.primary} />
              </View>
            ) : null
          }
        />
      )}
      {!!authUser && null}
    </View>
  );
}

export default ChatsView;