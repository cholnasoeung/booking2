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

export default function RegisterScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ redirectTo?: string | string[] }>();
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const redirectTo = Array.isArray(params.redirectTo) ? params.redirectTo[0] : params.redirectTo;

  async function handleRegister() {
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      await register({ name, email, password, phone });
      router.replace((redirectTo || "/(tabs)/bookings") as Href);
    } catch (registerError) {
      setError(
        registerError instanceof Error
          ? registerError.message
          : "Unable to create your account right now."
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
          <Ionicons name="person-add" size={36} color="#ffffff" />
          <Text style={styles.heroEyebrow}>Secure onboarding</Text>
          <Text style={styles.heroTitle}>Create account</Text>
          <Text style={styles.heroText}>
            Register once and use the same credentials across web and mobile booking.
          </Text>
        </View>

        <View style={styles.formCard}>
          <View style={styles.progressDots}>
            {Array.from({ length: 5 }).map((_, index) => (
              <View key={index} style={styles.dot} />
            ))}
          </View>

          <Field label="Full name" value={name} onChangeText={setName} placeholder="Your name" />
          <Field
            label="Phone number"
            value={phone}
            onChangeText={setPhone}
            placeholder="Optional phone"
            keyboardType="phone-pad"
          />
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          <Field
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="At least 6 characters"
            secureTextEntry
          />
          <Field
            label="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
            secureTextEntry
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <AnimatedPressable
            onPress={() => void handleRegister()}
            style={styles.primaryButton}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.primaryButtonText}>Register</Text>
            )}
          </AnimatedPressable>

          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account?</Text>
            <Link
              href={{
                pathname: "/login" as Href,
                params: redirectTo ? { redirectTo } : undefined,
              } as Href}
              style={styles.footerLink}
            >
              Login
            </Link>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "email-address" | "phone-pad";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <AnimatedInput {...inputProps} />
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
    flexGrow: 1,
    justifyContent: "center",
    padding: 20,
    gap: 20,
    paddingBottom: 60,
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
  progressDots: {
    flexDirection: "row",
    gap: 6,
    justifyContent: "center",
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.border,
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
