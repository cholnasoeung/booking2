import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { Colors } from "@/constants/theme";

export interface PromotionBannerProps {
  code: string;
  discount: string | number;
  description?: string;
  expiresIn?: string;
  onDismiss?: () => void;
  backgroundColor?: string;
  icon?: string;
}

export function PromotionBanner({
  code,
  discount,
  description = "Use this code for special savings",
  expiresIn,
  onDismiss,
  backgroundColor = "#dc2626", // Red Bus red color
  icon = "flame",
}: PromotionBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  const discountText = useMemo(() => {
    if (typeof discount === "number") {
      return `${discount}% OFF`;
    }
    return discount;
  }, [discount]);

  return (
    <Animated.View
      style={[styles.container, { backgroundColor }]}
      entering={FadeInDown.springify().damping(12)}
      exiting={FadeOutUp.springify()}
    >
      <View style={styles.content}>
        <View style={styles.iconWrapper}>
          <Ionicons name={icon as any} size={20} color="#ffffff" />
        </View>

        <View style={styles.textContent}>
          <Text style={styles.discountText}>{discountText}</Text>
          <Text style={styles.description}>{description}</Text>

          <View style={styles.codeRow}>
            <View style={styles.codeBadge}>
              <Text style={styles.codeText}>{code}</Text>
            </View>
            {expiresIn && <Text style={styles.expiresText}>{expiresIn}</Text>}
          </View>
        </View>

        <AnimatedPressable onPress={handleDismiss} style={styles.closeButton}>
          <Ionicons name="close" size={22} color="#ffffff" />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

export function PromotionBannerCompact({
  code,
  discount,
  onDismiss,
  backgroundColor = "#dc2626",
}: Omit<PromotionBannerProps, "description" | "icon">) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  if (dismissed) return null;

  return (
    <Animated.View
      style={[styles.compactContainer, { backgroundColor }]}
      entering={FadeInDown.springify().damping(12)}
      exiting={FadeOutUp.springify()}
    >
      <View style={styles.compactContent}>
        <View style={styles.compactTextGroup}>
          <Text style={styles.compactDiscount}>{discount}</Text>
          <Text style={styles.compactCode}>{code}</Text>
        </View>
        <AnimatedPressable onPress={handleDismiss} style={styles.compactCloseButton}>
          <Ionicons name="close" size={18} color="#ffffff" />
        </AnimatedPressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 8,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  textContent: {
    flex: 1,
    gap: 4,
  },
  discountText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  description: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 18,
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  codeBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  codeText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    fontFamily: "monospace",
  },
  expiresText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 11,
    fontWeight: "500",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Compact variant styles
  compactContainer: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 8,
    elevation: 3,
  },
  compactContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  compactTextGroup: {
    flex: 1,
    gap: 2,
  },
  compactDiscount: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  compactCode: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 11,
    fontWeight: "600",
    fontFamily: "monospace",
  },
  compactCloseButton: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
});
