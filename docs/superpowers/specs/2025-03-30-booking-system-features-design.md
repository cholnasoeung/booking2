# Bus Booking System - Feature Enhancement Design

**Date:** 2025-03-30
**Author:** Claude
**Status:** Revised - v1.1

## Overview

This document describes the design for four major feature enhancements to the bus booking system:

1. **Bus Reviews/Ratings** - Allow users to rate and review buses after travel
2. **Promo Codes System** - Discount/coupon code functionality
3. **Admin Analytics Dashboard** - Revenue, trends, and insights
4. **Cancellation Refund Tracking** - Track and manage refunds for cancelled bookings

---

## 1. Bus Reviews/Ratings

### Purpose

Enable users to provide feedback on their travel experience, helping other users make informed decisions while providing operators with valuable insights.

### Data Model

New `Review` model:

```typescript
interface IReview extends Document {
  user: mongoose.Types.ObjectId;  // ref: User
  bus: mongoose.Types.ObjectId;    // ref: Bus
  booking: mongoose.Types.ObjectId; // ref: Booking (for verification)
  rating: number;                   // 1-5 stars
  comment?: string;                 // Optional text review
  createdAt: Date;
  updatedAt: Date;
}

indexes: [
  { bus: 1 },           // For fetching reviews by bus
  { user: 1 },          // For fetching user's reviews
  { booking: 1 },       // Unique: one review per booking
  { rating: 1 },        // For filtering by rating
]
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/reviews` | Create a review | User |
| GET | `/api/reviews/bus/[busId]` | Get all reviews for a bus | Public |
| GET | `/api/reviews/me` | Get current user's reviews | User |
| PUT | `/api/reviews/[id]` | Update own review | User (owner) |
| DELETE | `/api/reviews/[id]` | Delete own review | User (owner) |
| DELETE | `/api/admin/reviews/[id]` | Delete any review | Admin |

### Business Rules

1. **Eligibility**: Users can only review after the bus departure date has passed AND booking status is "confirmed"
2. **Uniqueness**: One review per booking (users can review same bus multiple times if they have multiple bookings)
3. **Verification**: Must link to an actual `bookingId` for that bus and user
4. **Cancellation Handling**: If booking is cancelled, review is archived (status = "archived") but not deleted
5. **Editing**: Users can update their review anytime
6. **Deletion**: Users can delete their own review; admins can delete any review
7. **Rating Scale**: 1-5 stars (required)
8. **Comment**: Optional, 10-500 characters (minimum 10 chars to ensure meaningful reviews)
9. **Rate Limiting**: 3 reviews per hour per user (prevents spam)
10. **Delayed Departure**: If bus is delayed > 24 hours, users can still review after original departure time
11. **Bus Deletion**: If bus is deleted, reviews remain (for historical data) but are marked "bus_deleted"

### API Response Format

**POST /api/reviews** - Create review
```typescript
{
  success: true,
  data: {
    _id: string,
    bus: string,
    booking: string,
    rating: number,
    comment: string,
    createdAt: Date
  }
}
```

**GET /api/reviews/bus/[busId]?page=1&limit=20** - Get reviews for a bus
```typescript
{
  success: true,
  data: {
    reviews: Array<{
      _id: string,
      user: { name: string },  // First name + last initial only
      rating: number,
      comment: string,
      createdAt: Date
    }>,
    averageRating: number,
    totalReviews: number,
    page: number,
    totalPages: number
  }
}
```

### UI Components

1. **Review Form** (modal/page)
   - Star rating input (1-5)
   - Comment textarea
   - Submit/Cancel buttons

2. **Review Card** (display)
   - User name (first name + last initial for privacy, e.g., "John D.")
   - Star rating
   - Comment text
   - Date posted
   - Edit/Delete buttons (for own reviews)

