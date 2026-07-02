import { connectToDatabase } from "@/lib/db/mongodb";
import RouteModel from "@/models/transport/Route";
import BusModel from "@/models/transport/Bus";
import PromoCodeModel from "@/models/commerce/PromoCode";

export const runtime = "nodejs";

export interface FareCalculationOptions {
  busId: string;
  seatCount: number;
  promoCode?: string;
}

export interface FareBreakdown {
  basePrice: number;
  seatPrice: number;
  subtotal: number;
  discount: {
    amount: number;
    type: string;
    code: string;
    description: string;
  } | null;
  serviceFee: number;
  taxes: number;
  total: number;
  currency: string;
}

export interface DynamicPricingFactors {
  daysUntilDeparture: number;
  occupancyRate: number;
  isPeakHour: boolean;
  dayOfWeek: number; // 0 = Sunday, 6 = Saturday
}

/**
 * Calculate fare with base price, dynamic pricing, discounts, and fees
 */
export async function calculateFare(
  options: FareCalculationOptions
): Promise<FareBreakdown> {
  const { busId, seatCount, promoCode } = options;

  await connectToDatabase();

  // Fetch bus with route
  const bus = await BusModel.findById(busId).populate("routeId");

  if (!bus) {
    throw new Error("Bus not found");
  }

  const route = (bus as any).routeId;

  // Base price per seat
  const baseSeatPrice = bus.pricePerSeat;
  const seatPrice = baseSeatPrice;

  // Calculate base price
  const basePrice = seatCount * baseSeatPrice;
  let subtotal = basePrice;

  // Apply dynamic pricing
  const dynamicPricing = await calculateDynamicPricing(bus);
  const dynamicAdjustment = Math.round(subtotal * dynamicPricing.multiplier);
  subtotal += dynamicAdjustment;

  // Calculate discount
  let discount = null;
  if (promoCode) {
    const promo = await PromoCodeModel.findOne({
      code: promoCode.toUpperCase(),
      isActive: true,
    });

    if (promo && promo.isValid()) {
      const discountResult = promo.calculateDiscount(subtotal);

      if (discountResult.valid) {
        discount = {
          amount: discountResult.discount,
          type: promo.type,
          code: promo.code,
          description: discountResult.message,
        };
        subtotal -= discount.amount;

        // Increment usage
        await promo.incrementUsage();
      }
    }
  }

  // Calculate service fee (2.5% of subtotal, minimum $1)
  const serviceFee = Math.max(1, Math.round(subtotal * 0.025));

  // Calculate taxes (5% of subtotal)
  const taxes = Math.round(subtotal * 0.05);

  // Total
  const total = subtotal + serviceFee + taxes;

  return {
    basePrice,
    seatPrice,
    subtotal: subtotal + (discount?.amount || 0),
    discount,
    serviceFee,
    taxes,
    total,
    currency: "USD",
  };
}

/**
 * Calculate dynamic pricing multiplier based on demand and timing
 */
async function calculateDynamicPricing(bus: any): Promise<{
  multiplier: number;
  factors: DynamicPricingFactors;
}> {
  const now = new Date();
  const departureDate = bus.date;

  // Days until departure
  const daysUntilDeparture = Math.ceil(
    (departureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate occupancy rate
  const totalSeats = bus.totalSeats || 40;
  const bookedSeats = bus.bookedSeats?.length || 0;
  const occupancyRate = bookedSeats / totalSeats;

  // Check if peak hour (6 AM - 9 AM, 4 PM - 8 PM)
  const hour = now.getHours();
  const isPeakHour = (hour >= 6 && hour <= 9) || (hour >= 16 && hour <= 18);

  // Day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = departureDate.getDay();

  // Calculate multiplier (1.0 = base price, up to 1.3 = 30% premium)
  let multiplier = 1.0;

  // Last-minute premium (book within 2 days)
  if (daysUntilDeparture < 2) {
    multiplier += 0.15;
  }

  // High occupancy premium (> 80% full)
  if (occupancyRate > 0.8) {
    multiplier += 0.1;
  }

  // Peak hour premium
  if (isPeakHour) {
    multiplier += 0.05;
  }

  // Weekend premium
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    multiplier += 0.05;
  }

  // Early bird discount (book 7+ days in advance)
  if (daysUntilDeparture >= 7) {
    multiplier -= 0.05;
  }

  // Ensure multiplier stays within reasonable bounds
  multiplier = Math.max(0.8, Math.min(1.3, multiplier));

  return {
    multiplier,
    factors: {
      daysUntilDeparture,
      occupancyRate,
      isPeakHour,
      dayOfWeek,
    },
  };
}

/**
 * Format currency for display
 */
export function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Get price estimate for search results (without service fees and taxes)
 */
export async function getPriceEstimate(busId: string, seatCount: number): Promise<{
  basePrice: number;
  estimatedTotal: number;
  pricePerSeat: number;
  currency: string;
}> {
  const { basePrice, total, currency } = await calculateFare({ busId, seatCount });

  return {
    basePrice,
    estimatedTotal: total,
    pricePerSeat: basePrice / seatCount,
    currency,
  };
}
