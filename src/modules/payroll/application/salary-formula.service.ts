import type { FormulaValidationResult } from "@/modules/payroll/domain/types";
import { BusinessRuleError } from "@/shared/errors";

const TOKEN_REGEX = /([A-Z_][A-Z0-9_]*)|(\d+(?:\.\d+)?)|([+\-*/()])|(\s+)/gi;

export class SalaryFormulaEngine {
  validate(expression: string): FormulaValidationResult {
    const errors: string[] = [];
    const dependencies = new Set<string>();

    if (!expression.trim()) {
      return { valid: false, dependencies: [], errors: ["Expression is required"] };
    }

    const tokens = this.tokenize(expression);
    if (tokens.length === 0) errors.push("Invalid expression");

    for (const token of tokens) {
      if (/^[A-Z_][A-Z0-9_]*$/i.test(token) && !["AND", "OR", "NOT"].includes(token.toUpperCase())) {
        dependencies.add(token.toUpperCase());
      }
    }

    try {
      this.toRpn(tokens.map((t) => (/\d/.test(t) ? t : t.toUpperCase())));
    } catch (e) {
      errors.push(e instanceof Error ? e.message : "Invalid formula syntax");
    }

    return { valid: errors.length === 0, dependencies: [...dependencies], errors };
  }

  preview(expression: string, context: Record<string, number>): FormulaValidationResult {
    const validation = this.validate(expression);
    if (!validation.valid) return validation;

    for (const dep of validation.dependencies) {
      if (context[dep] === undefined) {
        return { ...validation, valid: false, errors: [`Missing context value for ${dep}`] };
      }
    }

    try {
      const normalized = this.normalizePercentages(expression);
      const tokens = this.tokenize(normalized).map((t) => (/^[A-Z_]/i.test(t) ? t.toUpperCase() : t));
      const value = this.evaluateRpn(this.toRpn(tokens), context);
      return { ...validation, preview: Math.round(value * 100) / 100 };
    } catch (e) {
      return { ...validation, valid: false, errors: [e instanceof Error ? e.message : "Evaluation failed"] };
    }
  }

  evaluate(expression: string, context: Record<string, number>) {
    const result = this.preview(expression, context);
    if (!result.valid || result.preview === undefined) {
      throw new BusinessRuleError(result.errors.join(", ") || "Formula evaluation failed");
    }
    return result.preview;
  }

  private normalizePercentages(expression: string) {
    return expression.replace(/(\d+(?:\.\d+)?)\s*%/g, (_, n) => String(Number(n) / 100));
  }

  private tokenize(expression: string) {
    const tokens: string[] = [];
    let match: RegExpExecArray | null;
    TOKEN_REGEX.lastIndex = 0;
    while ((match = TOKEN_REGEX.exec(expression)) !== null) {
      const token = match[0].trim();
      if (token) tokens.push(token);
    }
    return tokens;
  }

  private precedence(op: string) {
    if (op === "+" || op === "-") return 1;
    if (op === "*" || op === "/") return 2;
    return 0;
  }

  private toRpn(tokens: string[]) {
    const output: string[] = [];
    const ops: string[] = [];

    for (const token of tokens) {
      if (/^\d+(?:\.\d+)?$/.test(token) || /^[A-Z_][A-Z0-9_]*$/.test(token)) {
        output.push(token);
      } else if (token === "(") {
        ops.push(token);
      } else if (token === ")") {
        while (ops.length && ops[ops.length - 1] !== "(") output.push(ops.pop()!);
        if (!ops.length) throw new Error("Mismatched parentheses");
        ops.pop();
      } else if ("+-*/".includes(token)) {
        while (ops.length && ops[ops.length - 1] !== "(" && this.precedence(ops[ops.length - 1]!) >= this.precedence(token)) {
          output.push(ops.pop()!);
        }
        ops.push(token);
      } else {
        throw new Error(`Unexpected token: ${token}`);
      }
    }

    while (ops.length) {
      const op = ops.pop()!;
      if (op === "(" || op === ")") throw new Error("Mismatched parentheses");
      output.push(op);
    }
    return output;
  }

  private evaluateRpn(rpn: string[], context: Record<string, number>) {
    const stack: number[] = [];
    for (const token of rpn) {
      if (/^\d+(?:\.\d+)?$/.test(token)) {
        stack.push(Number(token));
      } else if (/^[A-Z_][A-Z0-9_]*$/.test(token)) {
        stack.push(context[token] ?? 0);
      } else {
        const b = stack.pop();
        const a = stack.pop();
        if (a === undefined || b === undefined) throw new Error("Invalid expression");
        switch (token) {
          case "+":
            stack.push(a + b);
            break;
          case "-":
            stack.push(a - b);
            break;
          case "*":
            stack.push(a * b);
            break;
          case "/":
            stack.push(b === 0 ? 0 : a / b);
            break;
          default:
            throw new Error(`Unknown operator: ${token}`);
        }
      }
    }
    if (stack.length !== 1) throw new Error("Invalid expression");
    return stack[0]!;
  }
}

export const salaryFormulaEngine = new SalaryFormulaEngine();
