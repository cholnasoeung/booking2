import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { shadowColors } from "@/constants/theme";
import { API_BASE_URL } from "@/lib/api";
import { useAuth } from "@/providers/auth-provider";

export default function ProfileScreen() {
  const router = useRouter();
  const { signOut, user } = useAuth();

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.profileCard}>
        <View style={styles.avatarBanner} />
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.slice(0, 1).toUpperCase() || "G"}</Text>
        </View>
        <Text style={styles.name}>{user?.name || "Guest traveler"}</Text>
        <Text style={styles.email}>{user?.email || "Sign in to sync mobile bookings"}</Text>
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

      {user ? (
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
      ) : (
        <View style={styles.actionStack}>
          <AnimatedPressable onPress={() => router.push("/login" as Href)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Login</Text>
          </AnimatedPressable>
          <AnimatedPressable onPress={() => router.push("/register" as Href)} style={styles.outlineButton}>
            <Text style={styles.outlineButtonText}>Create account</Text>
          </AnimatedPressable>
        </View>
      )}
    </ScrollView>
  );
}

function Feature({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color="#4338ca" />
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8f7ff",
  },
  content: {
    padding: 20,
    gap: 18,
  },
  profileCard: {
    alignItems: "center",
    gap: 10,
    borderRadius: 28,
    backgroundColor: "#ffffff",
    padding: 24,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  avatarBanner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    backgroundColor: "rgba(79, 70, 229, 0.08)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  avatar: {
    height: 80,
    width: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4f46e5",
    marginTop: 20,
    borderWidth: 3,
    borderColor: "#e0e7ff",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  name: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
  },
  email: {
    color: "#64748b",
    fontSize: 14,
    textAlign: "center",
  },
  infoCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    shadowColor: shadowColors.primary,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 2,
  },
  sectionTitle: {
    color: "#111827",
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
    color: "#334155",
    fontSize: 14,
    lineHeight: 20,
  },
  connectionText: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  connectionValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  connectionHint: {
    color: "#64748b",
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
    borderRadius: 16,
    backgroundColor: "#4f46e5",
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#ffffff",
  },
  outlineButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
});
