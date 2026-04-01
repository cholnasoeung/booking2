import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
} from "react-native-reanimated";

import { AnimatedInput } from "@/components/ui/animated-input";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { animations } from "@/constants/animations";
import { shadowColors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import {
  formatBusType,
  formatCurrency,
  formatTravelDate,
  getTomorrowDateInput,
} from "@/lib/formatters";
import { useAuth } from "@/providers/auth-provider";
import type { BusSummary, BusType } from "@/types/booking";

type SearchResponse = {
  buses: BusSummary[];
};

const SORT_OPTIONS = [
  { value: "departure", label: "Departure" },
  { value: "price", label: "Price" },
] as const;

const POPULAR_AMENITIES = ["wifi", "ac", "usb", "restroom"] as const;

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [from, setFrom] = useState("Phnom Penh");
  const [to, setTo] = useState("Siem Reap");
  const [date, setDate] = useState(getTomorrowDateInput());
  const [passengers, setPassengers] = useState("1");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["value"]>("departure");
  const [busTypeFilter, setBusTypeFilter] = useState<BusType | "all">("all");
  const [amenityFilter, setAmenityFilter] = useState<string | "all">("all");
  const [results, setResults] = useState<BusSummary[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableBusTypes = useMemo(
    () => ["all", ...new Set(results.map((bus) => bus.busType))] as (BusType | "all")[],
    [results]
  );

  const filteredResults = useMemo(() => {
    const next = results.filter((bus) => {
      const matchesBusType = busTypeFilter === "all" || bus.busType === busTypeFilter;
      const matchesAmenity =
        amenityFilter === "all" || bus.amenities.some((item) => item === amenityFilter);

      return matchesBusType && matchesAmenity;
    });

    return next.sort((first, second) => {
      if (sortBy === "price") {
        return first.pricePerSeat - second.pricePerSeat;
      }

      return first.departureTime.localeCompare(second.departureTime);
    });
  }, [amenityFilter, busTypeFilter, results, sortBy]);

  async function handleSearch() {
    setLoading(true);
    setError("");
    setHasSearched(true);

    try {
      const params = new URLSearchParams({
        from,
        to,
        date,
        passengers: passengers || "1",
      });

      const payload = await apiFetch<SearchResponse>(`/api/buses?${params.toString()}`);
      setResults(payload.buses);
    } catch (searchError) {
      setResults([]);
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Unable to search buses right now."
      );
    } finally {
      setLoading(false);
    }
  }

  function swapRoute() {
    const nextFrom = to;
    setTo(from);
    setFrom(nextFrom);
  }

  function openBooking(busId: string) {
    router.push({
      pathname: "/booking/[busId]" as Href,
      params: {
        busId,
        passengers: passengers || "1",
      },
    } as Href);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.eyebrow}>Mobile passenger booking</Text>
        <Text style={styles.heroTitle}>Search, filter, and book the next trip from your phone.</Text>
        <Text style={styles.heroText}>
          Connects to your Next.js booking backend so the mobile app shares the same departures
          and bookings.
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.metaBadge}>
            <Ionicons name="flash-outline" size={16} color="#4338ca" />
            <Text style={styles.metaBadgeText}>Live search</Text>
          </View>
          <View style={styles.metaBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#4338ca" />
            <Text style={styles.metaBadgeText}>{user ? `Signed in as ${user.name}` : "Secure auth"}</Text>
          </View>
        </View>
      </View>

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Search buses</Text>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>From</Text>
          <AnimatedInput
            value={from}
            onChangeText={setFrom}
            placeholder="Departure city"
          />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>To</Text>
          <AnimatedInput
            value={to}
            onChangeText={setTo}
            placeholder="Destination city"
          />
        </View>
        <AnimatedPressable onPress={swapRoute} style={styles.swapButton}>
          <Ionicons name="swap-vertical" size={18} color="#4f46e5" />
          <Text style={styles.swapButtonText}>Swap route</Text>
        </AnimatedPressable>
        <View style={styles.row}>
          <View style={[styles.fieldGroup, styles.rowField]}>
            <Text style={styles.fieldLabel}>Date</Text>
            <AnimatedInput
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              autoCapitalize="none"
            />
          </View>
          <View style={[styles.fieldGroup, styles.rowField]}>
            <Text style={styles.fieldLabel}>Passengers</Text>
            <AnimatedInput
              value={passengers}
              onChangeText={setPassengers}
              keyboardType="number-pad"
              placeholder="1"
            />
          </View>
        </View>
        <AnimatedPressable
          onPress={handleSearch}
          style={styles.primaryButton}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <>
              <Ionicons name="search" size={18} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Search departures</Text>
            </>
          )}
        </AnimatedPressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Filter results</Text>
        <Text style={styles.sectionHint}>Use the same trip data from your Next.js API.</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        {availableBusTypes.map((type) => (
          <Chip
            key={type}
            active={busTypeFilter === type}
            label={type === "all" ? "All buses" : formatBusType(type)}
            onPress={() => setBusTypeFilter(type)}
          />
        ))}
      </ScrollView>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
        <Chip
          active={amenityFilter === "all"}
          label="All amenities"
          onPress={() => setAmenityFilter("all")}
        />
        {POPULAR_AMENITIES.map((amenity) => (
          <Chip
            key={amenity}
            active={amenityFilter === amenity}
            label={amenity.toUpperCase()}
            onPress={() => setAmenityFilter(amenity)}
          />
        ))}
      </ScrollView>

      <View style={styles.segmentRow}>
        {SORT_OPTIONS.map((option) => (
          <AnimatedPressable
            key={option.value}
            onPress={() => setSortBy(option.value)}
            style={[styles.segmentButton, sortBy === option.value && styles.segmentButtonActive]}
          >
            <Text
              style={[
                styles.segmentButtonText,
                sortBy === option.value && styles.segmentButtonTextActive,
              ]}
            >
              {option.label}
            </Text>
          </AnimatedPressable>
        ))}
      </View>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {!hasSearched ? (
        <View style={styles.emptyState}>
          <Ionicons name="bus-outline" size={28} color="#6366f1" />
          <Text style={styles.emptyStateTitle}>Start with a route search</Text>
          <Text style={styles.emptyStateText}>
            Enter your cities, date, and passenger count to load departures from the web app.
          </Text>
        </View>
      ) : filteredResults.length === 0 && !loading ? (
        <View style={styles.emptyState}>
          <Ionicons name="filter-outline" size={28} color="#6366f1" />
          <Text style={styles.emptyStateTitle}>No departures match these filters</Text>
          <Text style={styles.emptyStateText}>
            Try another date, relax the filters, or switch the route to widen results.
          </Text>
        </View>
      ) : (
        filteredResults.map((bus, index) => (
          <Animated.View
            key={bus.id}
            style={[styles.resultCard, FadeInDown.delay(index * 50)]}
          >
            <View style={styles.resultHeader}>
              <View style={styles.resultHeaderText}>
                <Text style={styles.routeTitle}>
                  {bus.from} to {bus.to}
                </Text>
                <Text style={styles.routeSubtitle}>
                  {formatTravelDate(bus.travelDate)} • {formatBusType(bus.busType)}
                </Text>
              </View>
              <View style={styles.pricePill}>
                <Text style={styles.priceText}>{formatCurrency(bus.pricePerSeat)}</Text>
                <Text style={styles.priceSubtext}>per seat</Text>
              </View>
            </View>

            <View style={styles.statsRow}>
              <Stat label="Depart" value={bus.departureTime} />
              <Stat label="Arrive" value={bus.arrivalTime} />
              <Stat label="Seats left" value={String(bus.seatsLeft)} />
            </View>

            <Text style={styles.busDetailText}>
              {bus.busDetail?.name || "Fleet vehicle"} • {bus.duration} • {bus.distance} km
            </Text>

            <View style={styles.amenityWrap}>
              {bus.amenities.slice(0, 4).map((amenity) => (
                <View key={amenity} style={styles.amenityBadge}>
                  <Text style={styles.amenityText}>{amenity}</Text>
                </View>
              ))}
            </View>

            <AnimatedPressable onPress={() => openBooking(bus.id)} style={styles.secondaryButton}>
              <Text style={styles.secondaryButtonText}>Book passenger seats</Text>
              <Ionicons name="arrow-forward" size={18} color="#ffffff" />
            </AnimatedPressable>
          </Animated.View>
        ))
      )}
    </ScrollView>
  );
}

