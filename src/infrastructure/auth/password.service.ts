import bcrypt from "bcryptjs";

import { passwordSchema } from "@/modules/auth/validation/schemas";
import { AUTH_CONFIG } from "@/shared/constants/auth";

export { validatePasswordStrength } from "@/shared/validation/password-strength";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function isPasswordValid(password: string): boolean {
  return passwordSchema.safeParse(password).success;
}
