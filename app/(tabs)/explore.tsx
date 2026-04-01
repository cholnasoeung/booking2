import { Ionicons } from "@expo/vector-icons";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { Colors, gradients, glass } from "@/constants/theme";

const callouts = [
  {
    icon: "radio-outline",
    title: "Live departures",
    description: "Every query touches the Next.js API so mobile passengers see the same trips as the web.",
  },
  {
    icon: "filter",
    title: "Modern filters",
    description: "Bus type, amenity, and price sorting keep every search precise on a single screen.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Shared auth",
    description: "Use the same secure login flow from the web experience without retyping credentials.",
  },
];

const tips = [
  "Tap \"Search departures\" to pull live prices and seat availability.",
  "Swap routes, adjust dates, and refresh to keep results relevant.",
  "Keep Expo running in the background and use your real device for best camera and notifications.",
];

export default function ExploreScreen() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.heroCard}>
        <Text style={styles.heroEyebrow}>Why mobile matters</Text>
        <Text style={styles.heroTitle}>Stay agile on the go</Text>
        <Text style={styles.heroText}>
          The passenger booking experience mirrors the web dashboard. Every tap, filter, and
          confirmation is shared so teams can migrate between screen sizes without losing context.
        </Text>
        <View style={styles.heroStatRow}>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>Realtime</Text>
            <Text style={styles.heroStatLabel}>synced trips</Text>
          </View>
          <View style={styles.heroStat}>
            <Text style={styles.heroStatValue}>Responsive</Text>
            <Text style={styles.heroStatLabel}>touch targets</Text>
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What the app captures</Text>
        {callouts.map((item) => (
          <View style={styles.calloutCard} key={item.title}>
            <Ionicons name={item.icon} size={20} color={Colors.light.tint} />
            <View style={styles.calloutText}>
              <Text style={styles.calloutTitle}>{item.title}</Text>
              <Text style={styles.calloutDescription}>{item.description}</Text>
            </View>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tips for mobile ops</Text>
        <View style={styles.tipList}>
          {tips.map((tip) => (
            <View style={styles.tipRow} key={tip}>
              <View style={styles.bullet} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
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
  heroCard: {
    borderRadius: 32,
    padding: 22,
    backgroundColor: gradients.hero[0],
    overflow: "hidden",
    position: "relative",
  },
  heroEyebrow: {
    textTransform: "uppercase",
    fontSize: 12,
    letterSpacing: 1.2,
    color: "rgba(255, 255, 255, 0.8)",
    fontWeight: "700",
  },
  heroTitle: {
    color: "#ffffff",
    fontSize: 28,
    fontWeight: "800",
    marginTop: 6,
  },
  heroText: {
    color: "rgba(255, 255, 255, 0.9)",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  heroStatRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  heroStat: {
    flex: 1,
    borderRadius: 16,
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
    marginTop: 2,
    textTransform: "uppercase",
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    color: palette.text,
    fontSize: 18,
    fontWeight: "700",
  },
  calloutCard: {
    flexDirection: "row",
    gap: 12,
    borderRadius: 20,
    padding: 16,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
    shadowColor: shadowColors.card,
    shadowOpacity: 0.08,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 12,
    elevation: 2,
  },
  calloutText: {
    flex: 1,
    gap: 4,
  },
  calloutTitle: {
    color: palette.text,
    fontSize: 15,
    fontWeight: "700",
  },
  calloutDescription: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  tipList: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    padding: 16,
    gap: 10,
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
    backgroundColor: palette.text,
  },
  tipText: {
    color: palette.muted,
    fontSize: 14,
    lineHeight: 20,
    flex: 1,
  },
});
