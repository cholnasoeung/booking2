import { redirect } from "next/navigation";

import LoginForm from "@/components/login-form";
import { getCurrentUser } from "@/lib/auth";
import { getFirstSearchParam } from "@/lib/validation";

type LoginPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const callbackUrl = getFirstSearchParam(params.callbackUrl);
  const user = await getCurrentUser();

  if (user) {
    redirect(callbackUrl || "/dashboard");
  }

  return (
    <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
      <div className="flex flex-col justify-center gap-6">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          Account access
        </p>
        <h1 className="font-heading text-5xl font-semibold tracking-tight text-foreground">
          Sign in before you lock in seats.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          Logging in keeps your booking history together and lets the app attach
          new trips directly to your dashboard.
        </p>
      </div>

      <div className="flex items-center">
        <LoginForm callbackUrl={callbackUrl} />
      </div>
    </div>
  );
}
