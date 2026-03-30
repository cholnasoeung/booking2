import { redirect } from "next/navigation";

import Navbar from "@/components/navbar";
import RegisterForm from "@/components/register-form";
import { getCurrentUser } from "@/lib/auth";
import { getFirstSearchParam } from "@/lib/validation";

type RegisterPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function RegisterPage({
  searchParams,
}: RegisterPageProps) {
  const params = await searchParams;
  const callbackUrl = getFirstSearchParam(params.callbackUrl);
  const user = await getCurrentUser();

  if (user) {
    redirect(callbackUrl || "/dashboard");
  }

  return (
    <>
      <Navbar />
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] w-full max-w-6xl gap-10 px-4 py-10 sm:px-6 lg:grid-cols-[0.95fr_1.05fr] lg:px-8 lg:py-16">
      <div className="flex flex-col justify-center gap-6">
        <p className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
          Create account
        </p>
        <h1 className="font-heading text-5xl font-semibold tracking-tight text-foreground">
          Register once and keep every trip in one place.
        </h1>
        <p className="max-w-xl text-lg leading-8 text-muted-foreground">
          New accounts can search faster, save booking history, and jump straight
          back into the seat map when it&apos;s time to travel.
        </p>
      </div>

      <div className="flex items-center">
        <RegisterForm callbackUrl={callbackUrl} />
      </div>
    </div>
    </>
  );
}
