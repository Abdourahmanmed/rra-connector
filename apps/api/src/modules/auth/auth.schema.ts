import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export const registerSchema = z.object({
  fullName: z.string().trim().min(1),
  email: z.string().email(),
  password: z.string().min(8)
});
