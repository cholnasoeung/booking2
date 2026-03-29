# Bus Booking System - Feature Roadmap to Full Functionality

## 🎯 Current Status Analysis

### ✅ **Implemented Features**
- ✅ User authentication (NextAuth with credentials + Google OAuth)
- ✅ Landing page with search
- ✅ Bus search results page
- ✅ Seat selection page (mini bus & sleeper layouts)
- ✅ Booking creation API
- ✅ Booking confirmation page
- ✅ User dashboard with booking history
- ✅ Admin panel (routes, buses, bookings management)
- ✅ Seat layout editor with deck support (lower/upper)
- ✅ Responsive design

### ❌ **Missing Critical Features**

---

## 🚀 Phase 1: Complete Booking Flow (HIGH PRIORITY)

### 1.1 Passenger Details Form
**File:** `app/book/[busId]/page.tsx` → After seat selection

**Features Needed:**
- [ ] Multi-passenger form (dynamic based on seat count)
- [ ] Fields per passenger:
  - Full name (required)
  - Age (required, numeric)
  - Gender (Male/Female/Other)
  - Contact number (required, validation)
  - Email (optional)
- [ ] Form validation
- [ ] Auto-fill with logged-in user details
- [ ] Edit passenger details before confirmation
- [ ] Save passenger details to booking

**UI Components:**
- ```PassengerDetailsForm.tsx```
- Multi-step form with progress indicator
- Passenger cards with collapsible sections

---

### 1.2 Payment Integration (Mock or Real)
**File:** New `app/book/[busId]/payment/page.tsx`

**Features Needed:**
- [ ] Payment method selection:
  - Credit/Debit Card
  - Digital Wallets (Apple Pay, Google Pay)
  - Bank Transfer
  - Cash at counter
- [ ] Order summary with price breakdown
  - Base fare × passengers
  - Service fee
  - Tax
  - Total amount
- [ ] Promo code/discount field
- [ ] Payment form (card details)
- [ ] Loading states during payment processing
- [ ] Payment success/failure handling
- [ ] Retry mechanism for failed payments

**UI Components:**
- ```PaymentMethodSelector.tsx```
- ```OrderSummary.tsx```
- ```CardPaymentForm.tsx```

**API Endpoints:**
- ```POST /api/payments/create``` - Create payment intent
- ```POST /api/payments/confirm``` - Confirm payment
- ```POST /api/payments/refund``` - Process refunds

---

### 1.3 E-Ticket/Boarding Pass
**File:** `app/booking/confirmation/[bookingId]/page.tsx` enhancement

**Features Needed:**
- [ ] Generate professional e-ticket
- [ ] QR code for boarding (scan at bus station)
- [ ] Download as PDF
- [ ] Email ticket automatically
- [ ] SMS ticket details
- [ ] Add to Apple Wallet/Google Pay
- [ ] Print-friendly version
- [ ] Boarding point details
- [ ] Dropping point details
- [ ] Bus operator contact info
- [ ] Cancellation policy info
- [ ] Terms & conditions

**UI Components:**
- ```ETicket.tsx``` - Ticket display component
- ```QRCodeGenerator.tsx``` - QR code for boarding
- ```DownloadTicket.tsx``` - PDF download button
- ```ShareTicket.tsx``` - Email/SMS share

**Libraries to Add:**
- ```qrcode``` - Generate QR codes
- ```jspdf``` - PDF generation
- ```html2canvas``` - Capture ticket as image

---

## 🔍 Phase 2: Enhanced Search & Filtering (HIGH PRIORITY)

### 2.1 Advanced Filters
**File:** `app/search/page.tsx` enhancement

**Filters Needed:**
- [ ] **Bus Type Filter**
  - Seater (Mini Bus, Coaster)
  - Sleeper (AC Sleeper, Non-AC Sleeper)
  - Both types
- [ ] **Price Range Filter**
  - Slider or min/max inputs
  - Show price per seat
- [ ] **Departure Time Filter**
  - Morning (6AM - 12PM)
  - Afternoon (12PM - 6PM)
  - Evening (6PM - 12AM)
  - Night (12AM - 6AM)
- [ ] **Duration Filter**
  - Shortest first
  - Longest first
