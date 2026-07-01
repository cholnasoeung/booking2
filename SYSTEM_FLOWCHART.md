```
╔══════════════════════════════════════════════════════════════════════════╗
║                      BUS BOOKING SYSTEM                                  ║
║                  Complete System Flow Diagram                            ║
╚══════════════════════════════════════════════════════════════════════════╝
                                    │
                ┌───────────────────┼───────────────────┐
                ▼                   ▼                   ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │  CUSTOMER    │   │    ADMIN     │   │    PUBLIC    │
        │   PORTAL     │   │    PANEL     │   │   PAGES      │
        └──────────────┘   └──────────────┘   └──────────────┘
                │                   │                   │
                ▼                   ▼                   ▼
        ┌──────────────┐   ┌──────────────┐   ┌──────────────┐
        │   /dashboard │   │   /admin     │   │  / (Home)    │
        │   /book      │   │   /admin?tab │   │  /search     │
        │   /booking   │   │             │   │  /support    │
        └──────────────┘   └──────────────┘   └──────────────┘


══════════════════════════════════════════════════════════════════════════
 1. USER AUTHENTICATION
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │                Visit Website                         │
        └─────────────────────────────────────────────────────┘
                                    │
                        ┌───────────┴───────────┐
                        ▼                       ▼
              ┌──────────────────┐    ┌──────────────────────┐
              │  NEW USER        │    │  EXISTING USER        │
              │  /register       │    │  /login               │
              └──────────────────┘    └──────────────────────┘
                        │                       │
                        ▼                       ▼
              ┌──────────────────┐    ┌──────────────────────┐
              │ Fill: Name       │    │ Enter: Email          │
              │ Email / Password │    │ Password              │
              │ Phone Number     │    └──────────────────────┘
              └──────────────────┘               │
                        │                        ▼
                        ▼               ┌──────────────────┐
              ┌──────────────────┐      │  Credentials     │
              │ Hash Password    │      │  Valid?          │
              │ (bcrypt)         │      └──────────────────┘
              └──────────────────┘           /        \
                        │                  Yes         No
                        ▼                   │           │
              ┌──────────────────┐          │           ▼
              │ Save User to DB  │          │    ┌─────────────────┐
              │ isEmailVerified  │          │    │ Error: Invalid  │
              │ = false          │          │    │ Credentials     │
              └──────────────────┘          │    └─────────────────┘
                        │                   │
                        ▼                   ▼
              ┌──────────────────┐  ┌──────────────────────┐
              │ Send Verification│  │  Account Suspended?   │
              │ Email with Token │  └──────────────────────┘
              └──────────────────┘       /         \
                        │              Yes           No
                        ▼               │             │
              ┌──────────────────┐      ▼             ▼
              │ User Clicks Link │  ┌────────┐  ┌──────────────┐
              │ /verify-email    │  │ Block  │  │ Create JWT   │
              │ ?token=xxx       │  │ Login  │  │ Session      │
              └──────────────────┘  └────────┘  └──────────────┘
                        │                              │
                        ▼                              ▼
              ┌──────────────────┐          ┌──────────────────┐
              │ isEmailVerified  │          │   USER ROLE?     │
              │ = true           │          └──────────────────┘
              └──────────────────┘            /            \
                        │                  admin            user
                        ▼                   │                │
                 ┌────────────┐             ▼                ▼
                 │  Login Now │      ┌────────────┐  ┌────────────────┐
                 └────────────┘      │   /admin   │  │  /dashboard or │
                                     │   Panel    │  │  callbackUrl   │
                                     └────────────┘  └────────────────┘


══════════════════════════════════════════════════════════════════════════
 2. BUS SEARCH & RESULTS
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │            Homepage Search Form                      │
        │     From City / To City / Date / Passengers          │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │              GET /search/results                     │
        │   Query: Route match + Date + Status ≠ cancelled     │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │   Buses Found?       │
                        └─────────────────────┘
                             /           \
                           Yes            No
                            │              │
                            ▼              ▼
                ┌──────────────────┐  ┌─────────────────────┐
                │ Show Bus List    │  │ No buses available  │
                │ ├ Route info     │  │ Suggest other dates │
                │ ├ Departure time │  └─────────────────────┘
                │ ├ Arrival time   │
                │ ├ Bus type       │
                │ ├ Seats left     │
                │ ├ Price per seat │
                │ ├ Amenities      │
                │ └ Rating stars   │
                └──────────────────┘
                            │
                            ▼
                ┌──────────────────────┐
                │   User Logged In?    │
                └──────────────────────┘
                       /        \
                     Yes         No
                      │           │
                      │           ▼
                      │  ┌──────────────────┐
                      │  │ Redirect /login  │
                      │  │ ?callbackUrl=... │
                      │  └──────────────────┘
                      │           │
                      └─────┬─────┘
                            ▼
                 ┌──────────────────────┐
                 │  Click Select Bus    │
                 │  → /book/busId       │
                 └──────────────────────┘


══════════════════════════════════════════════════════════════════════════
 3. SEAT SELECTION
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │               /book/[busId]                          │
        │           Load Seat Map from DB                      │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
                        ┌─────────────────────┐
                        │    Bus Full?         │
                        └─────────────────────┘
                             /           \
                           No             Yes
                            │              │
                            ▼              ▼
                ┌──────────────────┐  ┌──────────────────────┐
                │ Show Seat Grid   │  │  Already on Waitlist? │
                │ ■ Available      │  └──────────────────────┘
                │ ■ Booked (grey)  │       /         \
                │ ■ Blocked (red)  │     Yes          No
                │ ■ Business tier  │      │            │
                │ ■ VIP tier       │      ▼            ▼
                └──────────────────┘ ┌────────┐ ┌───────────────┐
                            │        │Already │ │ Join Waitlist │
                            ▼        │Listed  │ │ POST/api/     │
                ┌──────────────────┐ └────────┘ │ waitlist      │
                │  User Clicks     │            └───────────────┘
                │  Seat(s)         │                    │
                └──────────────────┘                    ▼
                            │            ┌──────────────────────┐
                            ▼            │ WaitingList saved    │
                ┌──────────────────┐     │ Notified when seat   │
                │  Seat Available? │     │ becomes free (24h)   │
                └──────────────────┘     └──────────────────────┘
                       /        \
                     Yes         No
                      │           │
                      ▼           ▼
               ┌──────────┐ ┌──────────────┐
               │ Seat     │ │ Cannot select│
               │ selected │ │ (greyed out) │
               │ (green)  │ └──────────────┘
               └──────────┘
                      │
                      ▼
           ┌──────────────────────────┐
           │ Max seats reached?       │
           │ (from Settings)          │
           └──────────────────────────┘
                 /            \
               No              Yes
                │               │
                ▼               ▼
         ┌──────────┐   ┌──────────────────┐
         │ Continue │   │ Warning: Max X   │
         │ selecting│   │ seats per booking│
         └──────────┘   └──────────────────┘
                │
                ▼
         ┌──────────────────────────────────┐
         │  Select Boarding Stop            │
         │  Select Dropping Stop            │
         └──────────────────────────────────┘
                │
                ▼
         ┌──────────────────────────────────┐
         │  Click Continue                  │
         │  → /book/busId/passengers        │
         │    ?seats=A1,A2                  │
         │    &boardingStop=...             │
         │    &droppingStop=...             │
         └──────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════
 4. PASSENGER DETAILS & PAYMENT
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │           /book/[busId]/passengers                   │
        │     Fill 1 form per selected seat                    │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Passenger Fields (per seat):                        │
        │  ├── Full Name                                       │
        │  ├── Age                                             │
        │  ├── Gender (Male / Female / Other)                  │
        │  ├── Contact Number                                  │
        │  ├── Email (optional)                                │
        │  └── ID Proof (optional)                             │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
                       ┌────────────────────────┐
                       │  Use Saved Passenger?   │
                       │  (from profile)         │
                       └────────────────────────┘
                              /         \
                            Yes          No
                             │            │
                             ▼            ▼
                    ┌──────────────┐  ┌──────────────┐
                    │ Auto-fill    │  │ Manual entry │
                    │ from saved   │  └──────────────┘
                    │ passenger    │
                    └──────────────┘
                                    │
                                    ▼
                       ┌────────────────────────┐
                       │   Apply Promo Code?     │
                       └────────────────────────┘
                              /         \
                            Yes          No
                             │            │
                             ▼            │
                    ┌──────────────────┐  │
                    │ Validate Code    │  │
                    └──────────────────┘  │
                         /       \        │
                       Yes        No      │
                        │          │      │
                        ▼          ▼      │
               ┌──────────────┐ ┌──────┐ │
               │ Show discount│ │Error │ │
               │ applied      │ │msg   │ │
               └──────────────┘ └──────┘ │
                        │                │
                        └────────┬───────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Confirm & Pay Button  │
                    │  Server Action fires   │
                    └────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │  Check seats still     │
                    │  available in DB       │
                    └────────────────────────┘
                           /          \
                         Yes           No
                          │             │
                          │             ▼
                          │   ┌──────────────────────┐
                          │   │ Error: Seats taken   │
                          │   │ Return to seat map   │
                          │   └──────────────────────┘
                          │
                          ▼
                 ┌─────────────────────────┐
                 │  Active Payment Gateway? │
                 └─────────────────────────┘
                    /         |          \
                 Stripe     ABA Pay    None (Direct)
                   │           │            │
                   ▼           ▼            ▼
         ┌──────────────┐ ┌──────────┐ ┌──────────────────┐
         │Create Pending│ │Create    │ │ Create Booking   │
         │Booking (TTL  │ │Pending   │ │ Directly in DB   │
         │ 30 min)      │ │Booking   │ │ status=confirmed │
         └──────────────┘ └──────────┘ └──────────────────┘
                │               │               │
                ▼               ▼               ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐
         │Stripe Checkout│ │Generate      │ │Lock seats in Bus │
         │Session created│ │HMAC-SHA512   │ │ $addToSet        │
         │Redirect to   │ │Hash for form │ └──────────────────┘
         │Stripe page   │ └──────────────┘         │
         └──────────────┘         │                ▼
                │                 ▼        ┌──────────────────┐
                ▼         ┌──────────────┐ │Create Notification│
         ┌──────────────┐ │Store form in │ │booking_confirmed  │
         │  User Pays?  │ │sessionStorage│ └──────────────────┘
         └──────────────┘ └──────────────┘         │
               /    \             │                 ▼
             Yes     No           ▼        ┌──────────────────┐
              │       │  ┌──────────────┐  │/booking/         │
              │       │  │Redirect to   │  │confirmation/id   │
              │       │  │/book/busId/  │  └──────────────────┘
              │       │  │aba-pay       │
              │       │  └──────────────┘
              │       │          │
              ▼       ▼          ▼
         ┌────────┐ ┌────────┐ ┌──────────────────┐
         │Stripe  │ │Return  │ │Auto-submit form  │
         │Webhook │ │to form │ │to ABA PayWay     │
         │fires   │ └────────┘ │checkout.payway   │
         └────────┘            └──────────────────┘
              │                        │
              ▼                  ┌─────┴──────┐
         ┌──────────────┐       │  Result?   │
         │Verify Stripe │       └─────┬──────┘
         │Signature     │           /   \
         └──────────────┘       Success  Failed
              │                    │        │
              ▼                    ▼        ▼
         ┌──────────────┐  ┌──────────┐ ┌────────────────┐
         │Create Booking│  │ABA fires │ │/booking/       │
         │ status=      │  │callback  │ │payment-failed  │
         │ confirmed    │  │POST /api/│ └────────────────┘
         │paymentStatus=│  │payments/ │
         │ paid         │  │callback/ │
         └──────────────┘  │aba       │
              │            └──────────┘
              ▼                  │
         ┌──────────────┐        ▼
         │Mark Pending  │  ┌──────────────┐
         │Booking=paid  │  │Verify HMAC   │
         └──────────────┘  │Signature     │
              │            └──────────────┘
              ▼                  │
         ┌──────────────┐        ▼
         │Create        │  ┌──────────────┐
         │Notification  │  │Create Booking│
         └──────────────┘  └──────────────┘
              │                  │
              └────────┬─────────┘
                       ▼
              ┌──────────────────────┐
              │/booking/confirmation/│
              └──────────────────────┘


══════════════════════════════════════════════════════════════════════════
 5. BOOKING CONFIRMATION & TICKET
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │         /booking/confirmation/[bookingId]            │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Show Booking Summary                                │
        │  ├── Route (From → To)                              │
        │  ├── Date & Times                                    │
        │  ├── Boarding / Dropping Stops                       │
        │  ├── Seat Numbers                                    │
        │  ├── Passenger Details                               │
        │  ├── Total Price & Discount                          │
        │  ├── Payment Method                                  │
        │  ├── Booking Status Badge                            │
        │  └── QR Code (for check-in)                         │
        └─────────────────────────────────────────────────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
         ┌──────────────────┐ ┌───────────┐ ┌───────────────┐
         │ Download Ticket  │ │View My    │ │ Cancel Booking│
         │ (PDF)            │ │Bookings   │ └───────────────┘
         └──────────────────┘ └───────────┘         │
                  │                                   ▼
                  ▼                      ┌──────────────────────┐
         ┌──────────────────┐            │ Within Cancellation  │
         │GET /api/bookings │            │ Window?              │
         │/id/ticket        │            └──────────────────────┘
         └──────────────────┘                  /          \
                  │                          Yes            No
                  ▼                           │              │
         ┌──────────────────┐                 ▼              ▼
         │ Generate PDF     │        ┌──────────────┐ ┌───────────────┐
         │ with jsPDF       │        │ Confirm      │ │ Cannot cancel │
         │ + QR Code        │        │ Dialog       │ │ Too late      │
         └──────────────────┘        └──────────────┘ └───────────────┘
                  │                           │
                  ▼                           ▼
         ┌──────────────────┐        ┌──────────────────────┐
         │ Browser downloads│        │ Calculate Refund %   │
         │ ticket.pdf       │        │ > 48h → 100%         │
         └──────────────────┘        │ > 24h → 75%          │
                                     │ >  4h → 50%          │
                                     │ <  4h →  0%          │
                                     └──────────────────────┘
                                                │
                                                ▼
                                     ┌──────────────────────┐
                                     │ Update Booking:      │
                                     │ status = cancelled   │
                                     │ refundAmount = X     │
                                     │ refundStatus=pending │
                                     └──────────────────────┘
                                                │
                                                ▼
                                     ┌──────────────────────┐
                                     │ Release Seats from   │
                                     │ Bus.bookedSeats       │
                                     └──────────────────────┘
                                                │
                                                ▼
                                     ┌──────────────────────┐
                                     │ Create Notification  │
                                     │ booking_cancelled    │
                                     └──────────────────────┘
                                                │
                                     ┌──────────┴──────────┐
                                     ▼                     ▼
                              ┌────────────┐     ┌──────────────────┐
                              │ Notify     │     │ Admin reviews    │
                              │ Waitlist   │     │ refund in panel  │
                              │ users      │     └──────────────────┘
                              └────────────┘


══════════════════════════════════════════════════════════════════════════
 6. ADMIN — ROUTES & BUS MANAGEMENT
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │               Admin Panel / Routes Tab               │
        └─────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │  Add Route   │       │  Edit Route  │       │ Delete Route │
    └──────────────┘       └──────────────┘       └──────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │ From / To    │       │ Update any   │       │ Has buses?   │
    │ Duration     │       │ field        │       └──────────────┘
    │ Distance(km) │       └──────────────┘            /     \
    └──────────────┘               │                 Yes      No
            │                      ▼                  │       │
            ▼               ┌────────────┐            ▼       ▼
    ┌──────────────┐         │PATCH /api/ │        ┌──────┐ ┌──────┐
    │POST /api/    │         │admin/routes│        │Error │ │DELETE│
    │admin/routes  │         │/id         │        └──────┘ └──────┘
    └──────────────┘         └────────────┘


        ┌─────────────────────────────────────────────────────┐
        │               Admin Panel / Buses Tab                │
        └─────────────────────────────────────────────────────┘
                                    │
        ┌───────────────────────────┼─────────────────────────┐
        ▼               ▼           ▼           ▼             ▼
┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐ ┌──────────────┐
│  Add Bus    │ │ Edit Bus │ │Block Seat│ │ Del Bus │ │  Announce    │
└─────────────┘ └──────────┘ └──────────┘ └─────────┘ └──────────────┘
        │               │           │           │              │
        ▼               ▼           ▼           ▼              ▼
┌─────────────┐ ┌──────────┐ ┌──────────┐ ┌─────────┐  (see Section 8)
│ Select:     │ │ Update:  │ │Add seat  │ │Confirm  │
│ Route       │ │ Driver   │ │to        │ │no active│
│ Date        │ │ Price    │ │blockedSea│ │bookings │
│ Times       │ │ Status   │ │ts array  │ └─────────┘
│ Bus Type    │ │ Bus Type │ └──────────┘
│ Seats       │ └──────────┘
│ Price       │
│ Driver      │
│ BusDetail   │
│ Amenities   │
│ Stops       │
└─────────────┘


══════════════════════════════════════════════════════════════════════════
 7. FLEET MANAGEMENT (BUS DETAILS)
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │           Admin Panel / Bus Details Tab              │
        │         (Physical Vehicle Registry)                  │
        └─────────────────────────────────────────────────────┘
                                    │
            ┌───────────────────────┼───────────────────────┐
            ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │  Add Vehicle │       │  Maintenance │       │  Fuel Logs   │
    │  Register    │       │  Records     │       │              │
    └──────────────┘       └──────────────┘       └──────────────┘
            │                       │                       │
            ▼                       ▼                       ▼
    ┌──────────────┐       ┌──────────────┐       ┌──────────────┐
    │ Name         │       │ Type:        │       │ Date         │
    │ Registration │       │ oil_change   │       │ Liters       │
    │ Number       │       │ tire / brake │       │ Price/Liter  │
    │ Bus Type     │       │ engine       │       │ Total Cost   │
    │ Total Seats  │       │ inspection   │       │ Odometer     │
    │ Amenities    │       │ electrical   │       │ Station      │
    │ Images       │       │ bodywork     │       │ Driver       │
    │ Documents:   │       │ Status:      │       └──────────────┘
    │ ├ Insurance  │       │ scheduled    │
    │ ├ Road Tax   │       │ in_progress  │       ┌──────────────┐
    │ ├ Inspection │       │ completed    │       │  Incidents   │
    │ ├ Permit     │       │ Cost / Date  │       └──────────────┘
    │ └ Other docs │       │ Workshop     │               │
    └──────────────┘       │ Next Service │               ▼
                           └──────────────┘       ┌──────────────┐
                                                   │ Type:        │
                                                   │ breakdown    │
                                                   │ accident     │
                                                   │ flat_tire    │
                                                   │ engine_fail  │
                                                   │ Severity:    │
                                                   │ low/med/high │
                                                   │ Status:      │
                                                   │ open/resolved│
                                                   └──────────────┘


══════════════════════════════════════════════════════════════════════════
 8. DRIVER MANAGEMENT
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │           Admin Panel / Drivers Tab                  │
        └─────────────────────────────────────────────────────┘
                                    │
              ┌─────────────────────┼──────────────────────┐
              ▼                     ▼                      ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │  Driver Profile  │  │ Driver Schedule  │  │ Driver Earnings  │
    └──────────────────┘  └──────────────────┘  └──────────────────┘
              │                     │                      │
              ▼                     ▼                      ▼
    ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
    │ Name             │  │ Assign Driver to │  │ Date             │
    │ Phone            │  │ BusDetail        │  │ Regular Trips    │
    │ License Number   │  │ Bus (trip)       │  │ Overtime Trips   │
    │ Vehicle Number   │  │ Date             │  │ Base Pay         │
    │ Photo/Avatar     │  │ Shift Start/End  │  │ Overtime Rate    │
    │ Status:          │  │ Status:          │  │ Regular Earnings │
    │ active/inactive  │  │ scheduled        │  │ Overtime Earnings│
    └──────────────────┘  │ active           │  │ Total Earnings   │
                          │ completed        │  └──────────────────┘
                          │ cancelled        │
                          │ no_show          │
                          └──────────────────┘


══════════════════════════════════════════════════════════════════════════
 9. EMPLOYEE & PAYROLL (HR)
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / Employees Tab                 │
        └─────────────────────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
         ┌────────────────────┐       ┌────────────────────┐
         │  Employee Records  │       │    Payroll Tab      │
         └────────────────────┘       └────────────────────┘
                     │                             │
                     ▼                             ▼
         ┌────────────────────┐       ┌────────────────────┐
         │ Name / Phone       │       │ Select Employee    │
         │ Email / Avatar     │       │ Select Month       │
         │ Role:              │       │ Base Salary        │
         │ ├ driver           │       │ Allowances:        │
         │ ├ mechanic         │       │ ├ Transport        │
         │ ├ ticket_agent     │       │ ├ Meal             │
         │ ├ manager          │       │ ├ Housing          │
         │ ├ accountant       │       │ └ Other            │
         │ └ other            │       │ Deductions:        │
         │ Department:        │       │ ├ Tax              │
         │ ├ operations       │       │ ├ Insurance        │
         │ ├ finance          │       │ ├ Advance          │
         │ ├ maintenance      │       │ └ Other            │
         │ ├ admin            │       │ Bonus              │
         │ └ customer_service │       │ Gross / Net Pay    │
         │ Status:            │       │ Status:            │
         │ ├ active           │       │ ├ draft            │
         │ ├ on_leave         │       │ ├ approved         │
         │ ├ resigned         │       │ └ paid             │
         │ └ terminated       │       └────────────────────┘
         │ Salary / Allowances│
         └────────────────────┘


══════════════════════════════════════════════════════════════════════════
 10. ANNOUNCEMENT & MULTI-CHANNEL NOTIFICATION
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │   Admin clicks Announce on a Bus                     │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Select Announcement Type                            │
        │  ├── ⏳ Delay (enter delay minutes)                  │
        │  ├── 📍 Platform / Boarding Change                   │
        │  ├── 📢 General Update                               │
        │  └── ⚠️  Cancellation Warning                        │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Write Message → Click Send                          │
        │  POST /api/admin/buses/id/announce                   │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
                      ┌─────────────────────────┐
                      │  Type = Delay?           │
                      └─────────────────────────┘
                             /           \
                           Yes            No
                            │              │
                            ▼              │
              ┌────────────────────────┐   │
              │ Update Bus:            │   │
              │ departureStatus=delayed│   │
              │ delayMinutes = N       │   │
              └────────────────────────┘   │
                            │              │
                            └──────┬───────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │ Load all confirmed bookings  │
                    │ for this bus                 │
                    └─────────────────────────────┘
                                   │
                    ┌──────────────┼──────────────┐
                    ▼              ▼              ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │  1. EMAIL    │ │2. IN-APP     │ │  3. SMS      │
         │              │ │NOTIFICATION  │ │  (Twilio)    │
         └──────────────┘ └──────────────┘ └──────────────┘
                  │               │               │
                  ▼               ▼               ▼
         ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
         │ Has email?   │ │ Has user     │ │ Twilio ON?   │
         └──────────────┘ │ account?     │ │ User has     │
              /    \      └──────────────┘ │ phone?       │
            Yes     No         /    \      └──────────────┘
             │       │       Yes     No        /    \
             ▼       ▼        │      │       Yes     No
         ┌──────┐ ┌──────┐    ▼      ▼        │      │
         │Send  │ │Skip  │ ┌──────┐ ┌──────┐  ▼      ▼
         │HTML  │ │Email │ │Save  │ │Skip  │┌──────┐ ┌──────┐
         │Email │ └──────┘ │Notif │ │Notif ││POST  │ │Skip  │
         │via   │          │to DB │ └──────┘│Twilio│ │SMS   │
         │Resend│          └──────┘         │API   │ └──────┘
         └──────┘                           └──────┘
                    │               │               │
                    └───────────────┴───────────────┘
                                   │
                                   ▼
                    ┌─────────────────────────────┐
                    │  Response:                   │
                    │  { totalPassengers, sent,    │
                    │    smsSent, smsEnabled }      │
                    └─────────────────────────────┘


══════════════════════════════════════════════════════════════════════════
 11. IN-APP NOTIFICATION BELL
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │  Notification Bell (Navbar — visible when logged in) │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Poll GET /api/notifications every 30 seconds        │
        │  Show red badge with unread count                    │
        └─────────────────────────────────────────────────────┘
                                    │
                              User clicks bell
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Dropdown opens — shows last 20 notifications        │
        │  Types:                                              │
        │  ├── 📢 announcement (indigo icon)                   │
        │  ├── ✅ booking_confirmed (green icon)               │
        │  ├── ❌ booking_cancelled (red icon)                 │
        │  ├── 🚌 trip_update (amber icon)                    │
        │  └── ℹ️  system (slate icon)                        │
        └─────────────────────────────────────────────────────┘
                                    │
                     ┌──────────────┼──────────────┐
                     ▼              ▼              ▼
           ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
           │Click single  │ │ Mark All     │ │  Close       │
           │notification  │ │ Read button  │ │  dropdown    │
           └──────────────┘ └──────────────┘ └──────────────┘
                     │              │
                     ▼              ▼
           ┌──────────────┐ ┌──────────────┐
           │PATCH /api/   │ │PATCH /api/   │
           │notifications │ │notifications │
           │{ id: xxx }   │ │{ action:     │
           │Mark as read  │ │ markAllRead }│
           └──────────────┘ └──────────────┘
                     │
                     ▼
           ┌──────────────────────────────┐
           │ Has bookingId?               │
           └──────────────────────────────┘
                  /         \
                Yes           No
                 │             │
                 ▼             ▼
        ┌──────────────┐  ┌──────────┐
        │Navigate to   │  │Stay on   │
        │/booking/     │  │page      │
        │confirmation/ │  └──────────┘
        │bookingId     │
        └──────────────┘

        Notification Created By:
        ├── Admin sends Announcement → booking_confirmed / trip_update
        ├── Booking created (no gateway) → booking_confirmed
        ├── Stripe webhook success → booking_confirmed
        └── ABA PayWay callback success → booking_confirmed


══════════════════════════════════════════════════════════════════════════
 12. USER & BOOKING ADMIN MANAGEMENT
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / Users Tab                     │
        └─────────────────────────────────────────────────────┘
                                    │
        ┌────────────────┬──────────┴──────────┬──────────────┐
        ▼                ▼                     ▼              ▼
┌──────────────┐ ┌──────────────┐   ┌──────────────┐ ┌──────────────┐
│ View Users   │ │ Suspend User │   │ Unsuspend    │ │ Change Role  │
│ Search/Filter│ └──────────────┘   │ User         │ │ user↔admin   │
└──────────────┘         │          └──────────────┘ └──────────────┘
                         ▼
                ┌──────────────────┐
                │ Enter Reason     │
                │ PATCH user:      │
                │ isSuspended=true │
                │ suspendedReason  │
                └──────────────────┘

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / Bookings Tab                  │
        └─────────────────────────────────────────────────────┘
                                    │
        ┌──────────┬──────────┬─────┴─────┬──────────┬────────┐
        ▼          ▼          ▼           ▼          ▼        ▼
┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐
│View All  │ │ Filter   │ │ Cancel   │ │ Refund   │ │ Export   │
│Bookings  │ │ by Status│ │ Booking  │ │ Process  │ │  CSV     │
└──────────┘ │ /Route   │ └──────────┘ └──────────┘ └──────────┘
             │ /Date    │       │             │
             └──────────┘       ▼             ▼
                        ┌──────────────┐ ┌──────────────────┐
                        │status=cancel │ │ Enter Refund Amt │
                        │Release seats │ │ Via Stripe API   │
                        └──────────────┘ │ or Manual        │
                                         └──────────────────┘


══════════════════════════════════════════════════════════════════════════
 13. CHECK-IN SYSTEM
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / Check-In Tab                  │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Select Bus for Today's Trips                        │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Show Passenger Manifest                             │
        │  ├── Name / Seat / Status                           │
        │  └── QR Code per booking                            │
        └─────────────────────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
         ┌──────────────────────┐     ┌──────────────────────┐
         │  Scan QR Code        │     │  Manual Lookup       │
         └──────────────────────┘     └──────────────────────┘
                     │                             │
                     └──────────────┬──────────────┘
                                    │
                                    ▼
                       ┌────────────────────────┐
                       │  Update CheckIn Status  │
                       │  ├── checked-in         │
                       │  ├── boarded            │
                       │  └── no-show            │
                       └────────────────────────┘
                                    │
                                    ▼
                       ┌────────────────────────┐
                       │ PATCH booking record    │
                       │ checkedInAt = now       │
                       │ checkedInBy = adminName │
                       └────────────────────────┘


══════════════════════════════════════════════════════════════════════════
 14. LOYALTY POINTS
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │           Booking Confirmed                          │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Loyalty.processBooking(userId, amount, bookingId)   │
        │  Award: 1 point per $1 spent                         │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
                     ┌─────────────────────────┐
                     │   lifetime points?       │
                     └─────────────────────────┘
                      /      /       \       \
                    ≥0   ≥1,000   ≥5,000  ≥10,000
                     │      │        │        │
                     ▼      ▼        ▼        ▼
              ┌──────────┐ ┌──────┐ ┌──────┐ ┌──────────┐
              │  BRONZE  │ │SILVER│ │ GOLD │ │PLATINUM  │
              │ 0% disc. │ │ 5%   │ │ 10%  │ │  15%     │
              │          │ │Prio  │ │+Free │ │+Extra    │
              │          │ │Supp. │ │Cancel│ │Baggage   │
              └──────────┘ └──────┘ └──────┘ └──────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │  /dashboard/loyalty page      │
                    │  ├── Current tier badge       │
                    │  ├── Points balance           │
                    │  ├── Points history           │
                    │  ├── Progress to next tier    │
                    │  └── Redeem points            │
                    └──────────────────────────────┘
                                    │
                                    ▼
                    ┌──────────────────────────────┐
                    │  Redeem at Checkout           │
                    │  Enter points to apply        │
                    │  POST /api/loyalty/redeem     │
                    │  points -= redeemed           │
                    └──────────────────────────────┘


══════════════════════════════════════════════════════════════════════════
 15. RATINGS & REVIEWS
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │   Trip Completed → Dashboard shows Rate Trip prompt  │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Rating Form (1 per booking — unique constraint)     │
        │  ├── Overall Rating: ★★★★★ (1–5 stars)             │
        │  ├── Punctuality  (1–5)                             │
        │  ├── Cleanliness  (1–5)                             │
        │  ├── Staff Behaviour (1–5)                          │
        │  ├── Comfort (1–5)                                  │
        │  ├── Written Review (optional, max 1000 chars)      │
        │  └── Would Recommend? (Yes / No)                    │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  POST /api/ratings                                   │
        │  Save Rating: status = pending (awaits admin review) │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Admin reviews in Ratings Tab                        │
        │  ├── Approve → status = approved → shows on bus     │
        │  ├── Reject  → status = rejected → hidden           │
        │  └── Reply   → add operator response                │
        └─────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════
 16. PROMO CODE MANAGEMENT
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / Promo Codes Tab               │
        └─────────────────────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
         ┌──────────────────────┐     ┌──────────────────────┐
         │   Create Promo Code  │     │   Manage Codes       │
         └──────────────────────┘     └──────────────────────┘
                     │                             │
                     ▼                             ▼
         ┌──────────────────────┐     ┌──────────────────────┐
         │ Code: SAVE20         │     │ ├── Edit             │
         │ Type:                │     │ ├── Deactivate       │
         │ ├── percentage (%)   │     │ └── View usage count │
         │ ├── fixed amount     │     └──────────────────────┘
         │ └── free_ticket      │
         │ Value: 20            │
         │ Max Uses: 100        │
         │ Min Booking Amt: $10 │
         │ Max Discount: $50    │
         │ Valid From / Until   │
         │ Applicable Routes    │
         │ Applicable Bus Types │
         └──────────────────────┘
                     │
                     ▼
         ┌──────────────────────────────────────────────────┐
         │  When user enters code at checkout:              │
         │  ├── Check isActive + within date range          │
         │  ├── Check usedCount < maxUses                   │
         │  ├── Check bookingAmount >= minBookingAmount      │
         │  ├── Calculate discount                          │
         │  └── usedCount++ on confirmed booking             │
         └──────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════
 17. ANALYTICS & REPORTS
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / Analytics Tab                 │
        └─────────────────────────────────────────────────────┘
                                    │
        ┌───────────┬───────────────┼───────────────┬─────────┐
        ▼           ▼               ▼               ▼         ▼
┌──────────┐ ┌──────────┐   ┌──────────────┐ ┌──────────┐ ┌──────┐
│ Revenue  │ │Occupancy │   │ Cancellations│ │ Top      │ │Page  │
│ Reports  │ │ Rate     │   │  Report      │ │ Routes   │ │Views │
└──────────┘ └──────────┘   └──────────────┘ └──────────┘ └──────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  Today's Dashboard (/admin?tab=today)                        │
│  ├── Today's bookings count                                  │
│  ├── Today's revenue                                         │
│  ├── Departures today                                        │
│  └── Alerts (delays, low occupancy, incidents)               │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  Finance Dashboard (/admin?tab=finance)                      │
│  ├── Total revenue by period                                 │
│  ├── Refunds issued                                          │
│  ├── Promo code discounts                                    │
│  └── Payroll costs                                           │
└──────────────────────────────────────────────────────────────┘
        │
        ▼
┌──────────────────────────────────────────────────────────────┐
│  Import / Export Tab                                         │
│  ├── Export bookings as CSV / Excel                          │
│  ├── Export routes                                           │
│  └── Import buses via CSV template                           │
└──────────────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════
 18. LOST & FOUND
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │                 /lost-found                          │
        └─────────────────────────────────────────────────────┘
                                    │
                     ┌──────────────┴──────────────┐
                     ▼                             ▼
        ┌─────────────────────────┐   ┌─────────────────────────┐
        │   Report Lost Item      │   │   Track by Ref Number   │
        └─────────────────────────┘   └─────────────────────────┘
                     │                             │
                     ▼                             ▼
        ┌─────────────────────────┐   ┌─────────────────────────┐
        │ Item Name / Category    │   │ Enter LF-2026-XXXX      │
        │ Description / Color     │   │ GET /api/lost-found/ref │
        │ Travel Date / Seat      │   └─────────────────────────┘
        │ Route / Bus             │                 │
        │ Reporter Contact        │                 ▼
        └─────────────────────────┘   ┌─────────────────────────┐
                     │                │ Show Status:             │
                     ▼                │ reported → under_review  │
        ┌─────────────────────────┐   │ → found → returned      │
        │ Generate Ref Number     │   └─────────────────────────┘
        │ LF-2026-0042            │
        └─────────────────────────┘
                     │
                     ▼
        ┌─────────────────────────────────────────────────────┐
        │  Admin Panel / Lost Found Tab                        │
        │  ├── View all reports                               │
        │  ├── Update status                                   │
        │  ├── Add admin notes / found location               │
        │  └── Mark as returned (returnedAt timestamp)        │
        └─────────────────────────────────────────────────────┘
                                    │
                          Item Found?
                         /           \
                       Yes            No
                        │              │
                        ▼              ▼
             ┌──────────────────┐  ┌──────────────┐
             │ Notify Passenger │  │ status =     │
             │ Return Item      │  │ not_found    │
             │ Close Case       │  │ Close Case   │
             └──────────────────┘  └──────────────┘


══════════════════════════════════════════════════════════════════════════
 19. SUPPORT CHAT
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │                   /support                           │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Enter Subject + First Message                       │
        │  POST /api/support                                   │
        │  status = open                                       │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Conversation Thread                                 │
        │  ├── User sends messages                            │
        │  └── Admin replies in Support Inbox tab             │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
                       ┌────────────────────────┐
                       │   Issue Resolved?       │
                       └────────────────────────┘
                              /         \
                            Yes          No
                             │            │
                             ▼            ▼
                  ┌──────────────────┐  ┌──────────────────┐
                  │ Mark Resolved    │  │ Continue thread  │
                  │ status = resolved│  └──────────────────┘
                  └──────────────────┘
                             │
                             ▼
                  ┌──────────────────┐
                  │ Archive Ticket   │
                  │ status = closed  │
                  └──────────────────┘


══════════════════════════════════════════════════════════════════════════
 20. SECURITY, AUDIT & SYSTEM SETTINGS
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / Settings Tab                  │
        └─────────────────────────────────────────────────────┘
                                    │
        ┌──────┬───────┬────────┬───┴────┬────────┬──────────┐
        ▼      ▼       ▼        ▼        ▼        ▼          ▼
┌──────────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ General  │ │Brand │ │Booking│ │Notif.│ │Pay.  │ │SMS/  │ │Secur.│
│ Settings │ │-ing  │ │Rules │ │Alerts│ │Keys  │ │Twilio│ │ity   │
└──────────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
     │           │        │        │        │        │         │
     ▼           ▼        ▼        ▼        ▼        ▼         ▼
Business    Upload    Max Seats  Email   Stripe   Twilio   Change
Name        Logo PNG  Cutoff     Toggle  Keys     SID      Password
Currency    Preview   Cancel     Admin   ABA      Auth
Timezone    Remove    Window     Email   Keys     Token
Contact     Logo      AutoConf.  Notify  Active   From No.
Phone               Upfront    On Book Gateway
                    Pay        On Cancel

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / Audit Logs Tab                │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  Every admin action logged:                          │
        │  ├── entityType: booking/bus/route/user/promo_code  │
        │  ├── action: create/update/delete/cancel/refund/    │
        │  │          login/logout/bulk_import/bulk_export    │
        │  ├── userId / userName / userEmail                  │
        │  ├── changes[]: { field, oldValue, newValue }       │
        │  ├── severity: low / medium / high / critical       │
        │  ├── metadata: ipAddress, userAgent                 │
        │  └── TTL: Auto-deleted after 1 year                 │
        └─────────────────────────────────────────────────────┘

        ┌─────────────────────────────────────────────────────┐
        │          Admin Panel / System Status Tab             │
        └─────────────────────────────────────────────────────┘
                                    │
                                    ▼
        ┌─────────────────────────────────────────────────────┐
        │  GET /api/health                                     │
        │  ├── MongoDB connection: ✅ / ❌                    │
        │  ├── Email service (Resend): ✅ / ❌               │
        │  ├── Payment gateway status                         │
        │  ├── Server uptime                                  │
        │  └── Environment: development / production          │
        └─────────────────────────────────────────────────────┘


══════════════════════════════════════════════════════════════════════════
 21. USER DASHBOARD
══════════════════════════════════════════════════════════════════════════

        ┌─────────────────────────────────────────────────────┐
        │              /dashboard                              │
        └─────────────────────────────────────────────────────┘
                                    │
        ┌────────────────────────────┼────────────────────────┐
        ▼                           ▼                         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  My Bookings     │     │ Loyalty Points   │     │    Profile       │
│  /dashboard/     │     │ /dashboard/      │     │  /dashboard/     │
│  bookings        │     │ loyalty          │     │  profile         │
└──────────────────┘     └──────────────────┘     └──────────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│ Upcoming trips   │     │ Points balance   │     │ Edit Name        │
│ Past trips       │     │ Tier badge       │     │ Change Phone     │
│ Cancelled        │     │ Points history   │     │ Upload avatar    │
│ View ticket      │     │ Benefits list    │     │ Change password  │
│ Download PDF     │     │ Progress bar     │     │ Notification     │
│ Cancel booking   │     │ Redeem button    │     │ preferences      │
│ Rate trip        │     └──────────────────┘     │ Saved passengers │
│ View waitlist    │                              └──────────────────┘
└──────────────────┘


╔══════════════════════════════════════════════════════════════════════════╗
║                     SYSTEM DATA FLOW SUMMARY                             ║
╚══════════════════════════════════════════════════════════════════════════╝

  USER ──────────► ROUTE ──────────► BUS ──────────► BOOKING
   │                                  │                  │
   │                                  │                  │
   ├── LOYALTY (1:1)                  ├── DRIVER         ├── NOTIFICATION
   ├── NOTIFICATION (1:N)             ├── BUSDETAIL      ├── RATING (1:1)
   ├── RATING (1:N)                   │     ├── MAINTENANCE  ├── LOSTFOUND
   ├── WAITINGLIST (1:N)              │     ├── FUELLOG       └── PENDINGBOOKING
   ├── SUPPORTCONVERSATION (1:N)      │     ├── INCIDENT           (TTL 30m)
   └── LOSTFOUND (1:N)               │     └── DRIVERSCHEDULE
                                      └── DRIVEREARNING

  STANDALONE:
  ├── EMPLOYEE ──► PAYROLL
  ├── PROMOCODE (optional → ROUTE)
  ├── AUDITLOG (TTL 1yr, string refs)
  ├── PAGEVIEW (analytics, no refs)
  └── SETTINGS (singleton)
```
