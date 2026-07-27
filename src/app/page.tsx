import { redirect } from "next/navigation";

import { ROUTES } from "@/shared/constants/app";

export default function HomePage() {
  redirect(ROUTES.dashboard);
}
