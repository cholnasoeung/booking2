"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type ReferralData = {
  referralCode: string;
  referralLink: string;
  referredCount: number;
};

export default function ReferralPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  useEffect(() => {
    fetch("/api/user/referral")
      .then((r) => r.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  function copyToClipboard(text: string, type: "code" | "link") {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-3xl font-bold text-slate-900">Refer &amp; Earn</h1>
          <p className="mt-1 text-sm text-slate-500">Share your code and earn 50 loyalty points per friend who signs up.</p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
        </div>
      ) : !data ? (
        <p className="text-center text-slate-500 py-12">Unable to load referral info.</p>
      ) : (
        <>
          {/* Stats row */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <Card className="border-indigo-200 bg-indigo-50">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-indigo-700">{data.referredCount}</p>
                <p className="text-xs text-indigo-600 mt-1">Friends referred</p>
              </CardContent>
            </Card>
            <Card className="border-amber-200 bg-amber-50">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-amber-700">{data.referredCount * 50}</p>
                <p className="text-xs text-amber-600 mt-1">Points earned</p>
              </CardContent>
            </Card>
            <Card className="border-emerald-200 bg-emerald-50 col-span-2 sm:col-span-1">
              <CardContent className="pt-5 pb-4 text-center">
                <p className="text-3xl font-bold text-emerald-700">50</p>
                <p className="text-xs text-emerald-600 mt-1">Points per referral</p>
              </CardContent>
            </Card>
          </div>

          {/* Referral code */}
          <Card className="border-white/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">Your Referral Code</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50 py-3 text-center font-mono text-2xl font-bold tracking-widest text-indigo-700">
                  {data.referralCode}
                </div>
                <Button
                  variant="outline"
                  className="h-14 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-4"
                  onClick={() => copyToClipboard(data.referralCode, "code")}
                >
                  {copied === "code" ? "✓ Copied" : "Copy code"}
                </Button>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Or share your link</p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={data.referralLink}
                    className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 font-mono truncate focus:outline-none"
                  />
                  <Button
                    variant="outline"
                    className="shrink-0 rounded-xl border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                    onClick={() => copyToClipboard(data.referralLink, "link")}
                  >
                    {copied === "link" ? "✓" : "Copy"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="border-white/60 bg-white/90 shadow-xl">
            <CardHeader>
              <CardTitle className="text-lg">How it works</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-3">
                {[
                  { step: "1", text: "Share your referral code or link with friends." },
                  { step: "2", text: "Your friend signs up using your code." },
                  { step: "3", text: "You earn 50 loyalty points automatically." },
                  { step: "4", text: "Redeem points for discounts on future bookings." },
                ].map(({ step, text }) => (
                  <li key={step} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {step}
                    </span>
                    <span className="text-sm text-slate-700 pt-0.5">{text}</span>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