- [ ] **Amenities Filter**
  - WiFi
  - Charging Points
  - AC / Non-AC
  - Reclining Seats
  - Blanket (for sleeper)
  - Water Bottle
  - TV Entertainment
- [ ] **Operator Rating**
  - 4+ stars
  - 3+ stars
  - All ratings

**UI Components:**
- ```FilterSidebar.tsx``` - Collapsible filter panel
- ```PriceRangeSlider.tsx``` - Price filter
- ```AmenityBadges.tsx``` - Amenity icons
- ```TimeSlots.tsx``` - Departure time slots

---

### 2.2 Sorting Options
**Sorting Options:**
- [ ] Price: Low to High
- [ ] Price: High to Low
- [ ] Duration: Shortest First
- [ ] Duration: Longest First
- [ ] Departure: Early to Late
- [ ] Departure: Late to Early
- [ ] Rating: High to Low
- [ ] Seats Available: Most to Least

---

### 2.3 Enhanced Bus Cards
**Additional Information on Cards:**
- [ ] Bus operator logo/name
- [ ] Operator rating (stars)
- [ ] Total reviews count
- [ ] Amenities icons (WiFi, AC, etc.)
- [ ] Boarding point name
- [ ] Dropping point name
- [ ] Distance from user location
- [ ] Live seat availability counter
- [ ] "Fast filling" badge for < 5 seats
- [ ] "Most popular" badge based on bookings

---

## 📱 Phase 3: User Dashboard Enhancements (MEDIUM PRIORITY)

### 3.1 Enhanced Booking History
**File:** `app/dashboard/page.tsx` enhancement

**Features Needed:**
- [ ] Tabbed interface:
  - Upcoming Trips
  - Completed Trips
  - Cancelled Trips
- [ ] Booking status badges:
  - Confirmed
  - Pending Payment
  - Cancelled
  - Refunded
- [ ] Quick actions per booking:
  - View ticket
  - Download ticket
  - Cancel booking
  - Reschedule (if allowed)
  - Write review
- [ ] Filter by date range
- [ ] Search bookings
- [ ] Sort by date/status

---

### 3.2 Cancellation & Refund
**New File:** `app/booking/[bookingId]/cancel/page.tsx`

**Features Needed:**
- [ ] Cancellation policy display
- [ ] Refund amount calculator
  - Full refund if cancelled 24h before
  - 50% refund if cancelled 6-24h before
  - No refund if cancelled < 6h before
- [ ] Cancellation reason dropdown
- [ ] Confirm cancellation dialog
- [ ] Refund processing animation
- [ ] Cancellation confirmation
- [ ] Email/SMS notification

**API Endpoints:**
- ```POST /api/bookings/[id]/cancel``` - Cancel booking
- ```POST /api/bookings/[id]/refund``` - Process refund

---

### 3.3 Booking Reschedule
**New File:** `app/booking/[bookingId]/reschedule/page.tsx`

**Features Needed:**
- [ ] Select new travel date
- [ ] Show available buses on new date
- [ ] Price difference calculation
- [ ] Pay extra or get refund
- [ ] Confirm reschedule
- [ ] Update ticket with new details

**API Endpoints:**
- ```POST /api/bookings/[id]/reschedule``` - Reschedule booking

---

### 3.4 User Profile
**New File:** `app/profile/page.tsx`

**Features Needed:**
- [ ] Edit personal details:
  - Name
  - Email
  - Phone number
  - Date of birth
  - Gender
- [ ] Change password
- [ ] Upload profile photo
- [ ] Manage saved addresses (boarding points)
- [ ] Notification preferences:
  - Email notifications
  - SMS notifications
  - Promotional emails
  - Trip reminders
- [ ] Delete account (with confirmation)

**API Endpoints:**
- ```PUT /api/user/profile``` - Update profile
- ```PUT /api/user/password``` - Change password
- ```DELETE /api/user/account``` - Delete account

---

## 💳 Phase 4: Payment System Integration (MEDIUM PRIORITY)

### 4.1 Payment Gateway Integration
**Options:**
- Stripe (International)
- PayPal
- Local payment gateways (ABA Bank, Wing, Acleda for Cambodia)

