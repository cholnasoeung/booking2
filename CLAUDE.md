@AGENTS.md
# Bus Booking System

A mini RedBus-style bus ticket booking system built with:
- Next.js 14 App Router
- MongoDB + Mongoose
- NextAuth.js (credentials + Google)
- Tailwind CSS + shadcn/ui

## Key Features
1. Search buses by origin → destination + date
2. View available seats and select them
3. Book tickets (logged-in users only)
4. My Bookings dashboard
5. Admin panel to manage routes and buses

## DB Models
- User: name, email, password, role
- Route: from, to, distance, duration
- Bus: routeId, departureTime, seats[], price, date
- Booking: userId, busId, seats[], totalPrice, status, createdAt
```

**3. Paste this as your first Claude Code prompt:**
```
Build a mini bus ticket booking system based on CLAUDE.md.

Start with:
1. Install dependencies: mongoose, next-auth, bcryptjs, @types/bcryptjs
2. Create lib/mongodb.ts for MongoDB connection using MONGODB_URI env var
3. Create Mongoose models: User, Route, Bus, Booking in /models/
4. Set up NextAuth in app/api/auth/[...nextauth] with credentials provider
5. Build the homepage with a search form (From city, To city, Date, Passengers)
6. Create /search/results page showing matching buses with price and seats available
7. Create /book/[busId] page with seat selector grid (available/taken/selected)
8. Create /dashboard/my-bookings page showing user's booking history
9. Create /admin page to add routes and buses (admin role only)
10. Add a Navbar with login/logout and links

Use shadcn/ui for UI components. Keep it clean and mobile-friendly.