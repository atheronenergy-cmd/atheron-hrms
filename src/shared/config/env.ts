import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  NEXT_PUBLIC_APP_NAME: z.string().default("Atheron HRMS"),
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_URL: z.string().url().optional(),
  JWT_SECRET: z.string().min(32).optional(),
  ENCRYPTION_KEY: z.string().min(32).optional(),
  REDIS_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  STORAGE_PROVIDER: z.enum(["local", "s3", "r2", "minio"]).default("local"),
  STORAGE_LOCAL_PATH: z.string().default("./uploads"),
  STORAGE_EXPORT_PATH: z.string().default("./exports"),
  STORAGE_R2_ACCOUNT_ID: z.string().optional(),
  STORAGE_R2_ACCESS_KEY: z.string().optional(),
  STORAGE_R2_SECRET_KEY: z.string().optional(),
  STORAGE_R2_BUCKET: z.string().optional(),
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().default(60000),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const fieldErrors = parsed.error.flatten().fieldErrors;
    if (process.env.NODE_ENV === "production") {
      throw new Error(`Invalid environment configuration: ${JSON.stringify(fieldErrors)}`);
    }
    console.warn("Environment validation warnings:", fieldErrors);
    return envSchema.parse({
      ...process.env,
      NODE_ENV: process.env.NODE_ENV ?? "development",
    });
  }

  if (parsed.data.NODE_ENV === "production") {
    const requiredInProd = ["DATABASE_URL", "AUTH_SECRET"] as const;
    const missing = requiredInProd.filter((key) => !process.env[key]);
    if (missing.length > 0) {
      throw new Error(`Missing required production environment variables: ${missing.join(", ")}`);
    }
  }

  return parsed.data;
}

export const env = loadEnv();

export const appConfig = {
  name: env.NEXT_PUBLIC_APP_NAME,
  url: env.NEXT_PUBLIC_APP_URL,
  isDev: env.NODE_ENV === "development",
  isProd: env.NODE_ENV === "production",
} as const;
