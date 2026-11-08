import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, Text, Pressable, TextInput, Image, FlatList, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";
import { apiUrl, authHeaders } from "../services/api";
import { attachSocket } from "../services/socket";
import { getAuthUser } from "../services/authStore";
import { getItem, setItem } from "../services/storage";
import {
  getMessages as getLocalMessages,
  mergeMessages,
  appendMessage,
  confirmMessage,
  markMessageFailed,
  removeMessage,
  markThreadRead,
  upsertThread,
  isSendableText,
} from "../services/chatStore";
import { displayName, displayPhone, isGuestPhone } from "../utils/display";
import { absoluteUrl } from "../config";
import Badge from "../components/Badge";

const MAX_MSG_LEN = 2000;

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTime(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function sameDay(a, b) {
  if (!a || !b) return false;
  const da = new Date(a);
  const db = new Date(b);
  if (isNaN(da.getTime()) || isNaN(db.getTime())) return false;
  return da.getFullYear() === db.getFullYear() && da.getMonth() === db.getMonth() && da.getDate() === db.getDate();
}

function formatDateLabel(dateStr, t) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / 86400000);
  if (diffDays === 0) return t("today", "Bugun");
  if (diffDays === 1) return t("yesterday", "Kecha");
  return `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`;
}

export function ChatWindow({ user }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute();
  const params = route?.params ?? {};
  const authUser = user || getAuthUser();
  const chatId = params.chatId;
  const peerParam = params.peerName || params.otherName || "";
  const peerPhoneParam = params.otherPhone || params.phone || "";

  const [messages, setMessages] = useState([]);
  const [peerContact, setPeerContact] = useState(null);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(authUser && authUser.id ? String(authUser.id) : "");
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const peerName = displayName(peerContact && peerContact.name, peerContact && peerContact.phone) || peerParam || t("chatPeer");
  const peerPhone = peerContact && peerContact.phone ? peerContact.phone : peerPhoneParam;
  const peerPhoto = peerContact && peerContact.photo ? peerContact.photo : null;
  const peerPhotoSrc = peerPhoto ? (peerPhoto.startsWith("data:") || peerPhoto.startsWith("http") ? peerPhoto : absoluteUrl(peerPhoto)) : null;
  const peerInitial = String((peerContact && peerContact.avatarCh) || peerName.charAt(0) || "?").toUpperCase();

  // 1) Avval QURILMADAN ko'rsatamiz — internet yo'q bo'lsa ham tarix qoladi
  const load = useCallback(async () => {
    if (!chatId) return;
    setLoading(true);
    try {
      const local = await getLocalMessages(chatId);
      if (local.length) setMessages(local);
    } catch {}
    try {
      const res = await fetch(apiUrl(`/api/chat/${chatId}`), { headers: authHeaders() });
      const data = await res.json();
      if (res.ok && data.success) {
        setPeerContact(data.data.peer || null);
        // 2) Serverdagi qismni lokal bilan birlashtiramiz
        const merged = await mergeMessages(chatId, data.data.messages || []);
        setMessages(merged);
      }
    } catch {} finally { setLoading(false); }
  }, [chatId]);

  useEffect(() => {
    if (chatId) load();
  }, [chatId, load]);

  // Chatni "o'qildi" deb belgilash (lokal + server)
  useEffect(() => {
    if (!chatId) return;
    markThreadRead(chatId).catch(() => {});
    (async () => {
      try {
        await fetch(apiUrl("/api/chat/read"), { method: "POST", headers: authHeaders() });
      } catch {}
    })();
  }, [chatId]);

  // O'zimizning id — xabarlar "meniki" ekanini bilish uchun
  useEffect(() => {
    if (myId) return;
    (async () => {
      const stored = await getItem("ustachi_user_id");
      if (stored) { setMyId(stored); return; }
      try {
        const res = await fetch(apiUrl("/api/auth/me"), { headers: authHeaders() });
        const data = await res.json();
        if (res.ok && data.success && data.user && data.user.id) {
          setMyId(String(data.user.id));
          setItem("ustachi_user_id", String(data.user.id));
        }
      } catch {}
    })();
  }, [myId]);

  // Yangi xabar socket orqali kelganda qo'shamiz (chat:new) — va lokalga saqlaymiz
  useEffect(() => {
    const { detach } = attachSocket({
      onChatNew: (p) => {
        if (p && p.chatId === chatId && p.message) {
          appendMessage(chatId, p.message, { bumpThread: false }).then((list) => setMessages(list));
          // Lokal thread ro'yxati ham yangilanadi (Xabarlar bo'limidagi oxirgi xabar)
          upsertThread({
            id: chatId,
            lastMessage: p.message.text || (p.message.image ? "[image]" : ""),
            lastActivity: Date.now(),
            lastSenderId: p.message.senderId || null,
            unread: 0,
          }).catch(() => {});
        }
      },
    });
    return detach;
  }, [chatId]);

  const onContentSizeChange = useCallback(() => {
    listRef.current?.scrollToEnd({ animated: false });
  }, []);

  // Xabar yuborish: avval optimistik ko'rsatamiz, so'ng serverga yuboramiz
  const send = useCallback(async (overrideText) => {
    const t2 = String(overrideText !== undefined ? overrideText : text).trim();
    if (!isSendableText(t2) || sending || !chatId) return;
    setText("");
    setSending(true);

    // myId hali ma'lum bo'lmasa — qurilmadagi id bilan to'ldiramiz (aks holda
    // o'z xabarimiz o'ng o'rniga chap tomonda suhbatdoshniki bo'lib ko'rinardi)
    let my = myId;
    if (!my) {
      try {
        const stored = await getItem("ustachi_user_id");
        if (stored) { my = stored; setMyId(stored); }
      } catch {}
    }

    const tempId = `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    let list = await appendMessage(chatId, {
      text: t2,
      senderId: my,
      senderRole: authUser && authUser.role,
      pending: true,
      tempId,
    });
    setMessages(list);

    try {
      const res = await fetch(apiUrl(`/api/chat/${chatId}/messages`), {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json" }),
        body: JSON.stringify({ text: t2 }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data) {
        list = await confirmMessage(chatId, tempId, data.data);
        setMessages(list);
      } else {
        list = await markMessageFailed(chatId, tempId);
        setMessages(list);
      }
    } catch {
      list = await markMessageFailed(chatId, tempId);
      setMessages(list);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  }, [text, sending, chatId, myId, authUser]);

  // Yuborilmagan xabarni qayta urinish
  const retryMessage = useCallback(async (m) => {
    if (!chatId) return;
    const failedId = m.id;
    const body = m.text;
    const list = await removeMessage(chatId, failedId);
    setMessages(list);
    send(body);
  }, [chatId, send]);

  const rows = useMemo(() => {
    const out = [];
    messages.forEach((m, i) => {
      const prev = messages[i - 1];
      if (i === 0 || !sameDay(m.createdAt, prev && prev.createdAt)) {
        out.push({ type: "date", id: `d_${m.id || i}`, createdAt: m.createdAt });
      }
      out.push({ type: "msg", id: m.id || i, m, showSender: i === 0 || !prev || prev.senderId !== m.senderId });
    });
    return out;
  }, [messages]);

  const renderItem = ({ item }) => {
    if (item.type === "date") {
      return (
        <View style={{ alignItems: "center", marginVertical: 10 }}>
          <View style={{ backgroundColor: theme.bgSecondary, borderRadius: 12, paddingVertical: 4, paddingHorizontal: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: "600", color: theme.textTertiary }}>{formatDateLabel(item.createdAt, t)}</Text>
          </View>
        </View>
      );
    }
    const m = item.m;
    if (m.system) {
      return (
        <View style={{ alignSelf: "center", maxWidth: "80%", backgroundColor: theme.bgTertiary, borderRadius: 20, paddingVertical: 6, paddingHorizontal: 14, marginVertical: 8 }}>
          <Text style={{ fontSize: 11, fontWeight: "600", color: theme.textSecondary, textAlign: "center" }}>{m.text}</Text>
        </View>
      );
    }
    const isMe = myId && String(m.senderId || "") === String(myId);
    const timeStr = formatTime(m.createdAt);
    const senderName = isMe
      ? t("you")
      : displayName(peerContact && peerContact.name, peerContact && peerContact.phone) || peerParam || t("chatPeer");
    return (
      <View style={{ flexDirection: "column", alignItems: isMe ? "flex-end" : "flex-start", marginBottom: item.showSender ? 6 : 1 }}>
        {item.showSender && (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 3, paddingHorizontal: 4 }}>
            {!isMe && (
              <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: theme.bgTertiary, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 1, borderColor: theme.border }}>
                {peerPhotoSrc ? (
                  <Image source={{ uri: peerPhotoSrc }} style={{ width: "100%", height: "100%" }} />
                ) : (
                  <Text style={{ fontSize: 8, fontWeight: "800", color: theme.textSecondary }}>{peerInitial}</Text>
                )}
              </View>
            )}
            <Text style={{ fontSize: 11, fontWeight: "700", color: isMe ? theme.primary : theme.textSecondary }}>{senderName}</Text>
          </View>
        )}
        <View
          style={{
            maxWidth: "78%",
            backgroundColor: isMe ? theme.primary : theme.surface,
            borderWidth: isMe ? 0 : 1,
            borderColor: isMe ? theme.primary : theme.border,
            borderRadius: 14,
            borderBottomRightRadius: isMe ? 4 : 14,
            borderBottomLeftRadius: isMe ? 14 : 4,
            paddingVertical: 9,
            paddingHorizontal: 12,
            opacity: m.pending ? 0.65 : 1,
          }}
        >
          {!!m.image && (
            <Image source={{ uri: absoluteUrl(m.image) }} style={{ width: 220, height: 160, borderRadius: 8, marginBottom: m.text ? 6 : 0 }} />
          )}
          {!!m.text && (
            <Text style={{ fontSize: 13, lineHeight: 18, color: isMe ? theme.textInverse : theme.text }}>{m.text}</Text>
          )}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "flex-end", gap: 4, marginTop: 2 }}>
            {!!timeStr && (
              <Text style={{ fontSize: 10, color: isMe ? "rgba(255,255,255,0.75)" : theme.textTertiary, marginLeft: 8 }}>{timeStr}</Text>
            )}
            {isMe && !!m.pending && (
              <Icon name="clock" size={11} color="rgba(255,255,255,0.8)" />
            )}
            {isMe && !m.pending && !m.failed && (
              <Icon name="check" size={11} color="rgba(255,255,255,0.8)" />
            )}
          </View>
        </View>
        {isMe && !!m.failed && (
          <Pressable
            onPress={() => retryMessage(m)}
            hitSlop={8}
            style={({ pressed }) => [
              {
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                marginTop: 3,
                backgroundColor: theme.dangerSoft || theme.bgTertiary,
                borderRadius: 10,
                paddingVertical: 3,
                paddingHorizontal: 8,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Icon name="alert-circle" size={11} color={theme.danger} />
            <Text style={{ fontSize: 10, fontWeight: "700", color: theme.danger }}>
              {t("chatNotSent", "Yuborilmadi")}
            </Text>
            <Text style={{ fontSize: 10, fontWeight: "800", color: theme.danger, textDecorationLine: "underline" }}>
              {t("chatRetry", "Qayta")}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={{ flex: 1, backgroundColor: theme.bg }}>
        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border }}>
          <Pressable
            onPress={() => navigation.goBack()}
            hitSlop={10}
            style={({ pressed }) => [
              { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.bgTertiary, alignItems: "center", justifyContent: "center" },
              pressed && { opacity: 0.85 },
            ]}
          >
            <Icon name="chevron-left" size={20} color={theme.text} />
          </Pressable>
          <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: theme.primary, alignItems: "center", justifyContent: "center", overflow: "hidden", borderWidth: 2, borderColor: theme.border }}>
            {peerPhotoSrc ? (
              <Image source={{ uri: peerPhotoSrc }} style={{ width: "100%", height: "100%" }} />
            ) : (
              <Text style={{ color: theme.textInverse, fontWeight: "800", fontSize: 16 }}>{peerInitial}</Text>
            )}
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text numberOfLines={1} style={{ fontSize: 15, fontWeight: "800", color: theme.text, flexShrink: 1 }}>{peerName}</Text>
              {!!peerContact && !!peerContact.role && peerContact.role !== "guest" && (
                <Badge
                  label={t(peerContact.role === "master" ? "chatRoleMaster" : "chatRoleUser")}
                  tone={peerContact.role === "master" ? "primary" : "secondary"}
                  size="sm"
                />
              )}
            </View>
            {!!peerPhone && !isGuestPhone(peerPhone) && (
              <Text numberOfLines={1} style={{ fontSize: 11, color: theme.textTertiary }}>{displayPhone(peerPhone)}</Text>
            )}
          </View>
        </View>

        {loading ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : messages.length === 0 ? (
          <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Icon name="message-circle" size={48} color={theme.textTertiary} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: theme.textTertiary }}>{t("greeting")}</Text>
          </View>
        ) : (
          <FlatList
            ref={listRef}
            data={rows}
            keyExtractor={(r) => String(r.id)}
            renderItem={renderItem}
            contentContainerStyle={{ padding: 14 }}
            onContentSizeChange={onContentSizeChange}
            keyboardShouldPersistTaps="handled"
          />
        )}

        {/* Input */}
        <View style={{ paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.surface }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <TextInput
              ref={inputRef}
              value={text}
              onChangeText={(v) => setText(v.slice(0, MAX_MSG_LEN))}
              placeholder={t("typeMessage")}
              placeholderTextColor={theme.textTertiary}
              maxLength={MAX_MSG_LEN}
              returnKeyType="send"
              onSubmitEditing={send}
              blurOnSubmit={false}
              style={{ flex: 1, backgroundColor: theme.neumorph.insetBg, borderRadius: theme.neumorph.radius, paddingVertical: 10, paddingHorizontal: 14, fontSize: 13, color: theme.text, ...theme.neumorph.inset }}
            />
            <Pressable
              onPress={send}
              disabled={!text.trim() || sending}
              style={({ pressed }) => [
                { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", backgroundColor: text.trim() && !sending ? theme.primary : theme.bgTertiary },
                pressed && { opacity: 0.85 },
              ]}
            >
              <Icon name="send" size={18} color={text.trim() && !sending ? "#FFFFFF" : theme.textTertiary} />
            </Pressable>
          </View>
          {text.length > MAX_MSG_LEN * 0.9 && (
            <Text style={{ fontSize: 10, color: text.length >= MAX_MSG_LEN ? theme.error : theme.textTertiary, textAlign: "right", marginTop: 2 }}>
              {text.length}/{MAX_MSG_LEN}
            </Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

export default ChatWindow;