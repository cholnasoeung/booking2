import { connectToDatabase } from "@/lib/db/mongodb";
import UserModel from "@/models/user/User";
import BookingModel from "@/models/booking/Booking";

export const runtime = "nodejs";

// In-memory rate limit store (in production, use Redis)
const rateLimitStore = new Map<
  string,
  { count: number; resetTime: number; requests: number[] }
>();

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

// Rate limit configurations for different endpoints
export const RATE_LIMIT_CONFIGS: Record<string, RateLimitConfig> = {
  // Public endpoints
  "api/auth/signin": { maxRequests: 5, windowMs: 60 * 1000 }, // 5 requests per minute
  "api/auth/signup": { maxRequests: 3, windowMs: 60 * 1000 }, // 3 requests per minute
  "api/auth/forgot-password": { maxRequests: 3, windowMs: 60 * 1000 }, // 3 requests per minute

  // Booking endpoints
  "api/bookings": { maxRequests: 10, windowMs: 60 * 1000 }, // 10 requests per minute

  // Search endpoints
  "api/buses/search": { maxRequests: 30, windowMs: 60 * 1000 }, // 30 requests per minute

  // Admin endpoints (stricter)
  "api/admin": { maxRequests: 100, windowMs: 60 * 1000 }, // 100 requests per minute

  // Default
  default: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 requests per minute
};

/**
 * Check rate limit for a given identifier
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  const now = Date.now();
  const record = rateLimitStore.get(identifier);

  if (!record || now > record.resetTime) {
    // Create new record or reset expired one
    const resetTime = now + config.windowMs;
    rateLimitStore.set(identifier, {
      count: 1,
      resetTime,
      requests: [now],
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: new Date(resetTime),
    };
  }

  // Check if limit exceeded
  if (record.count >= config.maxRequests) {
    const retryAfter = Math.ceil((record.resetTime - now) / 1000);
    return {
      allowed: false,
      remaining: 0,
      resetTime: new Date(record.resetTime),
      retryAfter,
    };
  }

  // Increment counter
  record.count++;
  record.requests.push(now);

  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
    resetTime: new Date(record.resetTime),
  };
}

/**
 * Get rate limit configuration for a path
 */
export function getRateLimitConfig(path: string): RateLimitConfig {
  // Find matching config
  for (const [key, config] of Object.entries(RATE_LIMIT_CONFIGS)) {
    if (path.startsWith(key)) {
      return config;
    }
  }

  return RATE_LIMIT_CONFIGS.default;
}

/**
 * Middleware: Check rate limit by IP address
 */
export function checkRateLimitByIP(
  ip: string,
  path: string
): RateLimitResult {
  const config = getRateLimitConfig(path);
  return checkRateLimit(`ip:${ip}:${path}`, config);
}

/**
 * Middleware: Check rate limit by user ID
 */
export function checkRateLimitByUser(
  userId: string,
  path: string
): RateLimitResult {
  const config = getRateLimitConfig(path);
  return checkRateLimit(`user:${userId}:${path}`, config);
}

/**
 * Clear rate limit records (for testing/admin)
 */
export function clearRateLimit(identifier?: string): void {
  if (identifier) {
    rateLimitStore.delete(identifier);
  } else {
    rateLimitStore.clear();
  }
}

// Fraud Detection
export interface FraudCheckResult {
  isSuspicious: boolean;
  riskScore: number; // 0-100
  reasons: string[];
  action: "allow" | "review" | "block";
}

export interface FraudDetectionConfig {
  maxBookingsPerHour: number;
  maxBookingsPerDay: number;
  maxCancellationsPerDay: number;
  maxDifferentIPsPerDay: number;
  maxFailedPaymentsPerDay: number;
}

const DEFAULT_FRAUD_CONFIG: FraudDetectionConfig = {
  maxBookingsPerHour: 5,
  maxBookingsPerDay: 15,
  maxCancellationsPerDay: 10,
  maxDifferentIPsPerDay: 5,
  maxFailedPaymentsPerDay: 5,
};

/**
 * Check for suspicious activity
 */
