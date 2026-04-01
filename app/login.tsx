import { Ionicons } from "@expo/vector-icons";
import { Href, Link, useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { AnimatedInput } from "@/components/ui/animated-input";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { glass, gradients, Colors, shadowColors } from "@/constants/theme";
import { useAuth } from "@/providers/auth-provider";

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirectTo?: string | string[] }>();
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = Array.isArray(params.redirectTo) ? params.redirectTo[0] : params.redirectTo;

  async function handleLogin() {
    setSubmitting(true);
    setError("");

    try {
      await signIn({ email, password });
      router.replace((redirectTo || "/(tabs)/bookings") as Href);
    } catch (loginError) {
      setError(
        loginError instanceof Error ? loginError.message : "Unable to sign you in right now."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.select({ ios: "padding", android: undefined })}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.heroBanner}>
          <Ionicons name="bus" size={36} color="#ffffff" />
          <Text style={styles.heroEyebrow}>Secure login</Text>
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroText}>
            Sign in with the account from your Next.js booking platform.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <AnimatedInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <AnimatedInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Enter your password"
            />
          </View>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <AnimatedPressable
            onPress={() => void handleLogin()}
            style={styles.primaryButton}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Login</Text>
            )}
          </AnimatedPressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>New here?</Text>
            <Link
              href={{
                pathname: "/register" as Href,
                params: redirectTo ? { redirectTo } : undefined,
              } as Href}
              style={styles.footerLink}
            >
              Create an account
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const palette = Colors.light;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  heroBanner: {
    borderRadius: 32,
    backgroundColor: gradients.hero[0],
    padding: 24,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.4)",
    shadowColor: shadowColors.card,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 12 },
    shadowRadius: 30,
    elevation: 5,
  },
  heroEyebrow: {
    color: "rgba(255, 255, 255, 0.75)",
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1.2,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  heroText: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 14,
    lineHeight: 20,
  },
  formCard: {
    borderRadius: 28,
    backgroundColor: glass.light.background,
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: glass.light.border,
    shadowColor: shadowColors.card,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 5,
  },
  fieldGroup: {
    gap: 8,
  },
  label: {
    color: palette.muted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    marginTop: 4,
    shadowColor: shadowColors.primary,
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    gap: 6,
  },
  footerText: {
    color: palette.muted,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: "700",
  },
});
