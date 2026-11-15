import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("purge expired security records", { hours: 1 }, internal.maintenance.purgeExpired);
export default crons;