3. **Rating Summary Badge** (on bus listings)
   - Average rating (e.g., "4.5")
   - Review count (e.g., "(23 reviews)")
   - Color-coded: green (4+), yellow (3-3.9), red (<3)

### Integration Points

- **Search Results**: Show average rating on each bus card
- **Booking Page**: Display reviews section with rating summary
- **My Bookings**: Add "Write a Review" button for completed trips
- **Bus Detail**: Show all reviews with pagination

---

## 2. Promo Codes System

### Purpose

Enable discount promotions to drive sales and reward customers.

### Data Model

New `PromoCode` model:

```typescript
interface IPromoCode extends Document {
  code: string;                    // Unique, case-insensitive
  discountType: "percentage" | "fixed";
  discountValue: number;           // Percentage (0-100) or fixed amount
  minBookingAmount?: number;       // Minimum order value to apply
  maxDiscountAmount?: number;      // Cap on discount amount
  usageLimit: number;              // Total allowed uses
  usedCount: number;               // Current usage count
  validFrom: Date;                 // Start date
  validUntil: Date;                // Expiration date
  isActive: boolean;               // Admin can disable without deleting
  createdAt: Date;
  updatedAt: Date;
}

indexes: [
  { code: 1 },              // For code lookup (case-insensitive)
  { validFrom: 1, validUntil: 1, isActive: 1 }, // For finding active codes
]
```

Extend `Booking` model:

```typescript
// Add to existing Booking model (keeping totalPrice for backward compatibility)
interface IBooking extends Document {
  ...existing fields
  // Keep existing totalPrice
  totalPrice: number;              // Final amount paid (existing field)

  // New fields for promo codes
  promoCode?: string;              // Applied promo code
  originalPrice?: number;          // Price before discount
  discountAmount?: number;         // Discount applied
}
```

**Note**: `totalPrice` remains the final paid amount. New fields track discount details.

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/admin/promo-codes` | Create promo code | Admin |
| GET | `/api/admin/promo-codes` | List all promo codes | Admin |
| GET | `/api/admin/promo-codes/[id]` | Get promo code details | Admin |
| PUT | `/api/admin/promo-codes/[id]` | Update promo code | Admin |
| DELETE | `/api/admin/promo-codes/[id]` | Delete promo code | Admin |
| POST | `/api/promo-codes/validate` | Validate code and get discount | User |
| GET | `/api/promo-codes/[code]` | Get public promo code info | Public |

### Business Rules

1. **Code Format**: Alphanumeric, 6-20 characters, case-insensitive (increased from 4-6 for security)
2. **Uniqueness**: Each code must be unique
3. **Single Use Per Booking**: Only one promo code can be applied per booking (no stacking)
4. **Validation Checks**:
   - Code exists and is active
   - Current date within validFrom/validUntil range
   - Usage count < usage limit
   - Booking amount >= minBookingAmount (if set)
5. **Application**: Applied at booking confirmation, locked between validation and booking creation
6. **Usage Tracking**: Increment `usedCount` when successfully applied
7. **Modification**: Admins can edit codes; changes don't affect existing bookings
8. **Expiry Handling**: If code expires between validation and booking (within 5 min window), still honored
9. **Rate Limiting**: 5 promo code validations per minute per IP (prevents enumeration attacks)

### Security Requirements

- Admin-only access to promo code usage statistics (exposes business metrics)
- Log promo code validations as hashed values (don't log plaintext codes)
- Validate input to prevent SQL injection (use parameterized queries)
- HTTPS required for all promo code operations

### Discount Calculation

```typescript
// Percentage discount
discountAmount = (originalPrice * discountValue / 100)
if (maxDiscountAmount) {
  discountAmount = min(discountAmount, maxDiscountAmount)
}
// Guard: Maximum 90% discount (prevents free/negative price)
discountAmount = min(discountAmount, originalPrice * 0.9)

