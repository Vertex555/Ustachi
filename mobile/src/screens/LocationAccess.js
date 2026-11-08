import React, { useState } from "react";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import * as Location from "expo-location";
import { useTheme } from "../theme/ThemeContext";
import { useTranslation } from "../i18n/LanguageContext";
import Icon from "../components/Icon";

export let lastLocation = null;

export function LocationAccess({ navigation }) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleAllowLocation = async () => {
    setIsLoading(true);
    setError("");
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (perm.status === "granted") {
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        const { latitude, longitude } = position.coords;
        console.log("Kenglik (Latitude):", latitude);
        console.log("Uzunlik (Longitude):", longitude);
        lastLocation = { lat: latitude, lng: longitude };
      }
    } catch (err) {
      setError(err.message || "");
    } finally {
      setIsLoading(false);
      navigation.navigate("Login");
    }
  };

  const primaryButtonStyle = {
    width: "100%",
    backgroundColor: theme.primary,
    paddingVertical: 15,
    borderRadius: theme.radius.xl,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
    ...theme.shadowMd,
    shadowColor: theme.primary,
    shadowOpacity: theme.mode === "dark" ? 0.3 : 0.3,
  };

  return (
    <View style={{ flex: 1, justifyContent: "space-evenly", alignItems: "center", backgroundColor: theme.bg, paddingHorizontal: "5%", paddingVertical: 20 }}>
      <View style={{ width: "100%", maxWidth: 400, alignItems: "center" }}>
        <Text style={{ fontSize: 28, fontWeight: theme.font.extrabold, lineHeight: 32, color: theme.text, textAlign: "center", marginBottom: 8 }}>
          {t("allowLocation")}
        </Text>
        <Text style={{ fontSize: 15, color: theme.textSecondary, textAlign: "center", maxWidth: "90%", lineHeight: 20, fontWeight: theme.font.semibold }}>
          {t("locationDesc")}
        </Text>
      </View>

      {/* Neumorphism: xarita ikonkasi ko'tarilgan kartada */}
      <View style={{ width: "100%", maxWidth: 320, height: 240, borderRadius: theme.neumorph.radiusLg, backgroundColor: theme.neumorph.surface, alignItems: "center", justifyContent: "center", ...theme.neumorph.raised }}>
        <Icon name="navigation" size={120} color={theme.primary} style={{ transform: [{ rotate: "45deg" }] }} />
      </View>

      <View style={{ width: "100%", maxWidth: 400, gap: 12 }}>
        {!!error && (
          <Text style={{ color: theme.error, fontSize: theme.font.xs, fontWeight: theme.font.bold, textAlign: "center" }}>{error}</Text>
        )}
        <Pressable
          onPress={handleAllowLocation}
          disabled={isLoading}
          style={({ pressed }) => [{ ...primaryButtonStyle, opacity: isLoading ? 0.7 : 1 }, pressed && { opacity: 0.85 }]}
        >
          <Icon name="navigation" size={20} color={theme.textInverse} style={{ transform: [{ rotate: "45deg" }] }} />
          <Text style={{ color: theme.textInverse, fontWeight: theme.font.bold, fontSize: 17 }}>{t("allowLocation")}</Text>
          {isLoading && <ActivityIndicator size="small" color={theme.textInverse} />}
        </Pressable>

        <Pressable
          onPress={() => navigation.navigate("Login")}
          disabled={isLoading}
          style={({ pressed }) => [{ width: "100%", paddingVertical: 12, alignItems: "center", backgroundColor: theme.neumorph.surface, borderRadius: theme.neumorph.radius, ...theme.neumorph.raisedSm }, pressed && { ...theme.neumorph.pressed }]}
        >
          <Text style={{ color: theme.textSecondary, fontWeight: theme.font.bold, fontSize: 15 }}>{t("notNow")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default LocationAccess;