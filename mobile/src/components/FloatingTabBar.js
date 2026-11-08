import React from "react";
import { View, Text, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../theme/ThemeContext";
import Icon from "./Icon";

// Suzuvchi (floating) pastki menyu: markazda joylashgan ixcham panel,
// faol element yuqoriga doirада bo'rtib chiqadi + gesture indicator.
// Eslatma: panel rangi theme.surface emas, theme.card bo'lishi SHART —
// aks holda u fon bilan bir xil bo'lib butunlay ko'rinmay qoladi.
function FloatingTabBar({ state, descriptors, navigation, icons = {} }) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 10);

  // Faol element uchun yuqoriga chiqish (bo'rtish)
  const BULGE = 16;

  // Yashirin route faol bo'lsa, hech bir ko'rinadigan tab aktiv bo'lib qolmasin.
  // Bunday holatda birinchi ko'rinadigan tab (Home) faol ko'rsatiladi.
  const visible = state.routes.filter((r) => !descriptors[r.key].options.tabBarHidden);
  const focusedRoute = state.routes[state.index];
  const activeIndex = descriptors[focusedRoute.key].options.tabBarHidden
    ? Math.max(0, visible.findIndex((r) => r.name === "Home"))
    : state.index;

  const panelBg = theme.mode === "dark" ? theme.card : "#FFFFFF";
  const panelBorder = theme.mode === "dark" ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.08)";
  const panelShadow = theme.mode === "dark"
    ? { shadowColor: "#000", shadowOpacity: 0.55, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 }
    : { shadowColor: "#0F172A", shadowOpacity: 0.16, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 12 };

  return (
    <View
      pointerEvents="box-none"
      style={{ alignItems: "center", paddingBottom: bottomPad, paddingTop: BULGE + 10 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: panelBg,
          borderRadius: 24,
          paddingVertical: 7,
          paddingHorizontal: 6,
          borderWidth: 1,
          borderColor: panelBorder,
          ...panelShadow,
        }}
      >
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          if (options.tabBarHidden) return null;
          const focused = activeIndex === index;
          const badge = options.tabBarBadge;
          const label = options.tabBarLabel ?? options.title ?? route.name;

          const onPress = () => {
            const event = navigation.emit({
              type: "tabPress",
              target: route.key,
              canPreventDefault: true,
            });
            if (!focused && !event.defaultPrevented) {
              navigation.navigate(route.name, route.params);
            }
          };

          return (
            <Pressable
              key={route.key}
              onPress={onPress}
              hitSlop={6}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              accessibilityLabel={typeof label === "string" ? label : options.title}
              style={{
                alignItems: "center",
                justifyContent: "flex-start",
                paddingHorizontal: 3,
                marginTop: focused ? -BULGE : 0,
              }}
            >
              {/* Faol element panel chegarasidan yuqoriga doirада bo'rtib chiqadi */}
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 19,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: focused ? theme.primary : "transparent",
                  ...(focused
                    ? { shadowColor: theme.primary, shadowOpacity: 0.5, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7 }
                    : null),
                }}
              >
                <Icon
                  name={icons[route.name] || "circle"}
                  size={19}
                  color={focused ? theme.textInverse : theme.textTertiary}
                />
                {badge ? (
                  <View
                    style={{
                      position: "absolute",
                      top: -1,
                      right: -1,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      paddingHorizontal: 3.5,
                      backgroundColor: theme.error,
                      borderWidth: 1.5,
                      borderColor: panelBg,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ color: theme.textInverse, fontSize: 9, fontWeight: "800" }}>
                      {badge > 99 ? "99+" : badge}
                    </Text>
                  </View>
                ) : null}
              </View>

              <Text
                numberOfLines={1}
                style={{
                  marginTop: 3,
                  fontSize: 9.5,
                  fontWeight: focused ? "800" : "600",
                  color: focused ? theme.primary : theme.textTertiary,
                }}
              >
                {typeof label === "string" ? label : ""}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Gesture indikator chizig'i */}
      <View
        style={{
          marginTop: 6,
          width: 108,
          height: 4,
          borderRadius: 2,
          backgroundColor: theme.textTertiary,
          opacity: 0.35,
        }}
      />
    </View>
  );
}

export default FloatingTabBar;
