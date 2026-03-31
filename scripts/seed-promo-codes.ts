import { connectToDatabase } from "../lib/mongodb";
import PromoCode from "../models/PromoCode";

async function seedPromoCodes() {
  try {
    await connectToDatabase();

    console.log("🌱️ Seeding promo codes...");

    const promoCodes = [
      {
        code: "SAVE10",
        type: "percentage",
        value: 10,
        maxUses: 100,
        minBookingAmount: 0,
        maxDiscountAmount: 50,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        applicableBusTypes: [],
        applicableRoutes: [],
        isActive: true,
      },
      {
        code: "WELCOME20",
        type: "percentage",
        value: 20,
        maxUses: 50,
        minBookingAmount: 20,
        maxDiscountAmount: 30,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days
        applicableBusTypes: [],
        applicableRoutes: [],
        isActive: true,
      },
      {
        code: "FIRST5",
        type: "fixed",
        value: 5,
        maxUses: 200,
        minBookingAmount: 10,
        maxDiscountAmount: null,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        applicableBusTypes: [],
        applicableRoutes: [],
        isActive: true,
      },
      {
        code: "BUS4550",
        type: "percentage",
        value: 50,
        maxUses: 25,
        minBookingAmount: 50,
        maxDiscountAmount: 100,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000), // 120 days
        applicableBusTypes: ["bus_45"],
        applicableRoutes: [],
        isActive: true,
      },
      {
        code: "BIGDISCOUNT",
        type: "percentage",
        value: 25,
        maxUses: null, // Unlimited
        minBookingAmount: 100,
        maxDiscountAmount: 75,
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days
        applicableBusTypes: [],
        applicableRoutes: [],
        isActive: true,
      },
    ];

    for (const promoData of promoCodes) {
      const existing = await PromoCode.findOne({ code: promoData.code });

      if (!existing) {
        await PromoCode.create(promoData);
        console.log(`✅ Created promo code: ${promoData.code}`);
      } else {
        console.log(`ℹ️  Promo code already exists: ${promoData.code}`);
      }
    }

    console.log("\n✅ Promo codes seeded successfully!");
    console.log("\n📝 Available Promo Codes:");
    console.log("   • SAVE10 - 10% off (max $50)");
    console.log("   • WELCOME20 - 20% off (max $30, min $20)");
    console.log("   • FIRST5 - $5 off (min $10)");
    console.log("   • BUS4550 - 50% off 45-seater buses (max $100)");
    console.log("   • BIGDISCOUNT - 25% off orders $100+ (max $75)");

  } catch (error) {
    console.error("❌ Error seeding promo codes:", error);
    process.exit(1);
  }
}

// Run the seed function
seedPromoCodes().then(() => {
  console.log("\n👋 Done!");
  process.exit(0);
});
