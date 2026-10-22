import { redirect } from "next/navigation";

// The old accreditation queue used mock data.
// Alumni now self-register and go through the /admin/alumni-applications page.
export default function AccreditationRedirect() {
  redirect("/admin/alumni-applications");
}
