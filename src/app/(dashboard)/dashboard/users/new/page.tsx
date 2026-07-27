import { redirect } from "next/navigation";

import { USER_ROUTES } from "@/modules/user/domain/types";

export default function LegacyCreateUserPage() {
  redirect(USER_ROUTES.create);
}
