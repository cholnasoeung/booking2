# System Flowcharts — Bus Booking System

> Paste any chart into [mermaid.live](https://mermaid.live) or view with VS Code "Markdown Preview Mermaid Support" (`Ctrl+Shift+V`).

---

## 1. User Authentication Flow

```mermaid
flowchart TD
    A([User Visits Site]) --> B{Has Account?}

    B -- No --> C[Click Register]
    C --> D[Fill Name / Email / Password / Phone]
    D --> E[POST /api/auth/register]
    E --> F{Email Already Used?}
    F -- Yes --> G[Show Error: Email taken]
    G --> D
    F -- No --> H[Hash Password with bcrypt]
    H --> I[Create User in DB\nisEmailVerified = false]
    I --> J[Send Verification Email]
    J --> K[Redirect to Login]

    B -- Yes --> L[Click Login]
    L --> M[Enter Email & Password]
    M --> N[POST via NextAuth\nCredentials Provider]
    N --> O{User Exists?}
    O -- No --> P[Error: Invalid credentials]
    P --> M
    O -- Yes --> Q{Is Suspended?}
    Q -- Yes --> R[Error: Account suspended]
    Q -- No --> S{Password Match?}
    S -- No --> P
    S -- Yes --> T[Create Session JWT]
    T --> U{User Role?}
    U -- admin --> V[Redirect to /admin]
    U -- user --> W[Redirect to /dashboard\nor callbackUrl]

    style A fill:#6366f1,color:#fff
    style V fill:#10b981,color:#fff
    style W fill:#10b981,color:#fff
    style G fill:#ef4444,color:#fff
    style P fill:#ef4444,color:#fff
    style R fill:#ef4444,color:#fff
```

---

## 2. Bus Search & Results Flow

```mermaid
flowchart TD
    A([Homepage]) --> B[Fill Search Form\nFrom / To / Date / Passengers]
    B --> C[Submit Search]
    C --> D[GET /search/results\n?from=&to=&date=]
    D --> E[Query Buses by Route + Date\nFilter: date >= today\ndepartureStatus != cancelled]
    E --> F{Buses Found?}
    F -- No --> G[Show: No buses available\nfor this route & date]
    G --> H[Suggest nearby dates]
    H --> B
    F -- Yes --> I[Display Bus List\nPrice · Seats Left · Departure · Amenities]
    I --> J{User Logged In?}
    J -- No --> K[Click Select Bus]
    K --> L[Redirect to /login\n?callbackUrl=/book/busId]
    L --> M[Login] --> N
    J -- Yes --> N[Click Select Bus]
    N --> O[Go to /book/busId\nSeat Selection Page]

    style A fill:#6366f1,color:#fff
    style G fill:#f59e0b,color:#fff
    style O fill:#10b981,color:#fff
```

---

## 3. Seat Selection Flow

```mermaid
flowchart TD
    A([/book/busId]) --> B[Load Seat Map\nShow: Available / Booked / Blocked]
    B --> C{Bus Full?}
    C -- Yes --> D[Show: Bus Full Banner]
    D --> E{Already on Waitlist?}
    E -- Yes --> F[Show: You are on waitlist]
    E -- No --> G[Click Join Waitlist]
    G --> H[POST /api/waitlist\nSave WaitingList record]
    H --> I[Show: Added to Waitlist]
    C -- No --> J[User Clicks Seats]
    J --> K{Seat Available?}
    K -- No --> L[Seat is greyed out\nCannot select]
    K -- Yes --> M[Seat turns selected/green]
    M --> N{Max Seats Reached?\nmax from Settings}
    N -- Yes --> O[Show: Max X seats allowed]
    N -- No --> P{More seats to select?}
    P -- Yes --> J
    P -- No --> Q[Click Continue]
    Q --> R{Selected seats > 0?}
    R -- No --> S[Show: Select at least 1 seat]
    R -- Yes --> T[Redirect to\n/book/busId/passengers\n?seats=A1,A2&boardingStop=&droppingStop=]

    style A fill:#6366f1,color:#fff
    style I fill:#10b981,color:#fff
    style T fill:#10b981,color:#fff
    style O fill:#f59e0b,color:#fff
    style S fill:#ef4444,color:#fff
```

---

## 4. Passenger Details & Payment Flow

```mermaid
flowchart TD
    A([/book/busId/passengers]) --> B[Show Passenger Form\n1 form per selected seat]
    B --> C[Fill: Name / Age / Gender\nContact / ID Proof]
    C --> D{Promo Code?}
    D -- Yes --> E[Enter Code → Validate]
    E --> F{Code Valid?}
    F -- No --> G[Show: Invalid / Expired code]
    G --> D
    F -- Yes --> H[Show Discount Applied]
    D -- No --> I
    H --> I[Click Confirm & Pay]
    I --> J[Server Action:\ninitiateBookingPayment]
    J --> K[Check Seats Still Available]
    K --> L{Seats Taken?}
    L -- Yes --> M[Error: Seats no longer available\nReturn to seat selection]
    L -- No --> N{Active Payment Gateway?}

    N -- none --> O[Create Booking Directly\nBookingModel.create\nstatus = confirmed]
    O --> P[Create Notification\nbooking_confirmed]
    P --> Q[Redirect to\n/booking/confirmation/bookingId]

    N -- stripe --> R[Create PendingBooking\nTTL 30 min]
    R --> S[Create Stripe Checkout Session\nwith pendingBookingId in metadata]
    S --> T[Redirect to\nStripe Hosted Page]
    T --> U{User Pays?}
    U -- Cancels --> V[Redirect to\n/book/busId/passengers?cancelled=1]
    V --> B
    U -- Pays --> W[Stripe fires webhook\ncheckout.session.completed]
    W --> X[Verify Stripe Signature]
    X --> Y[Read pendingBookingId\nfrom metadata]
    Y --> Z[Create BookingModel\nstatus = confirmed\npaymentStatus = paid]
    Z --> AA[Lock seats:\nBus.bookedSeats.$addToSet]
    AA --> AB[Mark PendingBooking = paid]
    AB --> AC[Create Notification]
    AC --> Q

    N -- abaPayway --> AD[Create PendingBooking]
    AD --> AE[Generate HMAC-SHA512 Hash]
    AE --> AF[Store form data in sessionStorage]
    AF --> AG[Redirect to /book/busId/aba-pay]
    AG --> AH[Auto-submit form to\nABA PayWay Gateway]
    AH --> AI{Payment Result}
    AI -- Failed --> AJ[Redirect to\n/booking/payment-failed]
    AI -- Success --> AK[ABA calls callback\nPOST /api/payments/callback/aba]
    AK --> AL[Verify HMAC Signature]
    AL --> AM[Create BookingModel]
    AM --> AN[Create Notification]
    AN --> Q

    style A fill:#6366f1,color:#fff
    style Q fill:#10b981,color:#fff
    style M fill:#ef4444,color:#fff
    style G fill:#f59e0b,color:#fff
    style V fill:#f59e0b,color:#fff
    style AJ fill:#ef4444,color:#fff
```

---

## 5. Booking Confirmation & Ticket Flow

```mermaid
flowchart TD
    A([/booking/confirmation/bookingId]) --> B[Load Booking Details\nfrom DB]
    B --> C{Booking Belongs\nto Current User?}
    C -- No --> D[403 Forbidden\nRedirect to /dashboard]
    C -- Yes --> E[Show Booking Summary\nRoute · Seats · Passengers · Price · QR Code]
    E --> F{User Action?}

    F -- Download Ticket --> G[GET /api/bookings/id/ticket]
    G --> H[generateTicketPDF\nwith QR Code]
    H --> I[Return PDF Buffer\nContent-Type: application/pdf]
    I --> J[Browser downloads PDF ticket]

    F -- View My Bookings --> K[Go to /dashboard/bookings]

    F -- Cancel Booking --> L{Within Cancellation\nWindow?}
    L -- No --> M[Show: Cannot cancel\nToo close to departure]
    L -- Yes --> N[Confirm Cancel Dialog]
    N --> O[POST /api/bookings/id/cancel]
    O --> P[Calculate Refund %\n>48h = 100% · >24h = 75%\n>4h = 50% · <4h = 0%]
    P --> Q[Update Booking\nstatus = cancelled\nrefundStatus = pending]
    Q --> R[Release Seats\nRemove from bookedSeats]
    R --> S[Create Notification\nbooking_cancelled]
    S --> T{Auto-Refund\nConfigured?}
    T -- Yes --> U[Trigger Stripe/ABA Refund\nvia Refunds API]
    T -- No --> V[Admin Reviews\nin Refund Tab]

    style A fill:#6366f1,color:#fff
    style J fill:#10b981,color:#fff
    style D fill:#ef4444,color:#fff
    style M fill:#ef4444,color:#fff
    style U fill:#10b981,color:#fff
```

---

## 6. Admin — Bus & Route Management Flow

```mermaid
flowchart TD
    A([Admin Panel /admin]) --> B{Tab Selected}

    B -- Routes --> C[View All Routes]
    C --> D{Action?}
    D -- Add --> E[Fill: From / To / Duration / Distance]
    E --> F[POST /api/admin/routes]
    F --> G[RouteModel.create]
    G --> C
    D -- Edit --> H[Update Route Fields]
    H --> I[PATCH /api/admin/routes/id]
    I --> C
    D -- Delete --> J{Has Buses?}
    J -- Yes --> K[Error: Cannot delete\nRoute has scheduled buses]
    J -- No --> L[DELETE /api/admin/routes/id]
    L --> C

    B -- Buses --> M[View All Buses\nFilter by Route / Date / Status]
    M --> N{Action?}
    N -- Add Bus --> O[Select Route · Date · Times\nBus Type · Seats · Price · Driver]
    O --> P[POST /api/admin/buses]
    P --> Q[BusModel.create]
    Q --> M
    N -- Edit --> R[Update Bus Fields\nChange driver / price / status]
    R --> S[PATCH /api/admin/buses/id]
    S --> M
    N -- Announce --> T[Open Announcement Dialog\nSelect Type: delay / platform / general / cancel warning]
    T --> U[Write Message]
    U --> V[POST /api/admin/buses/id/announce]
    V --> W[Send Email to all passengers]
    W --> X[Create Notification per passenger]
    X --> Y{Twilio Enabled?}
    Y -- Yes --> Z[Send SMS to registered phones]
    Y -- No --> AA[Skip SMS]
    Z --> AB[Done]
    AA --> AB
    N -- View Bookings --> AC[List bookings for this bus\nwith check-in status]
    AC --> AD{Check-In Action?}
    AD -- Check In --> AE[PATCH /api/admin/checkin\nstatus = checked-in]
    AD -- Board --> AF[status = boarded]
    AD -- No Show --> AG[status = no-show]

    style A fill:#6366f1,color:#fff
    style K fill:#ef4444,color:#fff
    style AB fill:#10b981,color:#fff
    style Z fill:#10b981,color:#fff
```

---

## 7. Notification Flow

```mermaid
flowchart TD
    A([Notification Bell\nin Navbar]) --> B[Fetch /api/notifications\nevery 30 seconds]
    B --> C[Show Unread Count Badge\nin red]
    C --> D{User Clicks Bell?}
    D -- No --> E[Continue Polling]
    E --> B
    D -- Yes --> F[Open Dropdown\nShow last 20 notifications]
    F --> G{User Action?}

    G -- Click Notification --> H[PATCH /api/notifications\nbody: id]
    H --> I[Mark as Read\nDot disappears]
    I --> J{Has bookingId?}
    J -- Yes --> K[Navigate to\n/booking/confirmation/bookingId]
    J -- No --> L[Stay on page]

    G -- Mark All Read --> M[PATCH /api/notifications\nbody: action=markAllRead]
    M --> N[All dots cleared\nBadge resets to 0]

    G -- Close --> O[Dropdown closes]

    subgraph Triggers ["How Notifications Are Created"]
        T1[Admin sends Announcement] --> T2[Create Notification per passenger\ntype: announcement OR trip_update]
        T3[Booking Confirmed\nno payment gateway] --> T4[Create Notification\ntype: booking_confirmed]
        T5[Stripe Webhook fires\ncheckout.session.completed] --> T6[Create Notification\ntype: booking_confirmed]
        T7[ABA PayWay Callback\nstatus = success] --> T8[Create Notification\ntype: booking_confirmed]
    end

    style A fill:#6366f1,color:#fff
    style K fill:#10b981,color:#fff
    style N fill:#10b981,color:#fff
```

---

## 8. Admin Announcement & SMS Flow

```mermaid
flowchart TD
    A([Admin clicks Announce\non a Bus]) --> B[Dialog opens\nPreview: X passengers reachable]
    B --> C[Select Announcement Type\nDelay / Platform Change / General / Cancellation Warning]
    C --> D{Type = Delay?}
    D -- Yes --> E[Enter Delay Minutes]
    D -- No --> F
    E --> F[Write Message]
    F --> G[Click Send Announcement]
    G --> H[POST /api/admin/buses/id/announce]
    H --> I[Load all confirmed bookings\nfor this bus]
    I --> J{Delay type?}
    J -- Yes --> K[Update Bus:\ndepartureStatus = delayed\ndelayMinutes = N]
    J -- No --> L
    K --> L[For each passenger...]

    L --> M[Has Email?]
    M -- Yes --> N[Send HTML Email\nvia Resend]
    M -- No --> O[Skip Email]

    L --> P[Has User Account?]
    P -- Yes --> Q[Create Notification record\nin MongoDB]
    P -- No --> R[Skip In-App Notification]

    L --> S{Twilio Enabled\n+ User has Phone?}
    S -- Yes --> T[Build SMS Text:\nBus Alert · Route · Time · Message]
    T --> U[POST Twilio REST API\nhttps://api.twilio.com/Messages.json\nBasic Auth: AccountSid:AuthToken]
    U --> V{SMS Sent?}
    V -- Yes --> W[smsSent++]
    V -- No --> X[Log warning\nContinue]
    S -- No --> Y[Skip SMS]

    W --> Z
    X --> Z
    O --> Z
    R --> Z
    Y --> Z[Next passenger]
    Z --> AA{More passengers?}
    AA -- Yes --> L
    AA -- No --> AB[Return Response:\ntotalPassengers, emailsSent, smsSent]

    style A fill:#6366f1,color:#fff
    style N fill:#10b981,color:#fff
    style Q fill:#10b981,color:#fff
    style W fill:#10b981,color:#fff
    style AB fill:#10b981,color:#fff
    style X fill:#f59e0b,color:#fff
```

---

## 9. Admin — User & Booking Management Flow

```mermaid
flowchart TD
    A([Admin Panel]) --> B{Tab Selected}

    B -- Users --> C[List All Users\nSearch by name/email\nFilter by role/status]
    C --> D{Action?}
    D -- Suspend --> E[Enter Reason]
    E --> F[PATCH /api/admin/users/id\nisSuspended = true]
    F --> G[User cannot login]
    D -- Unsuspend --> H[PATCH /api/admin/users/id\nisSuspended = false]
    D -- Change Role --> I[Toggle user/admin]
    I --> J[PATCH /api/admin/users/id]

    B -- Bookings --> K[List All Bookings\nFilter by status/date/route]
    K --> L{Action?}
    L -- View Detail --> M[Show passenger list\nseats, payment, check-in]
    L -- Cancel --> N[POST /api/admin/bookings/id/cancel]
    N --> O[status = cancelled\nRelease seats]
    L -- Refund --> P[Open Refund Tab]
    P --> Q[Enter Refund Amount]
    Q --> R[Process via Stripe/ABA\nor Manual]
    R --> S[Update: paymentStatus = refunded\nrefundStatus = processed]

    B -- Check-In --> T[Select Bus for Today]
    T --> U[Show Passenger Manifest]
    U --> V{Scan QR or\nManual Check-In}
    V --> W[PATCH booking\ncheckInStatus = checked-in\ncheckedInAt = now]
    W --> X[Passenger boards]

    B -- Reports --> Y[Select Report Type\nRevenue / Occupancy / Cancellations]
    Y --> Z[GET /api/admin/reports\nwith date range]
    Z --> AA[Show Charts & Tables]
    AA --> AB{Export?}
    AB -- Yes --> AC[GET /api/admin/export\nDownload CSV/Excel]
    AB -- No --> Y

    style A fill:#6366f1,color:#fff
    style G fill:#ef4444,color:#fff
    style X fill:#10b981,color:#fff
    style AC fill:#10b981,color:#fff
    style S fill:#10b981,color:#fff
```

---

## 10. Loyalty Points Flow

```mermaid
flowchart TD
    A([Booking Confirmed]) --> B[Call Loyalty.processBooking\nuserId, bookingAmount, bookingId]
    B --> C{Loyalty Record\nExists?}
    C -- No --> D[Create Loyalty Record\ntier = bronze\npoints = 0]
    C -- Yes --> E[Load existing record]
    D --> E
    E --> F[Earn Points:\n1 point per $1 spent]
    F --> G[Add to pointsHistory\ntype = earned\nexpiresAt = +1 year]
    G --> H[lifetimePoints += earned]
    H --> I{Check Tier Upgrade}
    I --> J{lifetimePoints >= 10000?}
    J -- Yes --> K[Tier = Platinum\n15% discount]
    J -- No --> L{lifetimePoints >= 5000?}
    L -- Yes --> M[Tier = Gold\n10% discount\nFree cancellation]
    L -- No --> N{lifetimePoints >= 1000?}
    N -- Yes --> O[Tier = Silver\n5% discount\nPriority support]
    N -- No --> P[Tier = Bronze\nNo discount]
    K --> Q[Save Updated Loyalty]
    M --> Q
    O --> Q
    P --> Q
    Q --> R[User sees tier badge\nin /dashboard/loyalty]

    R --> S{User wants\nto redeem?}
    S -- Yes --> T[Enter points to redeem\nat checkout]
    T --> U{Enough Points?}
    U -- No --> V[Error: Insufficient points]
    U -- Yes --> W[POST /api/loyalty/redeem]
    W --> X[points -= redeemed\nAdd to pointsHistory\ntype = redeemed]
    X --> Y[Apply discount to booking]

    style A fill:#6366f1,color:#fff
    style K fill:#7c3aed,color:#fff
    style M fill:#d97706,color:#fff
    style O fill:#6b7280,color:#fff
    style P fill:#92400e,color:#fff
    style Y fill:#10b981,color:#fff
    style V fill:#ef4444,color:#fff
```

---

## 11. Lost & Found Flow

```mermaid
flowchart TD
    A([User visits /lost-found]) --> B{Report or Track?}

    B -- Report Lost Item --> C[Fill Form:\nItem Name / Category / Description\nTravel Date / Seat / Bus Route\nContact Info]
    C --> D[POST /api/lost-found]
    D --> E[Generate unique refNumber\ne.g. LF-2026-0042]
    E --> F[Create LostFound record\nstatus = reported]
    F --> G[Show: Report submitted!\nRef Number: LF-2026-0042]

    B -- Track Status --> H[Enter Reference Number]
    H --> I[GET /api/lost-found/ref/LF-xxxx]
    I --> J{Found?}
    J -- No --> K[Show: Ref not found]
    J -- Yes --> L[Show Status:\nreported → under_review → found → returned]

    G --> M[Admin sees in Lost & Found Tab]
    M --> N[Admin updates status]
    N --> O{Status Changed?}
    O -- under_review --> P[Admin investigating]
    O -- found --> Q[Admin notes found location]
    O -- returned --> R[Mark returnedAt date\nhandledBy = admin name]
    R --> S[Item returned to owner]

    style A fill:#6366f1,color:#fff
    style G fill:#10b981,color:#fff
    style S fill:#10b981,color:#fff
    style K fill:#ef4444,color:#fff
```

---

## 12. Support Chat Flow

```mermaid
flowchart TD
    A([User visits /support]) --> B[Fill Subject + First Message]
    B --> C[POST /api/support\nCreate SupportConversation\nstatus = open]
    C --> D[User sees conversation\nwith their message]
    D --> E{Admin Active?}
    E -- No --> F[User waits\nRefresh to check reply]
    E -- Yes --> G[Admin sees in Support Inbox tab]
    G --> H[Admin reads messages]
    H --> I[Admin types reply]
    I --> J[POST /api/support/id/message\nsender = admin]
    J --> K[User refreshes / sees reply]
    K --> L{Issue Resolved?}
    L -- No --> M[User sends follow-up]
    M --> J
    L -- Yes --> N{Who closes?}
    N -- Admin --> O[PATCH /api/support/id\nstatus = resolved]
    N -- User --> P[User marks resolved]
    O --> Q[Conversation archived]
    P --> Q

    style A fill:#6366f1,color:#fff
    style Q fill:#10b981,color:#fff
```