**Features:**
- [ ] Credit/Debit card payments
- [ ] Mobile wallet integration
- [ ] Net banking
- [ ] UPI (if India)
- [ ] Payment page hosting
- [ ] Webhook handling for payment status
- [ ] Transaction history
- [ ] Receipt generation
- [ ] Automatic refunds

**API Endpoints:**
- ```POST /api/payments/create-intent```
- ```POST /api/payments/webhook```
- ```GET /api/payments/[id]/status```

---

### 4.2 Wallet System (Optional)
**Features:**
- [ ] User wallet balance
- [ ] Add money to wallet
- [ ] Pay from wallet
- [ ] Wallet transaction history
- [ ] Cashback & rewards
- [ ] Refund to wallet

---

## 🚌 Phase 5: Route & Bus Enhancements (MEDIUM PRIORITY)

### 5.1 Boarding & Dropping Points
**Current:** Only shows city-to-city
**Needed:** Point-to-point

**Features:**
- [ ] Multiple boarding points per route
  - Central bus station
  - Airport
  - Major landmarks
- [ ] Multiple dropping points
- [ ] Map integration showing points
- [ ] Select boarding/dropping point during booking
- [ ] Show distance from user location
- [ ] Time to reach boarding point

**Data Model Update:**
```typescript
Route {
  boardingPoints: [{ name, address, lat, lng, time }]
  droppingPoints: [{ name, address, lat, lng, time }]
}
```

---

### 5.2 Bus Operator Profiles
**New File:** `app/operator/[operatorId]/page.tsx`

**Features:**
- [ ] Operator details page:
  - Company name & logo
  - Rating & reviews
  - Total years in operation
  - Fleet size
  - Safety record
  - Contact information
- [ ] All buses by this operator
- [ ] Amenities they offer
- [ ] Popular routes

---

### 5.3 Bus Amenities Display
**Current:** Basic bus type
**Needed:** Detailed amenities

**Amenities to Show:**
- [ ] AC / Non-AC
- [ ] WiFi availability
- [ ] Charging points
- [ ] Reading light
- [ ] TV entertainment
- [ ] Blanket & pillow (sleeper)
- [ ] Water bottle
- [ ] Snacks/meals included
- [ ] Emergency exit
- [ ] First aid kit
- [ ] CCTV cameras
- [ ] GPS tracking

**UI Components:**
- ```AmenitiesList.tsx``` - Grid of amenity icons with labels
- ```AmenitiesBadge.tsx``` - Compact badge for card

---

## 🔔 Phase 6: Notifications & Communication (MEDIUM PRIORITY)

### 6.1 Email Notifications
**Email Templates Needed:**
- [ ] Booking confirmation
- [ ] Ticket e-ticket
- [ ] Payment confirmation
- [ ] Booking cancellation
- [ ] Refund confirmation
- [ ] Trip reminder (24h before)
- [ ] Trip reminder (2h before)
- [ ] Reschedule confirmation
- [ ] Promotional emails
- [ ] Password reset
- [ ] Account verification

**Libraries:**
- ```nodemailer``` or ```sendgrid```
- ```react-email``` for email templates

---

### 6.2 SMS Notifications
**SMS Triggers:**
- [ ] Booking confirmation
- [ ] Ticket details (short version)
- [ ] Trip reminder
- [ ] Cancellation confirmation
- [ ] Refund confirmation
- [ ] OTP for login/booking

**SMS Gateway:**
- Twilio
- Local SMS API (Cambodia: Smart, Cellcard)

---

### 6.3 Push Notifications (Web)
**Features:**
- [ ] Browser push notifications
- [ ] Trip reminders
- [ ] Booking updates
- [ ] Promotional offers
- [ ] Permission request UI

**Libraries:**
- ```web-push```
- Service worker implementation

---

## ⭐ Phase 7: Reviews & Ratings (LOW PRIORITY)

### 7.1 Bus & Operator Ratings
**New File:** `app/bus/[busId]/reviews/page.tsx`

**Features:**
- [ ] Submit review after trip completion
- [ ] Rate on:
  - Overall experience (1-5 stars)
  - Bus cleanliness
  - Staff behavior
  - Punctuality
  - Safety
