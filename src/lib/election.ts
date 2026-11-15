/**
 * The next general election. Kenya votes on the second Tuesday of August every
 * fifth year. This is configuration, not logic: change it here (later: from the
 * admin console) and every countdown follows.
 */
export const NEXT_GENERAL_ELECTION = {
  label: "Next general election",
  /** Polls open 06:00 East Africa Time. */
  startsAt: "2027-08-10T06:00:00+03:00",
  dateLabel: "Tuesday 10 August 2027",
} as const;
