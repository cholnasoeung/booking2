# Bus Booking System - Design Specification

**Date:** 2026-03-28
**Type:** Full-stack web application
**Status:** Approved design

## Overview

A mini RedBus Cambodia-style bus ticket booking system allowing users to search buses, select seats, and book tickets online. Includes an admin panel for managing routes, buses, and viewing bookings.

## Tech Stack

- **Framework:** Next.js 14 App Router (TypeScript)
- **Database:** MongoDB + Mongoose
- **Authentication:** NextAuth.js (credentials provider only - Google OAuth deferred to future enhancement)
- **UI Library:** Tailwind CSS + shadcn/ui
- **Password Hashing:** bcryptjs

## Database Models

### User
```typescript
{
  name: string
  email: string (unique)
  password: string (hashed)
  role: "user" | "admin"
  createdAt: Date
}
```

### Route
```typescript
{
  from: string
  to: string
  duration: string (e.g., "6h 30m")
  distance: number (in km)
}
```

### Bus
```typescript
{
  routeId: ObjectId (ref: Route)
  date: Date
  departureTime: string (e.g., "08:00")
  arrivalTime: string (e.g., "14:30")
  totalSeats: number
  bookedSeats: number[]
  pricePerSeat: number
}
```

### Booking
```typescript
{
  userId: ObjectId (ref: User)
  busId: ObjectId (ref: Bus)
  seats: number[]
  totalPrice: number
  status: "confirmed" | "cancelled"
  createdAt: Date
}
```

## Application Structure

### Pages

1. **`/` (Home)** - Hero section with search form
   - Fields: From city, To city, Date, Number of passengers
   - RedBus-inspired design

2. **`/search`** - Search results page
   - Lists matching buses with: departure/arrival time, price, seats available, duration
   - Filters by date and route

3. **`/book/[busId]`** - Seat selection page
   - 2D seat grid (4 columns per row)
   - Color coding: Green (available), Red (taken), Yellow (selected)
   - Real-time price calculation
   - Confirm booking button (requires login)

4. **`/booking/confirmation/[bookingId]`** - Booking confirmation
   - Ticket summary with booking details

5. **`/dashboard`** - User's bookings
   - List of user's bookings with status
   - Cancel booking option
   - Cancellation rules: Can cancel up to 1 hour before departure
   - Cancelled seats become available immediately for other users
   - Cancellation status tracked as "cancelled" with original data preserved

6. **`/admin`** - Admin panel (admin role only)
   - Tabs: Manage Routes, Manage Buses, View All Bookings
   - CRUD operations for Routes and Buses

7. **`/login`** and **`/register`** - Authentication pages

### API Routes

```
POST /api/auth/register              - User registration
GET  /api/buses?from=&to=&date=      - Search buses
POST /api/bookings                   - Create booking (auth required)
GET  /api/bookings/me                - Get user's bookings (auth required)
DELETE /api/bookings/[id]            - Cancel booking (auth required)
POST /api/admin/routes               - Add route (admin only)
PUT  /api/admin/routes/[id]          - Update route (admin only)
DELETE /api/admin/routes/[id]        - Delete route (admin only)
POST /api/admin/buses                - Add bus (admin only)
PUT  /api/admin/buses/[id]           - Update bus (admin only)
DELETE /api/admin/buses/[id]         - Delete bus (admin only)
GET  /api/admin/bookings             - Get all bookings (admin only)
```

## Key Features

### 1. Search and Book Flow

1. User enters search criteria on home page
2. Searches available buses via API
3. Views results and selects a bus
4. Proceeds to seat selection page
5. Selects seats (real-time price update)
6. Logs in if not authenticated
7. Confirms booking
8. Receives booking confirmation

### 2. Seat Selection

- Grid layout: 4 seats per row (2-aisle-2 configuration)
- Visual feedback:
  - Green: Available seat
  - Red: Already booked
  - Yellow: Currently selected by user
- Click to toggle selection
- Dynamic total: `selectedSeats.length × bus.pricePerSeat`
- Maximum seats per booking: 10 seats (configurable)
- Maximum seats limited by availability
- No temporary seat reservation during selection (first-come-first-served on booking confirmation)
- Session timeout: 15 minutes of inactivity redirects to home
- Race condition handling: If seat is taken during selection, show error and refresh available seats

### 3. Admin Panel

Protected by admin role, three main sections:

