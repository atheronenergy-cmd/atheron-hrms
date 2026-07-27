import { v7 as uuidv7 } from "uuid";

export function generateId(): string {
  return uuidv7();
}

export function generateRequestId(): string {
  return uuidv7();
}

export function generateCode(prefix: string, sequence: number): string {
  return `${prefix}-${String(sequence).padStart(6, "0")}`;
}