// Fixed discount
discountAmount = discountValue
if (maxDiscountAmount) {
  discountAmount = min(discountAmount, maxDiscountAmount)
}
// Guard: Cannot exceed 90% of original price
discountAmount = min(discountAmount, originalPrice * 0.9)

totalPrice = originalPrice - discountAmount

// Guard: Minimum price is 10% of original (or $1, whichever is greater)
totalPrice = max(totalPrice, max(originalPrice * 0.1, 1))
```

**Validation**: Reject if user tries to apply multiple promo codes to same booking

### API Response Format

**POST /api/promo-codes/validate** - Validate promo code
```typescript
{
  success: true,
  data: {
    valid: true,
    discountType: "percentage" | "fixed",
    discountValue: number,
    discountAmount: number,  // Calculated discount for current booking
    finalPrice: number,      // originalPrice - discountAmount
    message: string          // e.g., "10% discount applied!"
  }
}
```

**Error Response:**
```typescript
{
  success: false,
  error: string  // "Code expired", "Usage limit reached", "Invalid code", etc.
}
```

### UI Components

1. **Promo Code Input** (booking flow)
   - Text input field
   - "Apply" button
   - Success/error messages
   - Shows discount applied

2. **Admin Promo Code Form**
   - Code input
   - Discount type selector (percentage/fixed)
   - Discount value input
   - Optional: min/max amounts
   - Usage limit input
   - Date range picker
   - Active toggle
   - Usage statistics display

3. **Promo Code List** (admin)
   - Table with all codes
   - Status (active/expired)
   - Usage count/limit
   - Edit/Delete actions
   - Filter by status

### Integration Points

- **Seat Selection Page**: Add promo code input field
- **Booking API**: Validate and apply promo code before creating booking
- **Admin Panel**: Add "Promo Codes" tab
- **Booking Confirmation**: Show promo code and discount applied

---

## 3. Admin Analytics Dashboard

### Purpose

Provide administrators with insights into system performance, revenue, and user behavior.

### Data Sources

Uses existing collections (User, Route, Bus, Booking) plus new Review collection.

### Metrics & Queries

#### 3.1 Revenue Analytics

**Total Revenue**
```typescript
// Sum of paidAmount for confirmed bookings
aggregate([
  { $match: { status: "confirmed" } },
  { $group: { _id: null, total: { $sum: "$paidAmount" } } }
])
```

**Revenue by Date Range**
```typescript
// Daily revenue trend
aggregate([
  { $match: { status: "confirmed", createdAt: { $gte: start, $lte: end } } },
  { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$paidAmount" } } },
  { $sort: { _id: 1 } }
])
```

**Revenue by Route**
```typescript
aggregate([
  { $match: { status: "confirmed" } },
  { $lookup: { from: "buses", localField: "bus", foreignField: "_id", as: "bus" } },
  { $lookup: { from: "routes", localField: "bus.routeId", foreignField: "_id", as: "route" } },
  { $group: { _id: "$route._id", routeName: { $first: { $concat: ["$route.from", " → ", "$route.to"] } }, revenue: { $sum: "$paidAmount" }, count: { $sum: 1 } } },
  { $sort: { revenue: -1 } }
])
```

#### 3.2 Booking Analytics

**Booking Status Breakdown**
```typescript
aggregate([
  { $group: { _id: "$status", count: { $sum: 1 } } }
])
```

**Booking Trends** (same as revenue trend, with count instead of sum)

**Cancellation Rate**
```typescript
cancelledCount / totalCount * 100
```

#### 3.3 Route Performance

**Popular Routes** (by booking count)
```typescript
// Same as Revenue by Route, sorted by count
```

**Route Revenue** (already covered above)

#### 3.4 Bus Utilization

**Average Occupancy Rate**
```typescript
aggregate([
  { $project: {
      _id: 1,
      totalSeats: 1,
      bookedSeatsCount: { $size: "$bookedSeats" },
      occupancyRate: { $divide: [{ $size: "$bookedSeats" }, "$totalSeats"] }
  }},
  { $group: {
      _id: null,
      avgOccupancy: { $avg: "$occupancyRate" },
      totalBuses: { $sum: 1 }
  }}
])
```

**Low/High Performing Buses**
```typescript
// Buses with occupancy < 50% or > 90%
```

#### 3.5 Refund Analytics

**Total Refunds**
```typescript
sum of refundAmount where refundStatus: "processed"
```

**Refund Rate**
```typescript
processedRefunds / confirmedBookings * 100
```

**Refund Trends**
```typescript
// Monthly refunds over time
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/analytics/revenue` | Revenue metrics with date filter | Admin |
| GET | `/api/admin/analytics/bookings` | Booking statistics | Admin |
| GET | `/api/admin/analytics/routes` | Route performance | Admin |
| GET | `/api/admin/analytics/buses` | Bus utilization metrics | Admin |
| GET | `/api/admin/analytics/refunds` | Refund statistics | Admin |
| GET | `/api/admin/analytics/overview` | Dashboard summary (all metrics) | Admin |

Query parameters:
- `startDate` - Filter from date (ISO string)
- `endDate` - Filter to date (ISO string)
- `limit` - Max results (default: 100, max: 1000)

**Validation**:
- Start date must be before end date
- Maximum date range: 90 days
- No future dates allowed
- Query must return in < 3 seconds (for 30-day range)

### Security Requirements

- All analytics endpoints require admin role verification
- Log all analytics queries with admin ID, timestamp, and query parameters
- No sensitive PII in aggregated responses
- Scope-based access: All admins see all data (future: role-based scoping)

### UI Components

1. **Analytics Tab** (admin sidebar)
   - New tab "Analytics"

2. **Date Range Picker**
   - Quick selects: Today, Last 7 days, Last 30 days, This month, Custom

3. **Metrics Cards**
   - Total Revenue (with % change from previous period)
   - Total Bookings
   - Average Order Value
   - Cancellation Rate
   - Refund Rate

4. **Charts**
   - Revenue trend (line chart)
   - Bookings by status (pie chart)
   - Top routes (bar chart)
   - Occupancy distribution (histogram)

5. **Tables**
   - Route performance ranking
   - Bus utilization report
   - Recent refunds list

### Data Display Format

```typescript
interface AnalyticsOverview {
  revenue: {
    total: number;
    change: number; // percentage change from previous period
    byDate: Array<{ date: string; amount: number }>;
    byRoute: Array<{ route: string; revenue: number; count: number }>;
  };
  bookings: {
    total: number;
    confirmed: number;
    cancelled: number;
    cancellationRate: number;
  };
  buses: {
    avgOccupancy: number;
    lowPerforming: Array<{ busId: string; occupancy: number }>;
    highPerforming: Array<{ busId: string; occupancy: number }>;
  };
  refunds: {
    total: number;
    rate: number;
    pending: number;
  };
}
```

### Integration Points

- **Admin Panel**: Add "Analytics" tab to sidebar
- Create new admin analytics page at `/admin/analytics`

---

## 4. Cancellation Refund Tracking

### Purpose

Track and manage the refund process for cancelled bookings, providing visibility to both users and administrators.

### Data Model Extensions

Extend `Booking` model:

```typescript
interface IBooking extends Document {
  ...existing fields
  // Refund fields
  refundAmount?: number;           // Amount to refund
  refundStatus?: "none" | "pending" | "processed" | "rejected";
  refundRequestedAt?: Date;
  refundProcessedAt?: Date;
  refundReason?: string;           // User's reason for cancellation
  refundRejectReason?: string;     // Admin's reason for rejection
  refundMethod?: string;           // How refund was processed
}
```

### API Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/refunds/me?page=1&limit=20` | Get user's refund history | User |
| GET | `/api/admin/refunds?page=1&limit=50&status=pending` | List all refunds with filters | Admin |
| GET | `/api/admin/refunds/[bookingId]` | Get refund details | Admin |
| PUT | `/api/admin/refunds/[bookingId]` | Process refund (approve/reject) | Admin |

**Response Format - GET /api/admin/refunds**
```typescript
{
  success: true,
  data: {
    refunds: Array<{
      bookingId: string,
      user: { name: string, email: string },
      bus: { from: string, to: string, departureTime: string },
      refundAmount: number,
      refundStatus: "pending" | "processed" | "rejected",
      refundRequestedAt: Date,
      refundProcessedAt?: Date,
      refundRejectReason?: string
    }>,
    total: number,
    page: number,
    totalPages: number
  }
}
```

### Business Rules

1. **Automatic Refund Request**
   - When user cancels booking, automatically set `refundStatus: "pending"`
   - Set `refundAmount = totalPrice` (user gets back what they paid, NOT originalPrice)
   - Set `refundRequestedAt = now()`

2. **Cancellation Time Limits**
   - Full refund if cancelled 24+ hours before departure
   - Partial refund (50%) if cancelled 2-24 hours before departure
   - No refund if cancelled < 2 hours before departure
   - Exception: Bus cancelled by operator = 100% refund regardless of timing

3. **Refund Processing** (Admin)
   - Approve: Set `refundStatus: "processed"`, `refundProcessedAt: now()`, add `refundMethod`
   - Reject: Set `refundStatus: "rejected"`, add `refundRejectReason`
   - Partial refunds: Only permitted within 24 hours of booking

4. **Service Level Agreement**
   - Admins must process refunds within 48 hours of request
   - Auto-approve refunds under $10 (configurable threshold)
   - Require re-authentication for refunds over $100

5. **Audit Trail**
   - Track: admin ID who approved/rejected, timestamp, IP address, reason
   - Immutable audit log (cannot be modified)

3. **Refund Methods**
   - "original_payment" - Refund to original payment method
   - "bank_transfer" - Bank transfer
   - "wallet_credit" - Credit to user wallet (if implemented)
   - "cash" - Cash refund (in-person)

4. **User Visibility**
   - Users can see their refund status in booking details
   - Users can see refund history on dedicated page

5. **Notifications** (if email is implemented)
   - Email user when refund is approved
   - Email user when refund is rejected (with reason)

### Refund States

```
none → pending → processed
                 ↓
               rejected
```

### UI Components

1. **Refund Status Badge** (on booking)
   - Shows current status with color coding
   - Pending: Yellow
   - Processed: Green
   - Rejected: Red

2. **Refund Details Card** (booking detail)
   - Refund amount
   - Status
   - Dates (requested, processed)
   - Reject reason (if rejected)

3. **Admin Refund Management**
   - Table of pending refunds
   - Quick actions: Approve/Reject
   - Filter by status
   - Search by booking ID or user email
   - Batch approve (multiple refunds)

4. **Refund Process Dialog** (admin)
   - Show booking details
   - Edit refund amount (optional)
   - Select refund method
   - Add notes/reason
   - Confirm/Cancel buttons

### Integration Points

- **Booking Cancellation**: Extend existing cancellation flow to set refund status
- **My Bookings**: Display refund status for cancelled bookings
- **Admin Panel**: Add "Refunds" tab or integrate into existing "Bookings" tab
- **Booking Detail Page**: Show full refund information

---

## Implementation Order

Recommended build sequence:

1. **Bus Reviews/Ratings** (Simplest, independent)
   - Create Review model
   - Build review APIs
   - Add review UI components
   - Integrate into search and booking pages

2. **Promo Codes System** (Independent)
   - Create PromoCode model
   - Extend Booking model
   - Build promo code APIs
   - Add promo code input to booking flow
   - Build admin promo code management

3. **Cancellation Refund Tracking** (Extends Booking)
   - Extend Booking model with refund fields
   - Update cancellation flow
   - Build refund APIs
   - Add refund UI to admin panel
   - Add refund status to user bookings

4. **Admin Analytics Dashboard** (Uses data from above)
   - Build aggregation queries
   - Create analytics APIs
   - Design analytics UI
   - Add to admin panel

---

## Technical Considerations

### Database Indexes

Each new model should have appropriate indexes for query performance:
- Reviews: compound index on (bus, user) for uniqueness check
- PromoCodes: unique index on code (case-insensitive)
- Booking: add indexes on refund status and date ranges for analytics queries

### Aggregation Performance

Analytics queries will use MongoDB aggregation pipelines. For large datasets:
- Consider creating materialized views or cached summary statistics
- Use date range filters to limit data processed
- Add indexes on fields used in $match stages

### Data Migration

When extending the Booking model:
- Add new fields with null values
- Set defaults: `refundStatus = "none"`, `originalPrice = totalPrice`
- Migration script: Run on deployment to set `originalPrice` for existing bookings
- No data loss: Keep `totalPrice` unchanged

### Performance Benchmarks

All APIs must meet these response time targets:
- Review creation/updates: < 500ms
- Promo code validation: < 200ms
- Analytics queries (30-day range): < 3 seconds
- Refund processing: < 300ms

### Caching Strategy

- Cache bus average ratings (TTL: 5 minutes)
- Cache active promo codes (TTL: 1 minute)
- Cache analytics summary stats (TTL: 15 minutes)
- Invalidate cache on relevant data changes

### Error Handling

Each API should handle:
- Validation errors (400)
- Not found (404)
- Unauthorized (401)
- Forbidden (403)
- Conflict (409) - e.g., duplicate review, promo code limit reached
- Server errors (500)

### Testing

**Bus Reviews/Ratings:**
- Unit tests: Rating validation, uniqueness check, eligibility check
- Integration: CRUD operations for reviews, pagination
- E2E: User submits review after trip, updates review
- Edge cases: Cancelled booking, deleted bus, delayed departure

**Promo Codes:**
- Unit tests: Discount calculation, validation logic
- Integration: Promo code CRUD, validation endpoint
- E2E: User applies promo code, admin manages codes
- Edge cases: Expiry during booking, multiple codes attempt, limit reached

**Analytics:**
- Unit tests: Aggregation queries
- Integration: All analytics endpoints
- Performance: Test with 10K+ bookings, verify < 3s response
- Edge cases: Invalid date ranges, future dates, empty data

**Refunds:**
- Unit tests: Refund amount calculation, state transitions
- Integration: Refund CRUD, filtering
- E2E: User cancels booking, admin processes refund
- Edge cases: Late cancellation, bus cancelled by operator, partial refund

### Monitoring Requirements

- Track promo code usage rate (alert if > 100/hour)
- Monitor average review rating trends
- Alert on refund rate > 10%
- Log all admin actions with user ID and timestamp

---

## Assumptions & Future Enhancements

### Current Assumptions (for implementation)

1. **Payment Integration**: No payment gateway integration for now (cash-on-delivery model). All refund tracking is manual.
2. **Email Notifications**: Not implemented (future enhancement)
3. **Review Moderation**: Admin can delete inappropriate reviews (reporting system is future work)
4. **Analytics Refresh**: Real-time with caching (TTL: 15 minutes for summary stats)
5. **Admin Access**: All admins have full access to all data (no role-based scoping yet)

### Future Enhancements

- Payment gateway integration (Stripe, PayPal)
- Email notifications for reviews, refunds, promo code usage
- User review reporting system
- Role-based admin access (super admin, support admin, finance admin)
- Advanced analytics with predictive insights
- Automatic refund processing for low amounts
- Review sentiment analysis

---

## Next Steps

1. **Approve this design document**
2. **Create detailed implementation plan** using superpowers:writing-plans skill
3. **Build features** following implementation order above
