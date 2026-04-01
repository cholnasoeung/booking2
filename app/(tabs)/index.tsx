import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { AnimatedInput } from "@/components/ui/animated-input";
import { AnimatedPressable } from "@/components/ui/animated-pressable";
import { glass, gradients, shadowColors, Colors } from "@/constants/theme";
import { apiFetch } from "@/lib/api";
import {
  formatBusType,
  formatCurrency,
  formatTravelDate,
  getTomorrowDateInput,
} from "@/lib/formatters";
import { useAuth } from "@/providers/auth-provider";
import type { BusSummary, BusType } from "@/types/booking";

const SORT_OPTIONS = [
  { value: "departure", label: "Departure" },
  { value: "price", label: "Price" },
] as const;

const POPULAR_AMENITIES = ["wifi", "ac", "usb", "restroom"] as const;

type SearchResponse = {
  buses: BusSummary[];
};

export default function SearchScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [from, setFrom] = useState("Phnom Penh");
  const [to, setTo] = useState("Siem Reap");
  const [date, setDate] = useState(getTomorrowDateInput());
  const [passengers, setPassengers] = useState("1");
  const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]["value"]>(
    "departure"
  );
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

  const heroMetrics = [
    { label: "Live departures", value: `${results.length}` },
    { label: "Passengers", value: `${passengers || "1"} pax` },
    { label: "Departure", value: formatTravelDate(date) },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <View style={styles.heroGlowOne} />
        <View style={styles.heroGlowTwo} />
        <Text style={styles.eyebrow}>mobile passenger booking</Text>
        <Text style={styles.heroTitle}>
          Search, filter, and book the next trip from your phone.
        </Text>
        <Text style={styles.heroText}>
          Connects to your Next.js booking backend so the mobile app shares the same departures
          and bookings.
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.metaBadge}>
            <Ionicons name="flash-outline" size={16} color="#ffffff" />
            <Text style={styles.metaBadgeText}>Live search</Text>
          </View>
          <View style={styles.metaBadge}>
            <Ionicons name="shield-checkmark-outline" size={16} color="#ffffff" />
            <Text style={styles.metaBadgeText}>
              {user ? `Signed in as ${user.name}` : "Secure auth"}
            </Text>
          </View>
        </View>
        <View style={styles.heroStatsRow}>
          {heroMetrics.map((metric) => (
            <HeroMetric key={metric.label} label={metric.label} value={metric.value} />
          ))}
        </View>
      </View>

      <View style={styles.searchCard}>
        <Text style={styles.searchTitle}>Plan your next trip</Text>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>From</Text>
          <AnimatedInput value={from} onChangeText={setFrom} placeholder="Departure city" />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>To</Text>
          <AnimatedInput value={to} onChangeText={setTo} placeholder="Destination city" />
        </View>
        <AnimatedPressable onPress={swapRoute} style={styles.swapButton}>
          <Ionicons name="swap-vertical" size={18} color={Colors.light.tint} />
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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {availableBusTypes.map((type) => (
          <Chip
            key={type}
            active={busTypeFilter === type}
            label={type === "all" ? "All buses" : formatBusType(type)}
            onPress={() => setBusTypeFilter(type)}
          />
        ))}
      </ScrollView>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
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
          <Ionicons name="bus-outline" size={28} color={Colors.light.tint} />
          <Text style={styles.emptyStateTitle}>Start with a route search</Text>
          <Text style={styles.emptyStateText}>
            Enter your cities, date, and passenger count to load departures from the web app.
          </Text>
        </View>
      ) : filteredResults.length === 0 && !loading ? (
        <View style={[styles.emptyState, styles.emptyStateAlt]}>
          <Ionicons name="filter-outline" size={28} color={Colors.light.tint} />
          <Text style={styles.emptyStateTitle}>No departures match these filters</Text>
          <Text style={styles.emptyStateText}>
            Try another date, relax the filters, or switch the route to widen results.
          </Text>
        </View>
      ) : (
        filteredResults.map((bus, index) => (
          <Animated.View key={bus.id} style={[styles.resultCard, FadeInDown.delay(index * 50)]}>
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

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.heroStatCard}>
      <Text style={styles.heroStatValue}>{value}</Text>
      <Text style={styles.heroStatLabel}>{label}</Text>
    </View>
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

const palette = Colors.light;

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: palette.background,
  },
  content: {
    padding: 20,
    gap: 18,
    paddingBottom: 50,
  },
  heroCard: {
    borderRadius: 32,
    padding: 24,
    backgroundColor: gradients.hero[0],
    overflow: "hidden",
    position: "relative",
    minHeight: 220,
  },
  heroGlowOne: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 140,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    top: -60,
    right: -40,
  },
  heroGlowTwo: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 120,
    backgroundColor: "rgba(79, 70, 229, 0.4)",
    bottom: -50,
    left: -60,
  },
  eyebrow: {
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 1.1,
    fontSize: 12,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
    lineHeight: 34,
  },
  heroText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 10,
  },
  heroMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  metaBadgeText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  heroStatsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  heroStatCard: {
    flex: 1,
    borderRadius: 18,
    padding: 12,
    backgroundColor: glass.light.background,
    borderWidth: 1,
    borderColor: glass.light.border,
    minHeight: 70,
  },
  heroStatValue: {
    color: palette.text,
    fontSize: 16,
    fontWeight: "700",
  },
  heroStatLabel: {
    color: palette.muted,
    fontSize: 11,
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  searchCard: {
    borderRadius: 28,
    backgroundColor: palette.surface,
    padding: 20,
    gap: 14,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: shadowColors.card,
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 20,
    elevation: 4,
  },
  searchTitle: {
    color: palette.text,
    fontSize: 20,
    fontWeight: "700",
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    color: palette.muted,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.4,
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
    backgroundColor: palette.highlight,
    borderWidth: 1,
    borderColor: palette.border,
  },
  swapButtonText: {
    color: Colors.light.tint,
    fontSize: 14,
    fontWeight: "700",
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 18,
    backgroundColor: Colors.light.tint,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
    shadowColor: shadowColors.primary,
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 25,
    elevation: 5,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  sectionHeader: {
    gap: 4,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
  },
  sectionHint: {
    color: palette.muted,
    fontSize: 13,
  },
  chipRow: {
    gap: 10,
    paddingRight: 12,
    paddingBottom: 4,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  chipActive: {
    borderColor: Colors.light.tint,
    backgroundColor: Colors.light.tint,
  },
  chipText: {
    color: palette.muted,
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
    backgroundColor: palette.highlight,
  },
  segmentButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentButtonActive: {
    backgroundColor: palette.surface,
  },
  segmentButtonText: {
    color: palette.muted,
    fontSize: 14,
    fontWeight: "700",
  },
  segmentButtonTextActive: {
    color: palette.text,
  },
  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  emptyState: {
    alignItems: "center",
    gap: 10,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  emptyStateAlt: {
    backgroundColor: glass.light.background,
  },
  emptyStateTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyStateText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  resultCard: {
    borderRadius: 28,
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
    color: palette.text,
    fontSize: 22,
    fontWeight: "800",
  },
  routeSubtitle: {
    color: palette.muted,
    fontSize: 14,
  },
  pricePill: {
    alignItems: "flex-end",
    borderRadius: 18,
    backgroundColor: palette.highlight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  priceText: {
    color: Colors.light.tint,
    fontSize: 18,
    fontWeight: "800",
  },
  priceSubtext: {
    color: palette.muted,
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
    backgroundColor: palette.highlight,
    padding: 12,
    gap: 4,
  },
  statLabel: {
    color: palette.muted,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  busDetailText: {
    color: palette.muted,
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
    backgroundColor: palette.highlight,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  amenityText: {
    color: palette.text,
    fontSize: 12,
    fontWeight: "600",
  },
  secondaryButton: {
    minHeight: 50,
    borderRadius: 18,
    backgroundColor: palette.text,
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
