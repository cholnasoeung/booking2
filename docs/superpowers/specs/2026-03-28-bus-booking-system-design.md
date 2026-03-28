# Bus Booking System - Design Specification

**Date:** 2026-03-28
**Type:** Full-stack web application
**Status:** Approved design

## Overview

A mini RedBus Cambodia-style bus ticket booking system allowing users to search buses, select seats, and book tickets online. Includes an admin panel for managing routes, buses, and viewing bookings.

## Tech Stack

- **Framework:** Next.js 14 App Router (TypeScript)
- **Database:** MongoDB + Mongoose
- **Authentication:** NextAuth.js (credentials provider)
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
- Maximum seats limited by availability

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

## Security

1. **Password Security**
   - Hash passwords with bcryptjs (cost factor: 10)
   - Never store plain text passwords

2. **API Protection**
   - Authenticated endpoints require valid session
   - Admin endpoints require admin role
   - Input validation on all endpoints

3. **Booking Integrity**
   - Atomic seat booking operations
   - Check seat availability before booking
   - Prevent double-booking

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

- **Form:** Form, Input, Label, Button
- **Layout:** Card, Tabs, Table, Dialog
- **Feedback:** Toast, Alert, Spinner
- **Navigation:** Navbar, Sidebar
- **Data Display:** Badge, Separator

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
- Each with unique departure times
- Random seat availability

### Users
- Admin: admin@bus.com / admin123
- Regular: user@bus.com / user123

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
