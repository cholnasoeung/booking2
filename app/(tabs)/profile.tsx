import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { API_BASE_URL } from "@/lib/api";
import { glass, gradients, Colors, shadowColors } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();

  const heroStats = [
    { label: "Synced trips", value: "Live" },
    { label: "Secure auth", value: "Enabled" },
    { label: "Support", value: "24/7" },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroBanner}>
        <View style={styles.heroGlow} />
        <View style={styles.avatarWrapper}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.slice(0, 1).toUpperCase() || "G"}</Text>
          </View>
          <Ionicons name="shield-checkmark" size={18} color="#ffffff" style={styles.heroIcon} />
        </View>
        <Text style={styles.name}>{user?.name || "Guest traveler"}</Text>
        <Text style={styles.email}>
          {user?.email || "Sign in to sync mobile bookings and share trips across devices"}
        </Text>
        <View style={styles.heroStatsRow}>
          {heroStats.map((stat) => (
            <View style={styles.heroStatCard} key={stat.label}>
              <Text style={styles.heroStatValue}>{stat.value}</Text>
              <Text style={styles.heroStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>What this mobile app can do</Text>
        <Feature icon="search-outline" text="Search departures from the shared Next.js API" />
        <Feature icon="options-outline" text="Filter by bus type, amenity, and sort order" />
        <Feature icon="people-outline" text="Collect passenger details before checkout" />
        <Feature icon="lock-closed-outline" text="Use mobile login and registration against the web app" />
      </View>

      <View style={styles.infoCard}>
        <Text style={styles.sectionTitle}>Connection</Text>
        <Text style={styles.connectionText}>API base URL</Text>
        <Text style={styles.connectionValue}>{API_BASE_URL}</Text>
        <Text style={styles.connectionHint}>
          If you run on a real device, set `EXPO_PUBLIC_API_BASE_URL` so the app can reach your
          Next.js server.
        </Text>
      </View>

      <View style={styles.actionStack}>
        <AnimatedPressable onPress={() => router.push("/(tabs)/bookings" as Href)} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>View my bookings</Text>
        </AnimatedPressable>
        <AnimatedPressable
          onPress={() => {
            void signOut();
          }}
          style={styles.outlineButton}
        >
          <Text style={styles.outlineButtonText}>Log out</Text>
        </AnimatedPressable>
      </View>
    </ScrollView>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={Colors.light.tint} />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 48,
  },
  heroBanner: {
    borderRadius: 32,
    backgroundColor: gradients.hero[0],
    padding: 24,
    overflow: "hidden",
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 150,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    top: -60,
    right: -40,
  },
  avatarWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  heroIcon: {
    marginTop: 8,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.5)",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  name: {
    color: "#ffffff",
    fontSize: 26,
    fontWeight: "800",
    marginTop: 12,
  },
  email: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: glass.light.background,
    borderWidth: 1,
    borderColor: glass.light.border,
    padding: 12,
    alignItems: "center",
  },
  heroStatValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  heroStatLabel: {
    color: palette.muted,
    fontSize: 11,
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: "uppercase",
  },
  infoCard: {
    borderRadius: 24,
    backgroundColor: palette.surface,
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: shadowColors.card,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
    elevation: 3,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  featureText: {
    flex: 1,
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  connectionText: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  connectionValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  connectionHint: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  actionStack: {
    gap: 12,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    shadowColor: shadowColors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  outlineButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
  },
  outlineButtonText: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
});
