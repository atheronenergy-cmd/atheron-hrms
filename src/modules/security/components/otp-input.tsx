"use client";

import { useRef } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OTPInputProps = {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
};

export function OTPInput({
  length = 6,
  value,
  onChange,
  disabled,
  id = "otp",
}: OTPInputProps) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.padEnd(length, " ").slice(0, length).split("");

  function updateDigit(index: number, digit: string) {
    const clean = digit.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean || " ";
    const joined = next.join("").replace(/\s/g, "");
    onChange(joined);

    if (clean && index < length - 1) {
      inputsRef.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, key: string) {
    if (key === "Backspace" && !digits[index]?.trim() && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  }

  function handlePaste(text: string) {
    const clean = text.replace(/\D/g, "").slice(0, length);
    onChange(clean);
    inputsRef.current[Math.min(clean.length, length - 1)]?.focus();
  }

  return (
    <div className="flex gap-2 justify-center" role="group" aria-label="One-time password">
      {digits.map((digit, index) => (
        <Input
          key={index}
          id={index === 0 ? id : undefined}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          className={cn("w-11 h-12 text-center text-lg font-mono")}
          value={digit.trim()}
          disabled={disabled}
          onChange={(e) => updateDigit(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e.key)}
          onPaste={(e) => {
            e.preventDefault();
            handlePaste(e.clipboardData.getData("text"));
          }}
        />
      ))}
    </div>
  );
}