- [ ] Write text review
- [ ] Upload photos
- [ ] See all reviews for bus/operator
- [ ] Filter reviews by rating
- [ ] Helpful votes on reviews
- [ ] Report inappropriate reviews

**Data Model:**
```typescript
Review {
  id: string
  userId: string
  busId: string
  bookingId: string
  rating: number
  categories: { cleanliness, staff, punctuality, safety }
  comment: string
  photos: string[]
  helpful: number
  createdAt: Date
}
```

---

### 7.2 User Profiles (Public)
**New File:** `app/user/[userId]/page.tsx` (Optional)

**Features:**
- [ ] Public user profile (optional)
- [ ] Total trips taken
- [ ] Reviews written
- [ ] Average rating given
- [ ] Favorite routes

---

## 📊 Phase 8: Admin Dashboard Enhancements (LOW PRIORITY)

### 8.1 Analytics Dashboard
**New File:** `app/admin/analytics/page.tsx`

**Metrics to Track:**
- [ ] Total bookings (today/week/month/year)
- [ ] Total revenue
- [ ] Average booking value
- [ ] Bus occupancy rate
- [ ] Popular routes
- [ ] Cancellation rate
- [ ] Customer satisfaction
- [ ] Payment method distribution

**Charts:**
- [ ] Booking trend (line chart)
- [ ] Revenue by month (bar chart)
- [ ] Route popularity (pie chart)
- [ ] Bus type distribution (donut chart)

**Libraries:**
- ```recharts``` or ```chart.js```
- ```date-fns``` for date calculations

---

### 8.2 Bus Route Management
**Current:** Basic CRUD
**Enhancements Needed:**
- [ ] Route distance calculator (Google Maps API)
- [ ] Duration calculator
- [ ] Multiple stops on route
- [ ] Route map visualization
- [ ] Fare calculator (distance-based)
- [ ] Duplicate route

---

### 8.3 Dynamic Pricing
**Features:**
- [ ] Price surge on peak days
- [ ] Early bird discounts
- [ ] Last-minute deals
- [ ] Seasonal pricing
- [ ] Route-based pricing rules
- [ ] Price history tracking

**Data Model:**
```typescript
PricingRule {
  id: string
  routeId: string
  busType: BusType
  basePrice: number
  surgeMultiplier: number
  discountPercent: number
  conditions: {
    daysBefore?: number
    peakDays?: Date[]
    offPeak?: boolean
  }
}
```

---

### 8.4 Customer Management
**New File:** `app/admin/customers/page.tsx`

**Features:**
- [ ] List all users
- [ ] View user profile
- [ ] User booking history
- [ ] User statistics (total bookings, spent)
- [ ] Block/unblock user
- [ ] Send email to user
- [ ] Add manual notes
- [ ] Export user data

---

### 8.5 Refund Management
**New File:** `app/admin/refunds/page.tsx`

**Features:**
- [ ] List all refund requests
- [ ] Approve/reject refunds
- [ ] Process refund manually
- [ ] Refund status tracking
- [ ] Refund history
- [ ] Export refund reports

---

## 🚐 Phase 9: Additional Features (NICE TO HAVE)

### 9.1 Multi-Language Support
- [ ] Khmer (Cambodia local language)
- [ ] English
- [ ] Chinese (for tourists)
- [ ] Thai
- [ ] Vietnamese

**Libraries:**
- ```next-intl``` or ```next-i18next```

---

### 9.2 Currency Converter
- [ ] Show prices in multiple currencies
- [ ] USD (primary)
- [ ] Cambodian Riel (KHR)
- [ ] Thai Baht (THB)
- [ ] Vietnamese Dong (VND)
- [ ] Live exchange rates

---

### 9.3 Loyalty Program
**Features:**
- [ ] Earn points per booking
- [ ] Redeem points for discounts
- [ ] Tier system (Silver, Gold, Platinum)
- [ ] Exclusive member benefits
- [ ] Birthday rewards
- [ ] Referral bonuses

---

### 9.4 Group Booking
**Features:**
- [ ] Book for 10+ passengers
- [ ] Custom quote request
- [ ] Group discount
- [ ] Dedicated support
- [ ] Flexible payment
- [ ] Modify group booking