export async function checkFraud(
  userId: string,
  ipAddress: string,
  config: FraudDetectionConfig = DEFAULT_FRAUD_CONFIG
): Promise<FraudCheckResult> {
  await connectToDatabase();

  const reasons: string[] = [];
  let riskScore = 0;

  const user = await UserModel.findById(userId).lean();
  if (!user) {
    return {
      isSuspicious: true,
      riskScore: 100,
      reasons: ["User not found"],
      action: "block",
    };
  }

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  // Check bookings in last hour
  const bookingsLastHour = await BookingModel.countDocuments({
    userId,
    createdAt: { $gte: oneHourAgo },
  });

  if (bookingsLastHour > config.maxBookingsPerHour) {
    reasons.push(
      `Excessive bookings: ${bookingsLastHour} bookings in the last hour`
    );
    riskScore += 40;
  }

  // Check bookings in last day
  const bookingsLastDay = await BookingModel.countDocuments({
    userId,
    createdAt: { $gte: oneDayAgo },
  });

  if (bookingsLastDay > config.maxBookingsPerDay) {
    reasons.push(
      `Excessive bookings: ${bookingsLastDay} bookings in the last day`
    );
    riskScore += 30;
  }

  // Check cancellations in last day
  const cancellationsLastDay = await BookingModel.countDocuments({
    userId,
    status: "cancelled",
    cancelledAt: { $gte: oneDayAgo },
  });

  if (cancellationsLastDay > config.maxCancellationsPerDay) {
    reasons.push(
      `High cancellation rate: ${cancellationsLastDay} cancellations in the last day`
    );
    riskScore += 35;
  }

  // Check for multiple IPs (if metadata is stored)
  const recentBookings = await BookingModel.find({
    userId,
    createdAt: { $gte: oneDayAgo },
  })
    .select("metadata.ipAddress")
    .lean();

  const uniqueIPs = new Set(
    recentBookings.map((b) => b.metadata?.ipAddress).filter(Boolean)
  );

  if (uniqueIPs.size > config.maxDifferentIPsPerDay) {
    reasons.push(
      `Multiple IP addresses: ${uniqueIPs.size} different IPs in the last day`
    );
    riskScore += 25;
  }

  // Check for rapid booking pattern (multiple bookings within minutes)
  const bookingsLast10Minutes = await BookingModel.find({
    userId,
    createdAt: { $gte: new Date(now.getTime() - 10 * 60 * 1000) },
  }).lean();

  if (bookingsLast10Minutes.length >= 3) {
    reasons.push("Rapid booking pattern detected");
    riskScore += 20;
  }

  // Determine action based on risk score
  let action: "allow" | "review" | "block";
  if (riskScore >= 80) {
    action = "block";
  } else if (riskScore >= 50) {
    action = "review";
  } else {
    action = "allow";
  }

  return {
    isSuspicious: riskScore > 30,
    riskScore: Math.min(riskScore, 100),
    reasons,
    action,
  };
}

/**
 * Check for suspicious patterns in a single booking request
 */
export async function checkBookingSuspiciousActivity(data: {
  userId: string;
  busId: string;
  seats: string[];
  ipAddress: string;
  userAgent: string;
}): Promise<FraudCheckResult> {
  await connectToDatabase();

  const reasons: string[] = [];
  let riskScore = 0;

  const user = await UserModel.findById(data.userId).lean();
  if (!user) {
    return {
      isSuspicious: true,
      riskScore: 100,
      reasons: ["User not found"],
      action: "block",
    };
  }

  // Check if user is new (created recently)
  const accountAge = Date.now() - new Date(user.createdAt).getTime();
  const accountAgeDays = accountAge / (1000 * 60 * 60 * 24);

  if (accountAgeDays < 1) {
    reasons.push("New account (less than 1 day old)");
    riskScore += 15;
  }

  // Check if user has verified email
  if (!user.isEmailVerified) {
    reasons.push("Unverified email address");
    riskScore += 10;
  }

  // Check if user has unusual seat selection pattern
  const recentBookings = await BookingModel.find({
    userId: data.userId,
  })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  if (recentBookings.length > 0) {
    // Check if user frequently books and cancels
    const cancellations = recentBookings.filter((b) => b.status === "cancelled")
      .length;

    if (cancellations >= recentBookings.length * 0.5) {
      reasons.push("High cancellation rate in recent bookings");
      riskScore += 25;
    }
  }

  // Check for suspicious user agent
  if (data.userAgent.includes("bot") || data.userAgent.includes("crawler")) {
    reasons.push("Suspicious user agent");
    riskScore += 30;
  }

  // Check for proxy/VPN indicators (basic check)
  if (data.ipAddress.startsWith("10.") || data.ipAddress.startsWith("192.168.")) {
    // Private IP - might indicate proxy
    reasons.push("Private IP address detected");
    riskScore += 10;
  }

  // Determine action based on risk score
  let action: "allow" | "review" | "block";
  if (riskScore >= 80) {
    action = "block";
  } else if (riskScore >= 50) {
    action = "review";
  } else {
    action = "allow";
  }

  return {
    isSuspicious: riskScore > 30,
    riskScore: Math.min(riskScore, 100),
    reasons,
    action,
  };
}

/**
 * Get rate limit statistics (for admin monitoring)
 */
export function getRateLimitStats(): {
  totalEntries: number;
  entriesByEndpoint: Record<string, number>;
} {
  const entriesByEndpoint: Record<string, number> = {};

  for (const [key] of rateLimitStore.entries()) {
    // Extract endpoint from key
    const parts = key.split(":");
    const endpoint = parts.length > 1 ? parts[parts.length - 1] : "unknown";
    entriesByEndpoint[endpoint] = (entriesByEndpoint[endpoint] || 0) + 1;
  }

  return {
    totalEntries: rateLimitStore.size,
    entriesByEndpoint,
  };
}