**Manage Routes:**
- List all routes with from/to cities
- Add new route (from, to, duration, distance)
- Edit existing route
- Delete route (with confirmation if buses exist)

**Manage Buses:**
- List all buses with route, date, times
- Add new bus (select route, date, times, seats, price)
- Edit existing bus
- Delete bus (with confirmation if bookings exist)

**View All Bookings:**
- Paginated list of all bookings
- Filter by status, date, route
- View booking details

### 4. Authentication & Authorization

- NextAuth.js with credentials provider
- Email/password registration and login
- Password hashing with bcryptjs
- Protected routes via middleware:
  - `/dashboard` - authenticated users
  - `/book/*` - authenticated users
  - `/admin` - admin role only
- Session-based authentication

**Login Page (/login):**
- Email and password fields
- "Remember me" checkbox (extends session to 30 days)
- Link to registration page for new users
- Forgot password link (deferred to future enhancement - no password reset in MVP)
- Form validation: Email format, password required
- Error messages for invalid credentials

**Registration Page (/register):**
- Name, email, password, confirm password fields
- Password strength: Minimum 6 characters, no other restrictions
- Email uniqueness validation
- Form validation: Required fields, email format, password match
- Auto-login after successful registration
- Default role: "user"

### 5. Search Algorithm

**Search Behavior:**
- Exact matching for city names (case-insensitive)
- All fields optional: User can search with partial information
- If no buses found for exact date, show message (no nearby dates in MVP)
- Sorting order: Departure time (earliest first)
- No advanced filters in MVP (price, duration filters deferred)

**Search Query Logic:**
1. Find routes where `from` matches source city AND `to` matches destination city
2. Find buses on those routes for the specified date
3. Filter out buses with no available seats
4. Sort by departure time
5. Return results with bus details + route information (from, to, duration)

**Search Results Display:**
- Bus departure/arrival time
- Price per seat
- Number of seats available
- Route duration
- "Book Now" button linking to seat selection page
- Bus operator name: Not in MVP (deferred)
- Bus type/amenities: Not in MVP (deferred)

## Security

1. **Password Security**
   - Hash passwords with bcryptjs (cost factor: 10)
   - Never store plain text passwords

2. **API Protection**
   - Authenticated endpoints require valid session
   - Admin endpoints require admin role
   - Input validation on all endpoints

3. **Booking Integrity**
   - Atomic seat booking operations using MongoDB atomic update operators
   - Use `$addToSet` with conditional checks to prevent duplicate seat bookings
   - Check seat availability before booking
   - Prevent double-booking through atomic operations
   - On concurrent booking attempts for same seat: First request succeeds, second receives 409 Conflict error
   - Implement optimistic concurrency: Client retries on conflict (max 3 attempts)

4. **Data Validation**
   - Server-side validation on all inputs
   - Sanitize user inputs
   - Validate data types and ranges

## UI/UX Design

### Design Principles

- Mobile-first responsive design
- Clean, minimal interface
- High contrast for accessibility
- Loading states for all async operations
- Clear error messages and success feedback

### Component Library (shadcn/ui)

- **Form:** Form, Input, Label, Button, Select, Calendar (for date picker)
- **Layout:** Card, Tabs, Table, Dialog, Separator
- **Feedback:** Toast, Alert, Spinner
- **Navigation:** Navbar, Sidebar
- **Data Display:** Badge, Pagination
- **Form Validation:** React Hook Form + Zod schemas
- **Custom Components:** SeatGrid (custom implementation), Seat (custom button component)

### Color Scheme

- Primary: Blue/Indigo (brand color)
- Success: Green (available seats, confirmed bookings)
- Danger: Red (taken seats, cancelled bookings)
- Warning: Yellow/Orange (selected seats)
- Neutral: Gray (backgrounds, borders)

### Responsive Breakpoints

- Mobile: < 640px
- Tablet: 640px - 1024px
- Desktop: > 1024px

## Error Handling

### Client-Side

- Form validation with error messages
- Toast notifications for success/error
- Loading indicators during async operations
- Graceful fallbacks for failed API calls

### Server-Side

- Try-catch blocks in all API handlers
- Meaningful error messages
- Appropriate HTTP status codes
- Error logging for debugging

### Client-Side Error Boundaries

- React error boundary component to catch component errors
- Graceful error UI with "Go to Home" button
- Global error handler for uncaught promise rejections
- MongoDB connection failure: Show error page, retry connection button

