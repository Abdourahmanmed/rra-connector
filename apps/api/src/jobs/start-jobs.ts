import { Env } from "../config/env";
import { logger } from "../config/logger";
import {
  runGenerateMissingPdfsJob,
  runCleanupPublicLinksJob,
  runInvoicePollerJob,
  runRetryFailedSubmissionsJob,
  runSyncRraCodesJob
} from "./index";

const cron = require("node-cron") as {
  validate: (expression: string) => boolean;
  schedule: (expression: string, handler: () => void) => void;
};

type JobDefinition = {
  name: string;
  configuredSchedule: string;
  defaultSchedule: string;
  run: () => Promise<unknown>;
};

declare global {
  var __rraJobsSchedulerStarted: boolean | undefined;
}

function createNonOverlappingJobRunner(jobName: string, schedule: string, run: () => Promise<unknown>): () => Promise<void> {
  let isRunning = false;

  return async () => {
    if (isRunning) {
      logger.warn("Scheduled job skipped due to overlap", {
        job: jobName,
        schedule
      });
      return;
    }

    isRunning = true;
    const startedAt = Date.now();

    logger.info("Scheduled job started", {
      job: jobName,
      schedule
    });

    try {
      await run();
      logger.info("Scheduled job completed", {
        job: jobName,
        schedule,
        durationMs: Date.now() - startedAt
      });
    } catch (error) {
      logger.error("Scheduled job failed", {
        job: jobName,
        schedule,
        durationMs: Date.now() - startedAt,
        error: error instanceof Error ? error.message : "Unknown scheduling error"
      });
    } finally {
      isRunning = false;
    }
  };
}

function resolveSchedule(job: JobDefinition): string {
  if (cron.validate(job.configuredSchedule)) {
    return job.configuredSchedule;
  }

  logger.warn("Invalid cron expression detected; falling back to default", {
    job: job.name,
    configuredSchedule: job.configuredSchedule,
    defaultSchedule: job.defaultSchedule
  });

  return job.defaultSchedule;
}

export function startJobsScheduler(): void {
  if (globalThis.__rraJobsSchedulerStarted) {
    logger.debug("Jobs scheduler already started; skipping duplicate initialization");
    return;
  }

  const jobs: JobDefinition[] = [
    {
      name: "invoice-poller",
      configuredSchedule: Env.INVOICE_POLLER_CRON,
      defaultSchedule: "*/5 * * * * *",
      run: () => runInvoicePollerJob()
    },
    {
      name: "generate-missing-pdfs",
      configuredSchedule: Env.GENERATE_MISSING_PDFS_CRON,
      defaultSchedule: "*/10 * * * * *",
      run: () => runGenerateMissingPdfsJob()
    },
    {
      name: "retry-failed-submissions",
      configuredSchedule: Env.RETRY_FAILED_SUBMISSIONS_CRON,
      defaultSchedule: "*/30 * * * * *",
      run: () => runRetryFailedSubmissionsJob()
    },
    {
      name: "cleanup-public-links",
      configuredSchedule: Env.CLEANUP_PUBLIC_LINKS_CRON,
      defaultSchedule: "*/5 * * * *",
      run: () => runCleanupPublicLinksJob()
    },
    {
      name: "sync-rra-codes",
      configuredSchedule: Env.SYNC_RRA_CODES_CRON,
      defaultSchedule: "0 */6 * * *",
      run: () => runSyncRraCodesJob()
    }
  ];

  const registeredJobs = jobs.map((job) => {
    const schedule = resolveSchedule(job);
    const runJobWithoutOverlap = createNonOverlappingJobRunner(job.name, schedule, job.run);

    cron.schedule(schedule, () => {
      void runJobWithoutOverlap();
    });

    logger.info("Scheduled job registered", {
      job: job.name,
      schedule
    });

    return {
      name: job.name,
      schedule
    };
  });

  globalThis.__rraJobsSchedulerStarted = true;

  logger.info("Jobs scheduler started", {
    jobs: registeredJobs
  });
}
