import { Ionicons } from "@expo/vector-icons";
import { Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewStyle,
} from "react-native";

import { apiFetch } from "@/lib/api";
import { formatBusType, formatCurrency, formatTravelDate } from "@/lib/formatters";
import { useAuth } from "@/providers/auth-provider";
import type { BusStop, BusSummary, Passenger, SeatLayoutItem } from "@/types/booking";

type BusResponse = {
  bus: BusSummary;
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
] as const;

export default function BookingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ busId?: string | string[]; passengers?: string | string[] }>();
  const { token, user } = useAuth();
  const [bus, setBus] = useState<BusSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [passengerForms, setPassengerForms] = useState<Passenger[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [selectedBoardingStop, setSelectedBoardingStop] = useState("");
  const [selectedDroppingStop, setSelectedDroppingStop] = useState("");

  const busId = Array.isArray(params.busId) ? params.busId[0] : params.busId;
  const requestedPassengers = clampPassengerCount(
    Array.isArray(params.passengers) ? params.passengers[0] : params.passengers
  );

  useEffect(() => {
    if (!busId) {
      setLoading(false);
      setError("Missing bus ID.");
      return;
    }

    let active = true;

    async function loadBus() {
      setLoading(true);
      setError("");

      try {
        const payload = await apiFetch<BusResponse>(`/api/buses/${busId}`);

        if (!active) {
          return;
        }

        setBus(payload.bus);
      } catch (requestError) {
        if (!active) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load bus details right now."
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadBus();

    return () => {
      active = false;
    };
  }, [busId]);

  const boardingStops = useMemo(() => bus?.stops.filter((stop) => stop.boarding) ?? [], [bus]);
  const droppingStops = useMemo(() => bus?.stops.filter((stop) => stop.dropping) ?? [], [bus]);

  useEffect(() => {
    if (!selectedBoardingStop && boardingStops.length > 0) {
      setSelectedBoardingStop(boardingStops[0].location);
    }
  }, [boardingStops, selectedBoardingStop]);

  useEffect(() => {
    if (!selectedDroppingStop && droppingStops.length > 0) {
      setSelectedDroppingStop(droppingStops[0].location);
    }
  }, [droppingStops, selectedDroppingStop]);

  useEffect(() => {
    setPassengerForms((current) =>
      selectedSeats.map((seatCode, index) => {
        const existing = current.find((passenger) => passenger.id === seatCode);

        return {
          id: seatCode,
          name: existing?.name ?? (index === 0 ? user?.name ?? "" : ""),
          age: existing?.age ?? "",
          gender: existing?.gender ?? "other",
          contactNumber: existing?.contactNumber ?? (index === 0 ? user?.phone ?? "" : ""),
          email: existing?.email ?? (index === 0 ? user?.email ?? "" : ""),
        };
      })
    );
  }, [selectedSeats, user]);

  const seatRows = useMemo(() => {
    if (!bus) {
      return [];
    }

    return Array.from({ length: bus.seatLayout.grid.rows }, (_, index) => index + 1).map((row) =>
      bus.seatLayout.items
        .filter((item) => item.row === row)
        .sort((first, second) => first.col - second.col)
    );
  }, [bus]);

  const totalPrice = (bus?.pricePerSeat ?? 0) * selectedSeats.length;

  function toggleSeat(seatCode: string) {
    if (!bus) {
      return;
    }

    const isUnavailable =
      bus.bookedSeats.includes(seatCode) || bus.blockedSeats.includes(seatCode);

    if (isUnavailable) {
      return;
    }

    setSubmitError("");

    setSelectedSeats((current) => {
      if (current.includes(seatCode)) {
        return current.filter((seat) => seat !== seatCode);
      }

      if (current.length >= requestedPassengers) {
        Alert.alert(
          "Seat limit reached",
          `This booking is set for ${requestedPassengers} passenger${requestedPassengers > 1 ? "s" : ""}.`
        );
        return current;
      }

      return [...current, seatCode];
    });
  }

  function updatePassenger(seatCode: string, field: keyof Passenger, value: string) {
    setPassengerForms((current) =>
      current.map((passenger) =>
        passenger.id === seatCode ? { ...passenger, [field]: value } : passenger
      )
    );

    const errorKey = `${seatCode}-${field}`;

    if (fieldErrors[errorKey]) {
      setFieldErrors((current) => {
        const next = { ...current };
        delete next[errorKey];
        return next;
      });
    }
  }

  function validatePassengerForms() {
    const nextErrors: Record<string, string> = {};

    if (selectedSeats.length !== requestedPassengers) {
      setSubmitError(
        `Select ${requestedPassengers} seat${requestedPassengers > 1 ? "s" : ""} before booking.`
      );
      return false;
    }

    passengerForms.forEach((passenger) => {
      if (!passenger.name.trim()) {
        nextErrors[`${passenger.id}-name`] = "Name is required.";
      }

      if (!passenger.age.trim()) {
        nextErrors[`${passenger.id}-age`] = "Age is required.";
      } else {
        const numericAge = Number(passenger.age);

        if (!Number.isInteger(numericAge) || numericAge < 1 || numericAge > 120) {
          nextErrors[`${passenger.id}-age`] = "Enter an age between 1 and 120.";
        }
      }

      if (!/^\d{9,15}$/.test(passenger.contactNumber.replace(/\s/g, ""))) {
        nextErrors[`${passenger.id}-contactNumber`] = "Enter a valid phone number.";
      }
    });

    if (!selectedBoardingStop && boardingStops.length > 0) {
      setSubmitError("Choose a boarding stop.");
      setFieldErrors(nextErrors);
      return false;
    }

    if (!selectedDroppingStop && droppingStops.length > 0) {
      setSubmitError("Choose a dropping stop.");
      setFieldErrors(nextErrors);
      return false;
    }

    setFieldErrors(nextErrors);
    setSubmitError("");
    return Object.keys(nextErrors).length === 0;
  }

  async function submitBooking() {
    if (!bus || !token) {
      return;
    }

    if (!validatePassengerForms()) {
      return;
    }

    setSubmitting(true);
    setSubmitError("");

    try {
      const payload = await apiFetch<{ bookingId: string }>("/api/mobile/bookings", {
        method: "POST",
        token,
        body: JSON.stringify({
          busId: bus.id,
          seats: selectedSeats,
          passengers: passengerForms,
          boardingStop: selectedBoardingStop || undefined,
          droppingStop: selectedDroppingStop || undefined,
        }),
      });

      Alert.alert("Booking confirmed", `Your booking ID is ${payload.bookingId}.`, [
        {
          text: "View bookings",
          onPress: () => router.replace("/(tabs)/bookings" as Href),
        },
      ]);
    } catch (requestError) {
      setSubmitError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to complete your booking right now."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function goToLogin() {
    const redirectTo = busId
      ? `/booking/${busId}?passengers=${requestedPassengers}`
      : "/(tabs)/bookings";

    router.push({
      pathname: "/login" as Href,
      params: { redirectTo },
    } as Href);
  }

  if (loading) {
    return (
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color="#4f46e5" />
        <Text style={styles.loadingText}>Loading passenger booking...</Text>
      </View>
    );
  }

  if (!bus || error) {
    return (
      <View style={styles.loadingState}>
        <Ionicons name="warning-outline" size={28} color="#dc2626" />
        <Text style={styles.errorTitle}>Unable to load this bus</Text>
        <Text style={styles.errorText}>{error || "Please try another departure."}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.busCard}>
        <Text style={styles.routeTitle}>
          {bus.from} to {bus.to}
        </Text>
        <Text style={styles.routeSubtitle}>
          {formatTravelDate(bus.travelDate)} • {bus.departureTime} to {bus.arrivalTime}
        </Text>
        <View style={styles.summaryRow}>
          <SummaryPill icon="bus-outline" label={formatBusType(bus.busType)} />
          <SummaryPill
            icon="people-outline"
            label={`${requestedPassengers} passenger${requestedPassengers > 1 ? "s" : ""}`}
          />
          <SummaryPill icon="cash-outline" label={formatCurrency(bus.pricePerSeat)} />
        </View>
      </View>

      {!user ? (
        <View style={styles.authCard}>
          <Ionicons name="lock-closed-outline" size={24} color="#4338ca" />
          <Text style={styles.authTitle}>Login required for booking</Text>
          <Text style={styles.authText}>
            Search is open to everyone, but confirming seats uses the secure account from your
            Next.js app.
          </Text>
          <Pressable onPress={goToLogin} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Login to continue</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              router.push({
                pathname: "/register" as Href,
                params: {
                  redirectTo: `/booking/${bus.id}?passengers=${requestedPassengers}`,
                },
              } as Href)
            }
            style={styles.outlineButton}
          >
            <Text style={styles.outlineButtonText}>Create account</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>1. Select seats</Text>
        <Text style={styles.sectionHint}>
          Pick {requestedPassengers} seat{requestedPassengers > 1 ? "s" : ""}. Unavailable seats
          are already booked.
        </Text>
        <View style={styles.legendRow}>
          <Legend color="#ffffff" borderColor="#cbd5e1" label="Available" />
          <Legend color="#4f46e5" borderColor="#4f46e5" label="Selected" />
          <Legend color="#cbd5e1" borderColor="#cbd5e1" label="Taken" />
        </View>
        <View style={styles.seatMap}>
          {seatRows.map((row, index) => (
            <View key={`row-${index}`} style={styles.seatRow}>
              {row.map((item) => (
                <SeatCell
                  key={item.id}
                  item={item}
                  bus={bus}
                  selectedSeats={selectedSeats}
                  onPress={toggleSeat}
                />
              ))}
            </View>
          ))}
        </View>
        <Text style={styles.selectedSeatText}>
          Selected seats: {selectedSeats.length > 0 ? selectedSeats.join(", ") : "None yet"}
        </Text>
      </View>

      {boardingStops.length > 0 ? (
        <StopPicker
          title="2. Choose boarding stop"
          stops={boardingStops}
          value={selectedBoardingStop}
          onChange={setSelectedBoardingStop}
        />
      ) : null}

      {droppingStops.length > 0 ? (
        <StopPicker
          title={boardingStops.length > 0 ? "3. Choose dropping stop" : "2. Choose dropping stop"}
          stops={droppingStops}
          value={selectedDroppingStop}
          onChange={setSelectedDroppingStop}
        />
      ) : null}

      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Passenger details</Text>
        <Text style={styles.sectionHint}>
          Fill the form for every selected seat before confirming the booking.
        </Text>
        {selectedSeats.length === 0 ? (
          <Text style={styles.sectionHint}>Select seats first to unlock the passenger form.</Text>
        ) : (
          passengerForms.map((passenger, index) => (
            <View key={passenger.id} style={styles.passengerCard}>
              <View style={styles.passengerHeader}>
                <View>
                  <Text style={styles.passengerTitle}>Passenger {index + 1}</Text>
                  <Text style={styles.passengerSubtitle}>Seat {passenger.id}</Text>
                </View>
                {index === 0 && user ? (
                  <View style={styles.youBadge}>
                    <Text style={styles.youBadgeText}>You</Text>
                  </View>
                ) : null}
              </View>

              <Field
                label="Full name"
                value={passenger.name}
                onChangeText={(value) => updatePassenger(passenger.id, "name", value)}
                error={fieldErrors[`${passenger.id}-name`]}
                placeholder="Passenger name"
              />
              <View style={styles.row}>
                <Field
                  label="Age"
                  value={passenger.age}
                  onChangeText={(value) => updatePassenger(passenger.id, "age", value)}
                  error={fieldErrors[`${passenger.id}-age`]}
                  placeholder="Age"
                  keyboardType="number-pad"
                  style={styles.rowField}
                />
                <Field
                  label="Phone"
                  value={passenger.contactNumber}
                  onChangeText={(value) => updatePassenger(passenger.id, "contactNumber", value)}
                  error={fieldErrors[`${passenger.id}-contactNumber`]}
                  placeholder="Phone number"
                  keyboardType="phone-pad"
                  style={styles.rowField}
                />
              </View>
              <Field
                label="Email"
                value={passenger.email ?? ""}
                onChangeText={(value) => updatePassenger(passenger.id, "email", value)}
                placeholder="Optional email"
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <View style={styles.genderGroup}>
                {GENDER_OPTIONS.map((option) => {
                  const active = passenger.gender === option.value;

                  return (
                    <Pressable
                      key={option.value}
                      onPress={() => updatePassenger(passenger.id, "gender", option.value)}
                      style={[styles.genderChip, active && styles.genderChipActive]}
                    >
                      <Text
                        style={[
                          styles.genderChipText,
                          active && styles.genderChipTextActive,
                        ]}
                      >
                        {option.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))
        )}
      </View>

      <View style={styles.checkoutCard}>
        <View>
          <Text style={styles.checkoutLabel}>Total amount</Text>
          <Text style={styles.checkoutValue}>{formatCurrency(totalPrice)}</Text>
        </View>
        <Pressable
          onPress={() => {
            if (!user) {
              goToLogin();
              return;
            }

            void submitBooking();
          }}
          style={[styles.primaryButton, submitting && styles.primaryButtonDisabled]}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>Confirm booking</Text>
          )}
        </Pressable>
      </View>

      {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}
    </ScrollView>
  );
}

function SeatCell({
  item,
  bus,
  selectedSeats,
  onPress,
}: {
  item: SeatLayoutItem;
  bus: BusSummary;
  selectedSeats: string[];
  onPress: (seatCode: string) => void;
}) {
  if (item.kind === "seat" || item.kind === "sleeper") {
    const seatCode = item.seatCode || item.label;

    if (!seatCode) {
      return <View style={[styles.seatCell, styles.emptySeatCell]} />;
    }

    const isUnavailable = bus.bookedSeats.includes(seatCode) || bus.blockedSeats.includes(seatCode);
    const isSelected = selectedSeats.includes(seatCode);

    return (
      <Pressable
        onPress={() => onPress(seatCode)}
        style={[
          styles.seatCell,
          styles.bookableSeat,
          isUnavailable && styles.unavailableSeat,
          isSelected && styles.selectedSeat,
        ]}
      >
        <Text
          style={[
            styles.seatText,
            isUnavailable && styles.unavailableSeatText,
            isSelected && styles.selectedSeatTextStyle,
          ]}
        >
          {seatCode}
        </Text>
      </Pressable>
    );
  }

  if (item.kind === "driver") {
    return (
      <View style={[styles.seatCell, styles.driverCell]}>
        <Ionicons name="car-sport-outline" size={16} color="#475569" />
      </View>
    );
  }

  if (item.kind === "toilet") {
    return (
      <View style={[styles.seatCell, styles.utilityCell]}>
        <Ionicons name="water-outline" size={16} color="#475569" />
      </View>
    );
  }

  return <View style={[styles.seatCell, styles.emptySeatCell]} />;
}

function StopPicker({
  title,
  stops,
  value,
  onChange,
}: {
  title: string;
  stops: BusStop[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.sectionCard}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.stopList}>
        {stops.map((stop) => {
          const active = stop.location === value;

          return (
            <Pressable
              key={`${title}-${stop.location}`}
              onPress={() => onChange(stop.location)}
              style={[styles.stopChip, active && styles.stopChipActive]}
            >
              <Text style={[styles.stopChipText, active && styles.stopChipTextActive]}>
                {stop.location}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function Field({
  label,
  error,
  style,
  ...inputProps
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  keyboardType?: "default" | "number-pad" | "phone-pad" | "email-address";
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  error?: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[styles.fieldGroup, style]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput placeholderTextColor="#94a3b8" style={styles.input} {...inputProps} />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

function SummaryPill({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.summaryPill}>
      <Ionicons name={icon} size={16} color="#4338ca" />
      <Text style={styles.summaryPillText}>{label}</Text>
    </View>
  );
}

function Legend({
  color,
  borderColor,
  label,
}: {
  color: string;
  borderColor: string;
  label: string;
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendSwatch, { backgroundColor: color, borderColor }]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

function clampPassengerCount(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 1) {
    return 1;
  }

  return Math.min(parsed, 10);
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
  loadingState: {
    flex: 1,
    backgroundColor: "#f8f7ff",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    gap: 10,
  },
  loadingText: {
    color: "#475569",
    fontSize: 15,
  },
  errorTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
  },
  errorText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
    textAlign: "center",
  },
  busCard: {
    borderRadius: 28,
    backgroundColor: "#ffffff",
    padding: 20,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  routeTitle: {
    color: "#111827",
    fontSize: 24,
    fontWeight: "800",
  },
  routeSubtitle: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 999,
    backgroundColor: "#eef2ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  summaryPillText: {
    color: "#3730a3",
    fontSize: 13,
    fontWeight: "700",
  },
  authCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  authTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
  },
  authText: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    backgroundColor: "#4f46e5",
    paddingHorizontal: 18,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
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
    paddingHorizontal: 18,
  },
  outlineButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionCard: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    padding: 18,
    gap: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  sectionTitle: {
    color: "#111827",
    fontSize: 20,
    fontWeight: "700",
  },
  sectionHint: {
    color: "#64748b",
    fontSize: 14,
    lineHeight: 20,
  },
  legendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  legendSwatch: {
    height: 16,
    width: 16,
    borderRadius: 5,
    borderWidth: 1,
  },
  legendLabel: {
    color: "#475569",
    fontSize: 13,
  },
  seatMap: {
    gap: 10,
  },
  seatRow: {
    flexDirection: "row",
    gap: 10,
  },
  seatCell: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  bookableSeat: {
    backgroundColor: "#ffffff",
    borderColor: "#cbd5e1",
  },
  unavailableSeat: {
    backgroundColor: "#cbd5e1",
    borderColor: "#cbd5e1",
  },
  selectedSeat: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  emptySeatCell: {
    borderColor: "transparent",
    backgroundColor: "transparent",
  },
  driverCell: {
    backgroundColor: "#e2e8f0",
    borderColor: "#e2e8f0",
  },
  utilityCell: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  seatText: {
    color: "#0f172a",
    fontSize: 12,
    fontWeight: "700",
  },
  unavailableSeatText: {
    color: "#475569",
  },
  selectedSeatTextStyle: {
    color: "#ffffff",
  },
  selectedSeatText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
  stopList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  stopChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
  },
  stopChipActive: {
    backgroundColor: "#4f46e5",
    borderColor: "#4f46e5",
  },
  stopChipText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
  stopChipTextActive: {
    color: "#ffffff",
  },
  passengerCard: {
    borderRadius: 20,
    backgroundColor: "#f8fafc",
    padding: 14,
    gap: 12,
  },
  passengerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  passengerTitle: {
    color: "#0f172a",
    fontSize: 18,
    fontWeight: "700",
  },
  passengerSubtitle: {
    color: "#64748b",
    fontSize: 13,
  },
  youBadge: {
    borderRadius: 999,
    backgroundColor: "#dcfce7",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  youBadgeText: {
    color: "#166534",
    fontSize: 12,
    fontWeight: "700",
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
    backgroundColor: "#ffffff",
    color: "#0f172a",
    fontSize: 15,
  },
  fieldError: {
    color: "#dc2626",
    fontSize: 12,
  },
  row: {
    flexDirection: "row",
    gap: 10,
  },
  rowField: {
    flex: 1,
  },
  genderGroup: {
    flexDirection: "row",
    gap: 10,
  },
  genderChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  genderChipActive: {
    backgroundColor: "#eef2ff",
    borderColor: "#4f46e5",
  },
  genderChipText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
  genderChipTextActive: {
    color: "#3730a3",
  },
  checkoutCard: {
    borderRadius: 24,
    backgroundColor: "#111827",
    padding: 18,
    gap: 14,
  },
  checkoutLabel: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  checkoutValue: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  submitError: {
    color: "#dc2626",
    fontSize: 14,
    lineHeight: 20,
  },
});
