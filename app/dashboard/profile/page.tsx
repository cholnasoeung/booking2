import { redirect } from "next/navigation";

import ProfileView from "@/components/dashboard/profile-view";
import { requireUser } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";

export default async function ProfilePage() {
  const user = await requireUser("/login?callbackUrl=%2Fdashboard%2Fprofile");
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login");
  }

  return <ProfileView user={currentUser} />;
}
