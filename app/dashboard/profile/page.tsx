import { redirect } from "next/navigation";

import ProfileView from "@/components/profile-view";
import { requireUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser("/login?callbackUrl=%2Fdashboard%2Fprofile");
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:px-12">
      <ProfileView user={currentUser} />
    </div>
  );
}
