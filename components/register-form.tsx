"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type RegisterFormProps = {
  callbackUrl?: string;
};

export default function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsPending(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        setError(payload.message || "Unable to create your account.");
        return;
      }

      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!loginResult || loginResult.error) {
        router.push(
          callbackUrl
            ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
            : "/login"
        );
        return;
      }

      router.push(callbackUrl || "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to create your account right now.");
    } finally {
      setIsPending(false);
    }
  }

  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  return (
    <Card className="border-white/60 bg-white/90 shadow-2xl shadow-red-950/10">
      <CardHeader>
        <CardTitle>Create your account</CardTitle>
        <CardDescription>
          Save passengers, manage upcoming trips, and book seats in a few taps.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="register-name">Full name</Label>
            <Input
              id="register-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-email">Email</Label>
            <Input
              id="register-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-password">Password</Label>
            <Input
              id="register-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 6 characters"
              required
              className="h-11 rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="register-confirm-password">Confirm password</Label>
            <Input
              id="register-confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Repeat your password"
              required
              className="h-11 rounded-2xl"
            />
          </div>

          {error ? (
            <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            size="lg"
            disabled={isPending}
            className="h-11 w-full rounded-2xl"
          >
            {isPending ? "Creating account..." : "Register"}
          </Button>
        </form>

        <p className="mt-5 text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href={loginHref} className="font-medium text-primary hover:underline">
            Login
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
