export type Language = "en" | "km";

export const translations = {
  en: {
    // Navigation
    nav_home: "Home",
    nav_search: "Search Buses",
    nav_dashboard: "My Bookings",
    nav_admin: "Admin Panel",
    nav_login: "Login",
    nav_register: "Register",
    nav_logout: "Logout",

    // Search
    search_title: "Find Your Bus",
    search_from: "From",
    search_to: "To",
    search_date: "Date",
    search_passengers: "Passengers",
    search_button: "Search Buses",

    // Filters
    filters_title: "Filters & Sorting",
    filters_bus_type: "Bus Type",
    filters_price_range: "Price Range",
    filters_departure_time: "Departure Time",
    filters_amenities: "Amenities",
    filters_sort_by: "Sort By",
    filters_clear_all: "Clear All",
    filters_results: "results",

    // Bus Types
    bus_sleeping: "Sleeping Bus",
    bus_seater: "45 Seater",
    bus_mini: "Mini Bus",
    bus_car: "Car",

    // Amenities
    amenity_wifi: "WiFi",
    amenity_ac: "Air Conditioning",
    amenity_usb: "USB Charging",
    amenity_tv: "TV/Entertainment",
    amenity_water: "Water Bottles",
    amenity_blanket: "Blanket/Pillow",

    // Booking
    booking_select_seats: "Select Seats",
    booking_passenger_details: "Passenger Details",
    booking_confirm: "Confirm Booking",
    booking_success: "Booking Confirmed!",
    booking_total: "Total Amount",

    // Cancellation
    cancel_title: "Cancellation Policy",
    cancel_full_refund: "Full Refund",
    cancel_partial_refund: "Partial Refund",
    cancel_no_refund: "No Refund",
    cancel_button: "Cancel Booking",

    // Common
    common_available: "Available",
    common_booked: "Booked",
    common_selected: "Selected",
    common_price: "Price",
    common_seats: "Seats",
    common_duration: "Duration",
    common_loading: "Loading...",
    common_error: "An error occurred",
  },
  km: {
    // Navigation
    nav_home: "ទំព័រដើម",
    nav_search: "ស្វែងរកឡានក្រុង",
    nav_dashboard: "ការកក់របស់ខ្ញុំ",
    nav_admin: "បន្ទះគ្រប់គ្រង",
    nav_login: "ចូល",
    nav_register: "ចុះឈ្មោះ",
    nav_logout: "ចាកចេញ",

    // Search
    search_title: "ស្វែងរកឡានក្រុងរបស់អ្នក",
    search_from: "ពី",
    search_to: "ទៅ",
    search_date: "កាលបរិច្ឆេទ",
    search_passengers: "អ្នកដំណើរ",
    search_button: "ស្វែងរកឡានក្រុង",

    // Filters
    filters_title: "តម្រង និងការតម្រងតាមលំដាប់",
    filters_bus_type: "ប្រភេទឡានក្រុង",
    filters_price_range: "ចំនួនទឹកប្រាក់",
    filters_departure_time: "ម៉ោងចេញ",
    filters_amenities: "សេវាកម្ម",
    filters_sort_by: "តម្រងតាម",
    filters_clear_all: "លុបចេញទាំងអស់",
    filters_results: "លទ្ធផល",

    // Bus Types
    bus_sleeping: "ឡានក្រុងសម្រាប់ផ្ទំ",
    bus_seater: "កៅអីចំនួន ៤៥",
    bus_mini: "ឡានក្រុងតូច",
    bus_car: "ឡាន",

    // Amenities
    amenity_wifi: "វ៉ាយហ្វាយ",
    amenity_ac: "ម៉ាស៊ីនត្រជាក់",
    amenity_usb: "បន្ទះសាកថ្មយូអេសប៊ី",
    amenity_tv: "ទូរទស្សន៍",
    amenity_water: "ទឹកសម្រាប់ផឹក",
    amenity_blanket: "ការុង និងខ្នើម",

    // Booking
    booking_select_seats: "ជ្រើសកៅអី",
    booking_passenger_details: "ព័ត៌មានអ្នកដំណើរ",
    booking_confirm: "បញ្ជាក់ការកក់",
    booking_success: "ការកក់ត្រូវបានបញ្ជាក់!",
    booking_total: "ចំនួនទឹកប្រាក់សរុប",

    // Cancellation
    cancel_title: "គោលការណ៍លុបការកក់",
    cancel_full_refund: "សងប្រាក់ពេញ",
    cancel_partial_refund: "សងប្រាក់មួយផ្នែក",
    cancel_no_refund: "មិនសងប្រាក់",
    cancel_button: "លុបការកក់",

    // Common
    common_available: "មានទំនេរ",
    common_booked: "បានកក់",
    common_selected: "បានជ្រើស",
    common_price: "តម្លៃ",
    common_seats: "កៅអី",
    common_duration: "រយៈពេល",
    common_loading: "កំពុងផ្ទុក...",
    common_error: "មានបញ្ហាកើតឡើង",
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function getTranslation(lang: Language, key: TranslationKey): string {
  return translations[lang][key] || translations.en[key];
}

export function t(lang: Language, key: TranslationKey): string {
  return getTranslation(lang, key);
}