function Chip({
  active,
  label,
  onPress,
}: {
  active: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <AnimatedPressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </AnimatedPressable>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
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
  heroCard: {
    backgroundColor: "#312e81",
    borderRadius: 28,
    padding: 22,
    gap: 10,
  },
  eyebrow: {
    color: "#c7d2fe",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  heroText: {
    color: "#e0e7ff",
    fontSize: 15,
    lineHeight: 22,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 4,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  metaBadgeText: {
    color: "#3730a3",
    fontSize: 13,
    fontWeight: "600",
  },
  sectionCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    gap: 14,
    shadowColor: "#312e81",
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 20,
    elevation: 3,
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
  },
  sectionHint: {
    color: "#6b7280",
    fontSize: 13,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "700",
  },
  input: {
    borderWidth: 1,
    borderColor: "#dbe2f0",
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: "#0f172a",
    backgroundColor: "#f8fafc",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  rowField: {
    flex: 1,
  },
  swapButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
  },
  swapButtonText: {
    color: "#4338ca",
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: "#4f46e5",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  chipRow: {
    gap: 10,
    paddingRight: 12,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#dbe2f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  chipText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#ffffff",
  },
  segmentRow: {
    flexDirection: "row",
    borderRadius: 16,
    padding: 4,
    backgroundColor: "#e2e8f0",
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: "#ffffff",
  },
  segmentButtonText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "700",
  },
  segmentButtonTextActive: {
    color: "#111827",
  },
  errorText: {
    color: "#dc2626",
    fontSize: 14,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#dbe2f0",
    backgroundColor: "#ffffff",
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  emptyStateTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyStateText: {
    color: "#6b7280",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  resultCard: {
    backgroundColor: "#ffffff",
    borderRadius: 24,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  resultHeaderText: {
    flex: 1,
    gap: 4,
  },
  routeTitle: {
    color: "#0f172a",
    fontSize: 22,
    fontWeight: "800",
  },
  routeSubtitle: {
    color: "#64748b",
    fontSize: 14,
  },
  pricePill: {
    alignItems: "flex-end",
    borderRadius: 16,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  priceText: {
    color: "#4338ca",
    fontSize: 18,
    fontWeight: "800",
  },
  priceSubtext: {
    color: "#6366f1",
    fontSize: 11,
    fontWeight: "600",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 18,
    backgroundColor: "#f8fafc",
    padding: 12,
    gap: 4,
    shadowColor: shadowColors.card,
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    elevation: 2,
  },
  statLabel: {
    color: "#64748b",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  statValue: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  busDetailText: {
    color: "#475569",
    fontSize: 14,
    lineHeight: 20,
  },
  amenityWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  amenityBadge: {
    borderRadius: 999,
    backgroundColor: "#f1f5f9",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  amenityText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
  },
  secondaryButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
  },
});
