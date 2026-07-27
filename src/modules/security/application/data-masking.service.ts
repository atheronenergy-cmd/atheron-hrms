export type MaskableField = "aadhaar" | "bank_account" | "salary" | "pan" | "phone";

export class DataMaskingService {
  maskAadhaar(value: string | null | undefined): string {
    if (!value) return "—";
    const digits = value.replace(/\D/g, "");
    if (digits.length < 4) return "XXXX XXXX XXXX";
    const last4 = digits.slice(-4);
    return `XXXX XXXX ${last4}`;
  }

  maskBankAccount(value: string | null | undefined): string {
    if (!value) return "—";
    const digits = value.replace(/\D/g, "");
    if (digits.length < 4) return "XXXXXX";
    return `XXXXXX${digits.slice(-4)}`;
  }

  maskSalary(value: number | string | null | undefined, canView: boolean): string {
    if (value == null) return "—";
    if (!canView) return "Restricted";
    return typeof value === "number" ? value.toLocaleString("en-IN") : value;
  }

  maskPan(value: string | null | undefined): string {
    if (!value) return "—";
    if (value.length <= 4) return "XXXXX";
    return `XXXXX${value.slice(-4)}`;
  }

  maskPhone(value: string | null | undefined): string {
    if (!value) return "—";
    const digits = value.replace(/\D/g, "");
    if (digits.length < 4) return "XXXX";
    return `XXXXXX${digits.slice(-4)}`;
  }

  maskField(field: MaskableField, value: unknown, canView = false): string {
    switch (field) {
      case "aadhaar":
        return this.maskAadhaar(String(value ?? ""));
      case "bank_account":
        return this.maskBankAccount(String(value ?? ""));
      case "salary":
        return this.maskSalary(value as number | string | null, canView);
      case "pan":
        return this.maskPan(String(value ?? ""));
      case "phone":
        return this.maskPhone(String(value ?? ""));
      default:
        return canView ? String(value ?? "—") : "Restricted";
    }
  }
}

export const dataMaskingService = new DataMaskingService();
