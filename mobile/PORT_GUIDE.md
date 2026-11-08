# Ustachi — React Native Port Guide (MIGRATION AMP) muvaqqat hujjat

Rasmiy ish vositasi, qo'lda saqlovchi hujjat emas. Endi kod keltirish "Mobile" App.js + navigation + screensgacha.

## Konventsiyalar

- Fayl kengaytmasi: `.js`. Barcha fayllar `C:\Users\hello\Desktop\Ustachi\mobile\src\` ichida.
- Importlarivat:
  ```js
  import React, { useState, useEffect, useCallback, useRef } from "react";
  import { View, Text, Pressable, TextInput, ScrollView, Image, StyleSheet, Modal, ActivityIndicator, FlatList, Alert, Linking, KeyboardAvoidingView, Platform } from "react-native";
  import { useTheme } from "../theme/ThemeContext";
  import { useTranslation } from "../i18n/LanguageContext";
  import Icon from "../components/Icon";
  ```
- Tema: `const { theme } = useTheme();` — `theme.font.base`, `theme.radius.md`, `theme.spacing.md` **SONLAR** (px string EMAS). Shadow: `theme.shadowSm` — RN obyekt bilan ishlatiladi (`style={{ boxShadow: theme.shadowSm }}` ishlamaydi, to'g'ri: `style={theme.shadowSm}` yoki `style={{...theme.shadowSm}}` + `shadowColor`...).
- Inline style obyektlari, StyleSheet ixtiyoriy. Hamma ekran bir xil uslubda: `style={{ backgroundColor: theme.bg }}`.
- Tugmalar: `<Pressable onPress={...} style={({pressed}) => [{ ...styles.dict }, pressed && { opacity: 0.85 }]}>`. Disabled: `disabled={...}`.
- Ikonlar: `<Icon name="lucide-nom" size={20} color={theme.textSecondary} />`. Faqatgina webdagi lucide nomlarni ishlating (Icon.jsx map qiladi). Star: `name="star"`.
- Tarjima: `const { t } = useTranslation();` → `t('key', fallback)`. Hech qanday til-muxim matnni hard-code qilmang.
- Xatolik/p& oynalar: native `Alert.alert(t('...'), msg)` o'rniga — designga og'ishmaslik uchun, kerak bo'lsa RN `Modal` (screensga inline).

## Tarmoq

- `apiUrl("/api/...")` va `authHeaders()` — `../services/api` dan.
- `analyzeDeviceMedia(images, forcedMedia)` — `../services/aiAnalysis`; qaytargich `{ device?, model?, issue?, description?, frames?, error? }`.
- `createOrder`, `updateOrderStatus`, `cancelOrder`, `rateOrder`, `updateOrderLocation`, `fetchOrders` — `../services/orders`.
- `fetchSavedMasters`, `saveMaster`, `unsaveMaster` — `../services/savedMasters`.
- `attachSocket`, `emit...` — `../services/socket`.
- `displayPhone`, `isGuestPhone`, `formatWorkingHours`, `formatCardNumber`, `formatPrice` — `../utils/display`.

## Rasm / Video

- Rasm tanlash: `import * as ImagePicker from "expo-image-picker";` → `ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7, base64: false })`; natija `{ canceled, assets:[{ uri, fileName, fileSize, type, width, height, assetId }] }`.
- Kamera: `ImagePicker.launchCameraAsync({...})` — avval `requestCameraPermissionsAsync`.
- Video thumbnail: `import * as VideoThumbnails from "expo-video-thumbnails";` → `const { uri } = await VideoThumbnails.getThumbnailAsync(videoUri, { time: 1000, quality: 0.7 });` → `{ uri, name: 'thumb.jpg', type: 'image/jpeg', fileSize: undefined }`.
- Image render: `<Image source={{ uri }} style={...} />`; `uri` `file://...` (pickerdan) `http...` (serverdan) bo'lishi mumkin.

## Navigatsiya (react-navigation v7)

Barcha ekranlar o'ziga `navigation` prop olishi mumkin. Qoidalar:

