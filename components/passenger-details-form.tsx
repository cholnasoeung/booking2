"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { ArrowRight, CheckCircle2, User, Mail, Phone, Calendar, Users, Tag, X, Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { Passenger } from "@/types/passenger";

type PassengerDetailsFormProps = {
  selectedSeats: string[];
  seatLabels?: string[];
  pricePerSeat?: number;
  onSubmit: (passengers: Passenger[], promoCode?: string) => Promise<{ success: boolean; bookingId?: string; error?: string }>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  busId?: string;
  boardingStop?: string;
  droppingStop?: string;
};

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "other", label: "Other" },
];

interface PromoCodeValidation {
  valid: boolean;
  discount: number;
  message: string;
  code?: string;
}

export default function PassengerDetailsForm({
  selectedSeats,
  seatLabels = selectedSeats,
  pricePerSeat = 25,
  onSubmit,
  onCancel,
  isSubmitting = false,
  busId = "",
  boardingStop,
  droppingStop,
}: PassengerDetailsFormProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const paramBusId = searchParams.get("busId") || busId;

  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState("");

  // Promo code state
  const [promoCode, setPromoCode] = useState("");
  const [promoValidation, setPromoValidation] = useState<PromoCodeValidation | null>(null);
  const [validatingPromo, setValidatingPromo] = useState(false);
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);

  // Initialize passengers based on selected seats
  useEffect(() => {
    const initialPassengers = selectedSeats.map((seatId, index) => {
      const passenger: Passenger = {
        id: `passenger-${index}`,
        name: session?.user?.name || "",
        age: "",
        gender: "other",
        contactNumber: session?.user?.phone || "",
        email: session?.user?.email || "",
      };
      return passenger;
    });
    setPassengers(initialPassengers);
  }, [selectedSeats, session]);

  // Auto-fill first passenger with logged-in user data
  useEffect(() => {
    if (session?.user && passengers.length > 0) {
      setPassengers((prev) => {
        const updated = [...prev];
        updated[0] = {
          ...updated[0],
          name: session.user?.name || updated[0].name,
          contactNumber: (session.user as any)?.phone || updated[0].contactNumber,
          email: session.user?.email || updated[0].email,
        };
        return updated;
      });
    }
  }, [session]);

  // Validate promo code
  async function validatePromoCode(code: string) {
    if (!code.trim()) {
      setPromoValidation(null);
      return;
    }

    setValidatingPromo(true);
    setPromoValidation(null);

    try {
      const bookingAmount = passengers.length * pricePerSeat;
      const response = await fetch(
        `/api/promo-codes/validate?code=${code.toUpperCase()}&busId=${paramBusId}&bookingAmount=${bookingAmount}`
      );
      const data = await response.json();

      if (response.ok && data.valid) {
        setPromoValidation({
          valid: true,
          discount: data.discount || 0,
          message: data.message || "Promo code applied successfully!",
          code: code.toUpperCase(),
        });
        setAppliedPromo(code.toUpperCase());
      } else {
        setPromoValidation({
          valid: false,
          discount: 0,
          message: data.message || "Invalid promo code",
        });
      }
    } catch (error) {
      setPromoValidation({
        valid: false,
        discount: 0,
        message: "Unable to validate promo code",
      });
    } finally {
      setValidatingPromo(false);
    }
  }

  // Apply promo code
  function handleApplyPromo() {
    if (promoCode.trim()) {
      validatePromoCode(promoCode);
    }
  }

  // Remove promo code
  function handleRemovePromo() {
    setPromoCode("");
    setAppliedPromo(null);
    setPromoValidation(null);
  }

  function updatePassenger(index: number, field: keyof Passenger, value: string) {
    setPassengers((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });

    // Clear error when user starts typing
    if (errors[`${index}-${field}`]) {
      setErrors((prev) => {
        const updated = { ...prev };
        delete updated[`${index}-${field}`];
        return updated;
      });
    }
  }

  function validatePassengers(): boolean {
    const newErrors: Record<string, string> = {};

    passengers.forEach((passenger, index) => {
      // Name validation
      if (!passenger.name.trim()) {
        newErrors[`${index}-name`] = "Name is required";
      } else if (passenger.name.trim().length < 2) {
        newErrors[`${index}-name`] = "Name must be at least 2 characters";
      }

      // Age validation
      if (!passenger.age) {
        newErrors[`${index}-age`] = "Age is required";
      } else {
        const ageNum = Number.parseInt(passenger.age);
        if (isNaN(ageNum) || ageNum < 1 || ageNum > 120) {
          newErrors[`${index}-age`] = "Please enter a valid age (1-120)";
        }
      }

      // Gender validation
      if (!passenger.gender) {
        newErrors[`${index}-gender`] = "Gender is required";
      }

      // Contact number validation
      if (!passenger.contactNumber.trim()) {
        newErrors[`${index}-contactNumber`] = "Contact number is required";
      } else if (!/^\d{9,15}$/.test(passenger.contactNumber.replace(/\s/g, ""))) {
        newErrors[`${index}-contactNumber`] = "Please enter a valid phone number";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Mark all fields as touched
    const allTouched: Record<string, boolean> = {};
    passengers.forEach((_, index) => {
      allTouched[`${index}-name`] = true;
      allTouched[`${index}-age`] = true;
      allTouched[`${index}-gender`] = true;
      allTouched[`${index}-contactNumber`] = true;
    });
    setTouched(allTouched);

    if (!validatePassengers()) {
      return;
    }

    setSubmitError("");

    const result = await onSubmit(passengers, appliedPromo || undefined);

    // If successful, redirect to confirmation page
    if (result.success && result.bookingId) {
      router.push(`/booking/confirmation/${result.bookingId}`);
    } else if (result.error) {
      setSubmitError(result.error);
    }
  }

  function handleBack() {
    if (paramBusId) {
      router.push(`/book/${paramBusId}`);
    } else {
      onCancel?.();
    }
  }

  const baseTotal = passengers.length * pricePerSeat;
  const discountAmount = promoValidation?.valid ? promoValidation.discount : 0;
  const totalPrice = baseTotal - discountAmount;

  return (
    <div className="w-full">
      {/* Header */}
      <div className="mb-6 space-y-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
            <Users className="h-4 w-4" />
          </div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Passenger Details
          </h2>
        </div>
        <p className="text-slate-600">
          Enter details for {passengers.length} passenger{passengers.length > 1 ? "s" : ""}
        </p>
        {(boardingStop || droppingStop) && (
          <div className="flex flex-wrap gap-3 text-xs text-slate-500">
            {boardingStop && <span>Board at {boardingStop}</span>}
            {droppingStop && <span>Drop at {droppingStop}</span>}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Promo Code Section */}
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <Tag className="h-4 w-4 text-amber-600" />
              <h3 className="font-semibold text-amber-900">Promo Code</h3>
              {appliedPromo && (
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Check className="w-3 h-3" />
                  Applied
                </span>
              )}
            </div>

            {!appliedPromo ? (
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter promo code"
                    className="h-11 pr-24"
                    disabled={validatingPromo}
                  />
                  {promoValidation && (
                    <div className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs font-medium",
                      promoValidation.valid
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}>
                      {promoValidation.valid ? "✓ Valid" : "✗ Invalid"}
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleApplyPromo}
                  disabled={!promoCode.trim() || validatingPromo}
                  className="h-11 px-4"
                >
                  {validatingPromo ? "Checking..." : "Apply"}
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-green-100 border border-green-200 rounded-lg px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-green-800">{appliedPromo}</span>
                  <span className="text-sm text-green-700">
                    -${discountAmount.toFixed(2)} discount
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleRemovePromo}
                  className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            )}

            {promoValidation && !promoValidation.valid && (
              <p className="text-xs text-red-600 mt-2">{promoValidation.message}</p>
            )}

            {promoValidation?.valid && (
              <p className="text-xs text-green-700 mt-2">{promoValidation.message}</p>
            )}

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-amber-700">
              <span className="font-medium">Try:</span>
              <span className="cursor-pointer hover:underline" onClick={() => { setPromoCode("SAVE10"); validatePromoCode("SAVE10"); }}>SAVE10</span>
              <span className="cursor-pointer hover:underline" onClick={() => { setPromoCode("WELCOME20"); validatePromoCode("WELCOME20"); }}>WELCOME20</span>
              <span className="cursor-pointer hover:underline" onClick={() => { setPromoCode("FIRST5"); validatePromoCode("FIRST5"); }}>FIRST5</span>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Summary */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Base Price ({passengers.length} seats × ${pricePerSeat})</span>
                <span className="font-medium text-slate-900">${baseTotal.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-700">Discount ({appliedPromo})</span>
                  <span className="font-medium text-green-700">-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-blue-200">
                <span className="text-base font-bold text-slate-900">Total Amount</span>
                <span className="text-xl font-bold text-blue-600">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Passengers List */}
        <div className="space-y-4">
          {passengers.map((passenger, index) => (
            <PassengerCard
              key={passenger.id}
              passenger={passenger}
              index={index}
              seatLabel={seatLabels[index] || selectedSeats[index]}
              errors={errors}
              touched={touched}
              onUpdate={(field, value) => updatePassenger(index, field, value)}
              onBlur={() => {
                if (touched[`${index}-name`]) {
                  validatePassengers();
                }
              }}
              isPrimaryUser={index === 0}
            />
          ))}
        </div>

        {/* Contact Note */}
        <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardContent className="flex items-start gap-3 p-4">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white mt-0.5">
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="flex-1 text-sm text-blue-800">
              <p className="font-medium">Important Information</p>
              <ul className="mt-1 space-y-0.5 text-xs text-blue-700">
                <li>• Make sure all details match your government ID</li>
                <li>• Contact number will be used for booking updates</li>
                <li>• You can edit passenger details before payment</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Submit Error */}
        {submitError && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="flex items-start gap-3 p-4">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-red-500 text-white mt-0.5">
                <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div className="flex-1 text-sm text-red-800">
                <p className="font-semibold">Booking Failed</p>
                <p className="text-red-700">{submitError}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-12 rounded-xl border-2 border-slate-200 hover:bg-slate-50"
            onClick={handleBack}
          >
            Back to Seat Selection
          </Button>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs text-slate-500">Total Amount</p>
              <p className="text-xl font-bold text-slate-900">${totalPrice}</p>
            </div>

            <Button
              type="submit"
              className="h-12 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-8 shadow-lg hover:shadow-xl transition-all"
              disabled={isSubmitting || !!submitError}
            >
              {isSubmitting ? (
                <>
                  <svg className="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </>
              ) : (
                <>
                  Continue to Payment
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Mobile total */}
        <div className="flex items-center justify-between rounded-xl bg-slate-100 px-4 py-3 sm:hidden">
          <span className="text-sm font-medium text-slate-600">Total Amount</span>
          <span className="text-lg font-bold text-slate-900">${totalPrice}</span>
        </div>
      </form>
    </div>
  );
}

type PassengerCardProps = {
  passenger: Passenger;
  index: number;
  seatLabel: string;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  onUpdate: (field: keyof Passenger, value: string) => void;
  onBlur: () => void;
  isPrimaryUser: boolean;
};

function PassengerCard({
  passenger,
  index,
  seatLabel,
  errors,
  touched,
  onUpdate,
  onBlur,
  isPrimaryUser,
}: PassengerCardProps) {
  const hasError = (field: string) => {
    const errorKey = `${index}-${field}`;
    return touched[errorKey] && errors[errorKey];
  };

  const getErrorMessage = (field: string) => {
    const errorKey = `${index}-${field}`;
    return errors[errorKey];
  };

  return (
    <Card className={cn(
      "border-2 transition-all duration-200",
      hasError("name") || hasError("age") || hasError("gender") || hasError("contactNumber")
        ? "border-red-300 bg-red-50/30"
        : "border-slate-200 bg-white hover:border-indigo-200 hover:shadow-md"
    )}>
      <CardContent className="p-5">
        {/* Card Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
              {index + 1}
            </div>
            <div>
              <h3 className="font-semibold text-slate-900">
                Passenger {index + 1}
              </h3>
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <span>Seat: {seatLabel}</span>
                {isPrimaryUser && (
                  <span className="flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    You
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Name Field */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`name-${index}`} className="text-sm font-semibold">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id={`name-${index}`}
                type="text"
                value={passenger.name}
                onChange={(e) => onUpdate("name", e.target.value)}
                onBlur={onBlur}
                placeholder="Enter full name"
                className={cn(
                  "h-11 rounded-xl pl-10",
                  hasError("name") && "border-red-400 focus:border-red-500"
                )}
              />
            </div>
            {hasError("name") && (
              <p className="text-xs text-red-600">{getErrorMessage("name")}</p>
            )}
          </div>

          {/* Age Field */}
          <div className="space-y-2">
            <Label htmlFor={`age-${index}`} className="text-sm font-semibold">
              Age <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id={`age-${index}`}
                type="number"
                min="1"
                max="120"
                value={passenger.age}
                onChange={(e) => onUpdate("age", e.target.value)}
                onBlur={onBlur}
                placeholder="Age"
                className={cn(
                  "h-11 rounded-xl pl-10",
                  hasError("age") && "border-red-400 focus:border-red-500"
                )}
              />
            </div>
            {hasError("age") && (
              <p className="text-xs text-red-600">{getErrorMessage("age")}</p>
            )}
          </div>

          {/* Gender Field */}
          <div className="space-y-2">
            <Label htmlFor={`gender-${index}`} className="text-sm font-semibold">
              Gender <span className="text-red-500">*</span>
            </Label>
            <Select
              value={passenger.gender}
              onValueChange={(value) => onUpdate("gender", value as "male" | "female" | "other")}
            >
              <SelectTrigger
                id={`gender-${index}`}
                className={cn(
                  "h-11 rounded-xl",
                  hasError("gender") && "border-red-400 focus:border-red-500"
                )}
              >
                <SelectValue placeholder="Select gender" />
              </SelectTrigger>
              <SelectContent>
                {GENDER_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasError("gender") && (
              <p className="text-xs text-red-600">{getErrorMessage("gender")}</p>
            )}
          </div>

          {/* Contact Number Field */}
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor={`contact-${index}`} className="text-sm font-semibold">
              Contact Number <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id={`contact-${index}`}
                type="tel"
                value={passenger.contactNumber}
                onChange={(e) => onUpdate("contactNumber", e.target.value)}
                onBlur={onBlur}
                placeholder="Enter phone number"
                className={cn(
                  "h-11 rounded-xl pl-10",
                  hasError("contactNumber") && "border-red-400 focus:border-red-500"
                )}
              />
            </div>
            {hasError("contactNumber") && (
              <p className="text-xs text-red-600">{getErrorMessage("contactNumber")}</p>
            )}
          </div>

          {/* Email Field (Optional) */}
          {isPrimaryUser && (
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor={`email-${index}`} className="text-sm font-semibold">
                Email (Optional)
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id={`email-${index}`}
                  type="email"
                  value={passenger.email || ""}
                  onChange={(e) => onUpdate("email", e.target.value)}
                  placeholder="Email for booking confirmation"
                  className="h-11 rounded-xl pl-10"
                />
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
