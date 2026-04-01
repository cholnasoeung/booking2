import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Href, useRouter } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { glass, gradients, shadowColors, Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import {
  formatBookingDate,
  formatCurrency,
  formatStatus,
  formatTravelDate,
} from "@/lib/formatters";
import { useAuth } from "@/providers/auth-provider";
import type { BookingSummary } from "@/types/booking";

type BookingsResponse = {
  bookings: BookingSummary[];
};

export default function BookingsScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [bookings, setBookings] = useState<BookingSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const confirmedCount = bookings.filter((booking) => booking.status === "confirmed").length;

  const heroStats = useMemo(
    () => [
      { label: "Total bookings", value: `${bookings.length}` },
      { label: "Confirmed", value: `${confirmedCount}` },
      {
        label: "Next trip",
        value:
          bookings[0]?.bus && bookings[0].bus.travelDate
            ? formatTravelDate(bookings[0].bus.travelDate)
            : "Plan a trip",
      },
    ],
    [bookings, confirmedCount]
  );

  const loadBookings = useCallback(
    async (isRefresh = false) => {
      if (!token) {
        setBookings([]);
        setError("");
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const payload = await apiFetch<BookingsResponse>("/api/mobile/bookings/me", {
          token,
        });

        setBookings(payload.bookings);
        setError("");
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load your bookings right now."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [token]
  );

  useFocusEffect(
    useCallback(() => {
      void loadBookings();
    }, [loadBookings])
  );

  if (!user) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.emptyHero}>
          <Ionicons name="ticket-outline" size={28} color={Colors.light.tint} />
          <Text style={styles.title}>Your mobile bookings will show up here.</Text>
          <Text style={styles.subtitle}>
            Sign in with the same account from your Next.js app to see upcoming trips and new
            bookings created on mobile.
          </Text>
          <AnimatedPressable onPress={() => router.push("/login" as Href)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Login to continue</Text>
          </AnimatedPressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={() => void loadBookings(true)} />
      }
    >
      <View style={styles.heroBanner}>
        <View style={styles.heroGlow} />
        <Text style={styles.title}>My bookings</Text>
        <Text style={styles.subtitle}>Signed in as {user.name}</Text>
        <View style={styles.heroStatsRow}>
          {heroStats.map((stat) => (
            <View style={styles.heroStatCard} key={stat.label}>
              <Text style={styles.heroStatValue}>{stat.value}</Text>
              <Text style={styles.heroStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={Colors.light.tint} />
          <Text style={styles.loadingText}>Loading your trips...</Text>
        </View>
      ) : error ? (
        <View style={styles.messageCard}>
          <Ionicons name="warning-outline" size={24} color={Colors.light.danger} />
          <Text style={styles.messageTitle}>Could not load bookings</Text>
          <Text style={styles.messageText}>{error}</Text>
          <AnimatedPressable onPress={() => void loadBookings()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </AnimatedPressable>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.messageCard}>
          <Ionicons name="bus-outline" size={24} color={Colors.light.tint} />
          <Text style={styles.messageTitle}>No bookings yet</Text>
          <Text style={styles.messageText}>
            Search a route and complete a passenger booking to see it listed here.
          </Text>
          <AnimatedPressable onPress={() => router.push("/" as Href)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Search departures</Text>
          </AnimatedPressable>
        </View>
      ) : (
        bookings.map((booking, index) => (
          <Animated.View
            key={booking.id}
            style={[styles.bookingCard, FadeInDown.delay(index * 50)]}
          >
            <View style={styles.bookingHeader}>
              <View>
                <Text style={styles.routeTitle}>
                  {booking.bus ? `${booking.bus.from} to ${booking.bus.to}` : "Route unavailable"}
                </Text>
                <Text style={styles.bookingId}>Booking ID: {booking.id}</Text>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  booking.status === "confirmed"
                    ? styles.statusBadgeSuccess
                    : styles.statusBadgeMuted,
                ]}
              >
                <View
                  style={[
                    styles.statusDot,
                    booking.status === "confirmed"
                      ? styles.statusDotSuccess
                      : styles.statusDotMuted,
                  ]}
                />
                <Text
                  style={[
                    styles.statusText,
                    booking.status === "confirmed"
                      ? styles.statusTextSuccess
                      : styles.statusTextMuted,
                  ]}
                >
                  {formatStatus(booking.status)}
                </Text>
              </View>
            </View>

            <View style={styles.statRow}>
              <Info label="Travel date" value={booking.bus ? formatTravelDate(booking.bus.travelDate) : "-"} />
              <Info
                label="Departure"
                value={booking.bus ? `${booking.bus.departureTime} - ${booking.bus.arrivalTime}` : "-"}
              />
            </View>

            <View style={styles.statRow}>
              <Info label="Seats" value={booking.seats.join(", ")} />
              <Info label="Booked on" value={formatBookingDate(booking.createdAt)} />
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatCurrency(booking.totalPrice)}</Text>
            </View>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoCard}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
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
  emptyHero: {
    borderRadius: 32,
    backgroundColor: palette.surface,
    padding: 24,
    gap: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: shadowColors.card,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 4,
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
    width: 190,
    height: 190,
    borderRadius: 140,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    top: -60,
    right: -40,
  },
  title: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
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
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    color: palette.muted,
    fontSize: 15,
  },
  messageCard: {
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    backgroundColor: palette.surface,
    padding: 22,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: shadowColors.card,
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 14,
    elevation: 3,
  },
  messageTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  messageText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  bookingCard: {
    borderRadius: 24,
    backgroundColor: palette.surface,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: shadowColors.card,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 4,
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  routeTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
  },
  bookingId: {
    color: palette.muted,
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  statusBadgeSuccess: {
    backgroundColor: "rgba(16, 185, 129, 0.18)",
  },
  statusBadgeMuted: {
    backgroundColor: "rgba(148, 163, 184, 0.18)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusDotSuccess: {
    backgroundColor: "#10b981",
  },
  statusDotMuted: {
    backgroundColor: "#94a3b8",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusTextSuccess: {
    color: "#0f7f48",
  },
  statusTextMuted: {
    color: palette.muted,
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: palette.highlight ?? "#f8fafc",
    padding: 12,
    gap: 4,
  },
  infoLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    color: palette.text,
    fontSize: 14,
    fontWeight: "700",
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  totalLabel: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  totalValue: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "800",
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    paddingHorizontal: 18,
    marginTop: 12,
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
  secondaryButton: {
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: palette.text,
    paddingHorizontal: 18,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