- Back tugma: `navigation.goBack()`.
- Ekran ochish: `navigation.navigate("NOM", params)`.
- Paramlar: `const route = useNavigation().getState()`... yo'q, to'g'risi: yuborish `navigation.navigate("Results", { orderParams })`; qabul `const { orderParams } = route.params ?? {}` — bunda `import { useRoute } from "@react-navigation/native";` va `const route = useRoute();`.

### Route nomlari va parametrlar

| Route | Paramlar |
|---|---|
| `Onboarding1` | — |
| `Onboarding2` | — |
| `RoleSelection` | — |
| `Login` | `{ role }` (user/master) |
| `Verification` | `{ phone, role }` |
| `LocationAccess` | — |
| `UserApp` | tab navigator (Home/Saved/Orders/Chats/Profile) |
| `MasterApp` | tab navigator (Anketa/Orders/Chats/Profile) |
| `Results` | `{ orderParams: { details, userLocation } }` |
| `PreOrder` | `{ master, userLocation, details }` |
| `OrderTracking` | `{ orderId }` |
| `ChatWindow` | `{ chatId, otherUserId, otherName, phone }` (qaysisi bor bo'lsa) |
| `Settings` | `{ from }` |
| `Help` | — |
| `NoInternet` | `{ onRetry? }` |

- ChatsView `onOpenChat(chat)` → `navigation.navigate("ChatWindow", { chatId: chat.id || chat._id, otherUserId: chat.otherUserId, otherName: chat.otherName })`.
- OrdersView `onViewOrder(order)` → `navigation.navigate("OrderTracking", { orderId: order.id || order._id })`.
- Results `onOrder(master, userLocation, details)` → `navigation.navigate("PreOrder", { master, userLocation, details })`.
- PreOrder `onOrderNow(data)` → `navigation.replace("OrderTracking", { orderId: data.id || data._id })`.
- UserProfile `onSettings` → `navigation.navigate("Settings")`, `onSupport` → `navigation.navigate("Help")`.
- MasterProfileScreen xuddi shu.
- CheckTypeFixer: back → `navigation.goBack()`; `onSaveProfile` → `navigation.goBack()`; `onChangeRole` → `navigation.goBack()` (webda keyingi amallarni Login reset qilsa, shunday: `navigation.popToTop`).
- UploadScreen "AI tahlil" muvaffaqiyatida → `navigation.navigate("Results", { orderParams: { details: {...}, userLocation: {...} } })`.

## Xarita

`YandexMap` web komponent **yo'q** — o'rniga `../components/MapCard`:
```js
import { MapCard, openYandexMaps } from "../components/MapCard";
<MapCard
  center={{ lat, lng }}
  markers={[{ lat, lng, color: "rd" | "gn" }]}
  height={200}
  showLegend={true}
  from={{ lat, lng }} to={{ lat, lng }}  // route bo'lsa
/>
```
`MapCard` bosilganda `openYandexMaps(from, to)` chaqiradi (yandexmaps deep link, yo'q bo'lsa https://yandex.com/maps/?rtext=).

## Tablar

- `UserApp` = `createBottomTabNavigator()`: tablar (`Home`=UploadScreen, `Saved`=SavedMastersScreen, `Orders`=OrdersView, `Chats`=ChatsView, `Profile`=UserProfile). Badge'larni `tabBarBadge` orqali ko'rsatamiz (tab navigator komponent yasash — `UserHome.jsx`).
- `MasterApp` tablar (`Anketa`=CheckTypeFixer, `Orders`=OrdersView, `Chats`=ChatsView, `Profile`=MasterProfileScreen).
- UserHome/MasterHome o'zi `components/HomeTabs.js` da: asosiy oqim (auth → LocationAccess → tabs). Socket badge refresh `useFocusEffect` bilan.

## Tekshirish

Har bir faylni yozgach, sintaksis o'qish: `node --check mobile\src\screens\X.js` (PowerShell cwd root) yoki ularni tez tekshirish (`node --check`).
Natijada `npx expo export` ishlay olishi kerak.