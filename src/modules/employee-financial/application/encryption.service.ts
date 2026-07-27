import { encryptValue, decryptValue } from "@/modules/security/application/encryption.service";
import { dataMaskingService } from "@/modules/security/application/data-masking.service";

export type SensitiveFieldType = "bank_account" | "pan" | "phone" | "aadhaar" | "salary" | "generic";

/**
 * Encryption + masking abstraction for employee financial data.
 */
export class EncryptionService {
  encrypt(plaintext: string | null | undefined): string | null {
    if (!plaintext || plaintext.trim() === "") return null;
    return encryptValue(plaintext.trim());
  }

  decrypt(ciphertext: string | null | undefined, canView: boolean): string | null {
    if (!ciphertext) return null;
    if (!canView) return null;
    try {
      return decryptValue(ciphertext);
    } catch {
      return null;
    }
  }

  mask(value: string | null | undefined, field: SensitiveFieldType, canView = false): string {
    if (!value) return "—";
    if (canView) return value;
    switch (field) {
      case "bank_account":
        return dataMaskingService.maskBankAccount(value);
      case "pan":
        return dataMaskingService.maskPan(value);
      case "phone":
        return dataMaskingService.maskPhone(value);
      case "aadhaar":
        return dataMaskingService.maskAadhaar(value);
      case "salary":
        return dataMaskingService.maskSalary(value, false);
      default:
        return "••••••••";
    }
  }

  present(
    ciphertext: string | null | undefined,
    field: SensitiveFieldType,
    canViewSensitive: boolean,
  ): string {
    if (!ciphertext) return "—";
    const decrypted = this.decrypt(ciphertext, canViewSensitive);
    if (decrypted) return decrypted;
    return this.mask("********", field, false);
  }
}

export const encryptionService = new EncryptionService();