### Database Connection Error Handling

- Retry logic: 3 retry attempts with exponential backoff
- Graceful degradation: Show maintenance page if connection fails after retries
- Connection pooling: Reuse connections for better performance
- Connection timeout: 10 seconds

## Seed Data

Initial data to be created via `/scripts/seed.ts`:

### Routes (5)
1. Phnom Penh → Siem Reap
2. Phnom Penh → Sihanoukville
3. Phnom Penh → Kampot
4. Siem Reap → Battambang
5. Phnom Penh → Poipet

### Buses (2 per route, tomorrow's date)
- Total: 10 buses
- Each with unique departure times (morning: 8:00, evening: 18:00)
- Total seats per bus: 40 seats
- Seat availability:
  - 60% of seats available (24 seats)
  - 40% pre-booked (16 seats) for realistic testing
- Include 1 fully booked bus for edge case testing
- Include 1 bus with only 1-2 seats for edge case testing
- Price per seat: $15-25 USD depending on route

### Users
- Admin: admin@bus.com / admin123
- Regular: user@bus.com / user123

## Environment Variables

Create `.env.local` file with:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/bus-booking

# NextAuth
NEXTAUTH_SECRET=your-random-secret-string-here
NEXTAUTH_URL=http://localhost:3000

# Optional: For production
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/bus-booking
```

**Generating NEXTAUTH_SECRET:**
- Run: `openssl rand -base64 32`
- Or use any random 32+ character string

## Database Indexes

For performance optimization, create these indexes:

**Route Model:**
- Compound index: `{ from: 1, to: 1 }` (for search queries)

**Bus Model:**
- Compound index: `{ routeId: 1, date: 1 }` (for search queries)
- Single index: `{ date: 1 }` (for date-based queries)

**Booking Model:**
- Single index: `{ userId: 1 }` (for user's bookings query)
- Single index: `{ busId: 1 }` (for booking lookups)
- Single index: `{ status: 1 }` (for admin filtering)

## Future Enhancements (Out of Scope for MVP)

The following features are explicitly deferred to future versions:

1. **Google OAuth Integration** - Add Google as authentication provider
2. **Payment Gateway** - Integrate payment processing (Wing, ABA Bank, etc.)
3. **Email Notifications** - Booking confirmation, cancellation emails
4. **SMS Notifications** - SMS alerts for booking updates
5. **Bus Operator Management** - Multi-operator support with operator profiles
6. **Bus Type & Amenities** - AC/Non-AC, Sleeper/Seater, WiFi, charging points
7. **Seat Type Preferences** - Window/aisle seat selection
8. **Advanced Search Filters** - Price range, duration, bus type filters
9. **Nearby Date Suggestions** - Show buses for dates near search date
10. **Password Reset Flow** - Email-based password reset
11. **Booking Reviews & Ratings** - User reviews for buses/routes
12. **Loyalty Program** - Points system, discounts for frequent travelers
13. **Mobile App** - React Native mobile application
14. **Real-time Seat Availability** - WebSocket for live updates
15. **Refund Management** - Automated refund processing for cancellations
16. **Multi-language Support** - Khmer, English language toggle
17. **Ticket PDF Generation** - Downloadable PDF tickets
18. **Advanced Admin Analytics** - Revenue reports, occupancy charts

## Implementation Phases

### Phase 1: Foundation
- Project setup and dependencies
- MongoDB connection
- Mongoose models
- Seed data script

### Phase 2: Authentication
- NextAuth configuration
- Register/login pages
- Protected route middleware

### Phase 3: Core Features
- Home page with search
- Search results page
- Seat selection page
- Booking creation API

### Phase 4: User Features
- Dashboard/My Bookings page
- Booking cancellation
- Booking confirmation page

### Phase 5: Admin Panel
- Admin layout and navigation
- Route management (CRUD)
- Bus management (CRUD)
- All bookings view

### Phase 6: Polish
- Responsive design improvements
- Loading states
- Error handling
- Toast notifications
- Testing and bug fixes

## Success Criteria

- Users can search for buses by route and date
- Users can select seats and book tickets
- Bookings are persisted and visible in dashboard
- Admin can manage routes and buses
- Admin can view all bookings
- All pages are mobile-responsive
- Authentication works correctly
- No booking conflicts (double-booking prevented)