---

### 9.5 Charter Bus
**Features:**
- [ ] Request entire bus charter
- [ ] Custom route planning
- [ ] Quote calculator
- [ ] Driver details
- [ ] Charter history

---

## 🔒 Phase 10: Security & Performance

### 10.1 Security Enhancements
- [ ] Rate limiting on API endpoints
- [ ] CSRF protection
- [ ] SQL injection prevention
- [ ] XSS protection
- [ ] Secure password hashing (bcrypt/argon2)
- [ ] Two-factor authentication (2FA)
- [ ] Session management
- [ ] GDPR compliance
- [ ] Data encryption at rest

---

### 10.2 Performance Optimization
- [ ] Image optimization (Next.js Image)
- [ ] Code splitting
- [ ] Lazy loading components
- [ ] Server-side rendering (SSR)
- [ ] Static site generation (SSG) where possible
- [ ] Caching strategy (Redis)
- [ ] CDN for static assets
- [ ] Database indexing
- [ ] API response caching

---

### 10.3 Error Handling & Logging
- [ ] Global error boundary
- [ ] API error logging (Sentry)
- [ ] User-friendly error messages
- [ ] 404 page
- [ ] 500 error page
- [ ] Logging service (Winston, Pino)

---

## 📱 Phase 11: Mobile App (Future)

### 11.1 React Native App
**Features:**
- [ ] All web features
- [ ] Push notifications
- [ ] Offline mode
- [ ] Biometric login
- [ ] QR code scanner for boarding
- [ ] Location-based features

---

## 🎯 Recommended Implementation Order

### **Week 1-2 (Immediate - Critical)**
1. ✅ Passenger details form (Phase 1.1)
2. ✅ Payment integration (mock) (Phase 1.2)
3. ✅ Enhanced booking confirmation (Phase 1.3)

### **Week 3-4 (High Priority)**
4. ✅ Advanced filters (Phase 2.1)
5. ✅ Sorting options (Phase 2.2)
6. ✅ Enhanced bus cards (Phase 2.3)

### **Week 5-6 (User Experience)**
7. ✅ Enhanced dashboard (Phase 3.1)
8. ✅ Cancellation system (Phase 3.2)
9. ✅ User profile (Phase 3.4)

### **Week 7-8 (Business Value)**
10. ✅ Boarding/dropping points (Phase 5.1)
11. ✅ Bus amenities (Phase 5.3)
12. ✅ Email notifications (Phase 6.1)

### **Week 9-10 (Advanced Features)**
13. ✅ Reviews & ratings (Phase 7)
14. ✅ Analytics dashboard (Phase 8.1)
15. ✅ Security enhancements (Phase 10.1)

---

## 🛠️ Tech Stack Additions Needed

**Libraries to Install:**
```bash
# PDF & QR Generation
npm install qrcode jspdf html2canvas

# Email
npm install nodemailer react-email

# SMS
npm install twilio

# Charts
npm install recharts

# Date Handling
npm install date-fns

# Forms
npm install react-hook-form zod

# Notifications
npm install web-push

# Internationalization
npm install next-intl

# Image Upload
npm install react-dropzone @uploadthing/react

# Testing
npm install @testing-library/react @testing-library/jest-dom
```

---

## 📊 Success Metrics

Track these metrics to measure success:

1. **Conversion Rate** - Visitors → Bookings
2. **Average Booking Value** - Revenue per booking
3. **Cancellation Rate** - Keep below 10%
4. **User Retention** - Repeat bookings
5. **Page Load Time** - Keep under 2 seconds
6. **Mobile Usage** - % mobile users
7. **Payment Success Rate** - Keep above 95%
8. **Customer Satisfaction** - Reviews rating

---

## 🎓 Next Steps

**Start with these 3 files:**

1. **`components/passenger-details-form.tsx`**
   - Multi-passenger form
   - Validation
   - Auto-fill user data

2. **`app/book/[busId]/review/page.tsx`**
   - Review booking before payment
   - Show all details
   - Edit passenger info

3. **`components/payment-form.tsx`**
   - Payment method selection
   - Card details form
   - Mock payment processing

Would you like me to implement any of these features next?
