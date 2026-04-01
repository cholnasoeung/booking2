import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { Href, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
        <View style={styles.heroCard}>
          <Ionicons name="ticket-outline" size={28} color="#4338ca" />
          <Text style={styles.heroTitle}>Your mobile bookings will show up here.</Text>
          <Text style={styles.heroText}>
            Sign in with the same account from your Next.js app to see upcoming trips and new
            bookings created on mobile.
          </Text>
          <Pressable onPress={() => router.push("/login" as Href)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Login to continue</Text>
          </Pressable>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadBookings(true)} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>My bookings</Text>
        <Text style={styles.subtitle}>Signed in as {user.name}</Text>
      </View>

      {loading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color="#4f46e5" />
          <Text style={styles.loadingText}>Loading your trips...</Text>
        </View>
      ) : error ? (
        <View style={styles.messageCard}>
          <Ionicons name="warning-outline" size={24} color="#dc2626" />
          <Text style={styles.messageTitle}>Could not load bookings</Text>
          <Text style={styles.messageText}>{error}</Text>
          <Pressable onPress={() => void loadBookings()} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonText}>Try again</Text>
          </Pressable>
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.messageCard}>
          <Ionicons name="bus-outline" size={24} color="#4338ca" />
          <Text style={styles.messageTitle}>No bookings yet</Text>
          <Text style={styles.messageText}>
            Search a route and complete a passenger booking to see it listed here.
          </Text>
          <Pressable onPress={() => router.push("/" as Href)} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Search departures</Text>
          </Pressable>
        </View>
      ) : (
        bookings.map((booking) => (
          <View key={booking.id} style={styles.bookingCard}>
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
                  booking.status === "confirmed" ? styles.statusBadgeSuccess : styles.statusBadgeMuted,
                ]}
              >
                <Text
                  style={[
                    styles.statusText,
                    booking.status === "confirmed" ? styles.statusTextSuccess : styles.statusTextMuted,
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
          </View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f8f7ff",
  },
  content: {
    padding: 20,
    gap: 18,
  },
  header: {
    gap: 4,
  },
  title: {
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
  },
  subtitle: {
    color: "#6b7280",
    fontSize: 14,
  },
  heroCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  heroTitle: {
    color: "#111827",
    fontSize: 22,
    fontWeight: "800",
    lineHeight: 28,
  },
  heroText: {
    color: "#64748b",
    fontSize: 15,
    lineHeight: 22,
  },
  primaryButton: {
    minHeight: 50,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 18,
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
    backgroundColor: "#111827",
    paddingHorizontal: 18,
    alignSelf: "stretch",
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
  loadingState: {
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 40,
  },
  loadingText: {
    color: "#475569",
    fontSize: 15,
  },
  messageCard: {
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 22,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  messageTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  messageText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  bookingCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  bookingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  routeTitle: {
    color: "#0f172a",
    fontSize: 20,
    fontWeight: "700",
  },
  bookingId: {
    color: "#64748b",
    fontSize: 12,
    marginTop: 4,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  statusBadgeSuccess: {
    backgroundColor: "#dcfce7",
  },
  statusBadgeMuted: {
    backgroundColor: "#e2e8f0",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusTextSuccess: {
    color: "#166534",
  },
  statusTextMuted: {
    color: "#475569",
  },
  statRow: {
    flexDirection: "row",
    gap: 10,
  },
  infoCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    padding: 12,
    gap: 4,
  },
  infoLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  infoValue: {
    color: "#0f172a",
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
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  totalValue: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "800",
  },
});
