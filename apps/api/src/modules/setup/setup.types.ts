import type { z } from "zod";
import type {
  completeSetupSchema,
  testSqlSchema,
  testVsdcSchema
} from "./setup.schema";

export type TestSqlInput = z.infer<typeof testSqlSchema>;
export type TestVsdcInput = z.infer<typeof testVsdcSchema>;
export type CompleteSetupInput = z.infer<typeof completeSetupSchema>;

export type SetupStatusResponse = {
  initialized: boolean;
  configuredAt: string | null;
};

export type ServiceResult<T = undefined> =
  | { success: true; message: string; data?: T }
  | { success: false; message: string; details?: string };
