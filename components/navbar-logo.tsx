"use client";

import { useState } from "react";

type Props = {
  logoUrl: string | null;
  businessName: string;
  initials: string;
};

export default function NavbarLogo({ logoUrl, businessName, initials }: Props) {
  const [imgError, setImgError] = useState(false);
  const showImage = !!logoUrl && !imgError;

  return (
    <>
      {showImage ? (
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white border border-slate-200 shadow-lg shadow-indigo-500/10 group-hover:shadow-indigo-500/30 group-hover:scale-105 transition-all duration-200 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={logoUrl}
            alt={businessName}
            className="h-9 w-9 object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      ) : (
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-[13px] font-black text-white shadow-lg shadow-indigo-500/30 group-hover:shadow-indigo-500/50 group-hover:scale-105 transition-all duration-200 select-none">
          {initials}
        </div>
      )}
      <div className="hidden sm:block leading-none">
        <p className="text-[14px] font-bold tracking-tight text-slate-900">{businessName}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">Bus tickets with live seat maps</p>
      </div>
    </>
  );
}
