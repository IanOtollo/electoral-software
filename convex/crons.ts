import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();
crons.interval("purge expired security records", { hours: 1 }, internal.maintenance.purgeExpired);
// Approved messages go out here once their scheduled time arrives (and only inside 08:00-17:00 EAT).
crons.interval("send due messages", { minutes: 5 }, internal.smsSend.run);
export default crons;
