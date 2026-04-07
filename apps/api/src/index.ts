import { startJobsScheduler } from "./jobs/start-jobs";
import { startServer } from "./server";

startServer();
startJobsScheduler();
