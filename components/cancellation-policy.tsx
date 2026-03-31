"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Info, Clock, AlertCircle } from "lucide-react";

interface CancellationPolicy {
  hoursBeforeDeparture: number;
  refundPercentage: number;
  description: string;
}

const CANCELLATION_POLICIES: CancellationPolicy[] = [
  {
    hoursBeforeDeparture: 48,
    refundPercentage: 100,
    description: "Full refund if cancelled 48 hours before departure",
  },
  {
    hoursBeforeDeparture: 24,
    refundPercentage: 75,
    description: "75% refund if cancelled 24-48 hours before departure",
  },
  {
    hoursBeforeDeparture: 4,
    refundPercentage: 50,
    description: "50% refund if cancelled 4-24 hours before departure",
  },
  {
    hoursBeforeDeparture: 0,
    refundPercentage: 0,
    description: "No refund within 4 hours of departure",
  },
];

interface CancellationPolicyDisplayProps {
  departureTime: string;
  departureDate: string;
  bookingPrice: number;
  onBooking?: boolean;
}

export default function CancellationPolicyDisplay({
  departureTime,
  departureDate,
  bookingPrice,
  onBooking = false,
}: CancellationPolicyDisplayProps) {
  const [selectedReason, setSelectedReason] = useState<string | null>(null);

  const calculateCurrentRefund = (): { policy: CancellationPolicy; refundAmount: number } => {
    const now = new Date();
    const departure = new Date(`${departureDate}T${departureTime}`);
    const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

    let applicablePolicy = CANCELLATION_POLICIES[CANCELLATION_POLICIES.length - 1];

    for (const policy of CANCELLATION_POLICIES) {
      if (hoursUntilDeparture >= policy.hoursBeforeDeparture) {
        applicablePolicy = policy;
        break;
      }
    }

    const refundAmount = (bookingPrice * applicablePolicy.refundPercentage) / 100;

    return { policy: applicablePolicy, refundAmount };
  };

  const { policy, refundAmount } = calculateCurrentRefund();

  const CANCELLATION_REASONS = [
    "Change of plans",
    "Found alternative transportation",
    "Personal emergency",
    "Health reasons",
    "Work commitment",
    "Weather concerns",
    "Other",
  ];

  return (
    <Card className={`${onBooking ? 'border-blue-200 bg-blue-50' : 'border-slate-200'} overflow-hidden`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {onBooking ? (
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className={`text-sm font-semibold ${onBooking ? 'text-blue-900' : 'text-slate-900'}`}>
                Cancellation Policy
              </h3>
              <Badge variant={policy.refundPercentage === 100 ? "secondary" : "outline"}>
                {policy.refundPercentage}% Refund
              </Badge>
            </div>

            {/* Current Status */}
            <div className={`rounded-lg p-3 mb-3 ${
              policy.refundPercentage === 100
                ? 'bg-green-50 border border-green-200'
                : policy.refundPercentage === 0
                ? 'bg-red-50 border border-red-200'
                : 'bg-amber-50 border border-amber-200'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-slate-700">
                  If you cancel now:
                </span>
                <span className={`text-lg font-bold ${
                  policy.refundPercentage === 100
                    ? 'text-green-700'
                    : policy.refundPercentage === 0
                    ? 'text-red-700'
                    : 'text-amber-700'
                }`}>
                  ${refundAmount.toFixed(2)}
                </span>
              </div>
              <p className="text-xs text-slate-600">{policy.description}</p>
            </div>

            {/* View Full Policy */}
            <Dialog>
              <DialogTrigger asChild>
                <Button type="button" variant="outline" size="sm" className="w-full">
                  <Clock className="w-4 h-4 mr-1" />
                  View Full Policy
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Cancellation & Refund Policy</DialogTitle>
                  <DialogDescription>
                    Review our cancellation terms before booking
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-3 mt-4">
                  {CANCELLATION_POLICIES.map((policyItem, index) => (
                    <div
                      key={index}
                      className={`p-3 rounded-lg border ${
                        policyItem.hoursBeforeDeparture === policy.hoursBeforeDeparture
                          ? 'border-red-500 bg-red-50'
                          : 'border-slate-200 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-900">
                          {policyItem.hoursBeforeDeparture === 0
                            ? 'Within 4 hours'
                            : `${policyItem.hoursBeforeDeparture}+ hours before`}
                        </span>
                        <Badge
                          variant={policyItem.refundPercentage === 100 ? "secondary" : "outline"}
                          className={policyItem.refundPercentage === 100 ? 'bg-green-100 text-green-800' : ''}
                        >
                          {policyItem.refundPercentage}% Refund
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600">{policyItem.description}</p>
                    </div>
                  ))}

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Note:</strong> Refund will be processed to the original payment method within 5-7 business days.
                      Promo codes used will not be reinstated upon cancellation.
                    </p>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Cancellation Reason (when cancelling) */}
            {!onBooking && (
              <div className="mt-3 space-y-2">
                <label className="text-xs font-medium text-slate-700">
                  Reason for cancellation (optional):
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {CANCELLATION_REASONS.map((reason) => (
                    <button
                      key={reason}
                      type="button"
                      className={`text-xs px-2 py-1.5 rounded border text-left transition-colors ${
                        selectedReason === reason
                          ? 'border-red-500 bg-red-50 text-red-700'
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                      onClick={() => setSelectedReason(reason)}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Calculate refund amount based on cancellation timing
 */
export function calculateRefundAmount(
  bookingPrice: number,
  departureDate: string,
  departureTime: string
): number {
  const now = new Date();
  const departure = new Date(`${departureDate}T${departureTime}`);
  const hoursUntilDeparture = (departure.getTime() - now.getTime()) / (1000 * 60 * 60);

  let refundPercentage = 0;

  if (hoursUntilDeparture > 48) {
    refundPercentage = 100;
  } else if (hoursUntilDeparture > 24) {
    refundPercentage = 75;
  } else if (hoursUntilDeparture > 4) {
    refundPercentage = 50;
  }

  return (bookingPrice * refundPercentage) / 100;
}
