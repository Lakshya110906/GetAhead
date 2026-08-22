import { prisma } from "@/lib/prisma";
import { alertOncePerDay } from "@/lib/alerts";

// Approximate blended Gemini 2.0 Flash rates (USD per token). These are
// estimates for an internal early-warning signal, not a billing-accurate
// figure — Google Cloud billing is the source of truth for the actual
// invoice. The point of this module is to notice a runaway day *before*
// that invoice arrives, without needing to open the Google console to do it.
const INPUT_COST_PER_TOKEN = 0.10 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 0.40 / 1_000_000;

// Kill-switch threshold and alert threshold (half of it), both configurable
// without a code change. A malformed (non-numeric) env value falls back to
// the default rather than becoming NaN — NaN would make every comparison
// against it silently false, disabling the spend kill-switch entirely
// without any error or log to say so.
const parsedMaxDailySpend = Number(process.env.MAX_DAILY_SPEND_USD);
export const MAX_DAILY_SPEND_USD = Number.isFinite(parsedMaxDailySpend) && parsedMaxDailySpend > 0 ? parsedMaxDailySpend : 5;
const ALERT_FRACTION = 0.5;

function estimateCostUsd(promptTokens: number, completionTokens: number): number {
  return promptTokens * INPUT_COST_PER_TOKEN + completionTokens * OUTPUT_COST_PER_TOKEN;
}

function todayRange() {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end, dateKey: start.toISOString().slice(0, 10) };
}

export interface SpendSnapshot {
  date: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedUsd: number;
  thresholdUsd: number;
  killSwitchActive: boolean;
}

/** Today's aggregate token usage and estimated spend across evaluations and question papers. */
export async function getTodaysSpend(): Promise<SpendSnapshot> {
  const { start, end, dateKey } = todayRange();

  const [evalAgg, paperAgg] = await Promise.all([
    prisma.evaluation.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
    }),
    prisma.questionPaper.aggregate({
      where: { createdAt: { gte: start, lt: end } },
      _sum: { promptTokens: true, completionTokens: true, totalTokens: true },
    }),
  ]);

  const promptTokens = (evalAgg._sum.promptTokens ?? 0) + (paperAgg._sum.promptTokens ?? 0);
  const completionTokens = (evalAgg._sum.completionTokens ?? 0) + (paperAgg._sum.completionTokens ?? 0);
  const totalTokens = (evalAgg._sum.totalTokens ?? 0) + (paperAgg._sum.totalTokens ?? 0);
  const estimatedUsd = estimateCostUsd(promptTokens, completionTokens);

  return {
    date: dateKey,
    promptTokens,
    completionTokens,
    totalTokens,
    estimatedUsd,
    thresholdUsd: MAX_DAILY_SPEND_USD,
    killSwitchActive: estimatedUsd >= MAX_DAILY_SPEND_USD,
  };
}

/**
 * Call this after every model call that might push spend over the alert
 * threshold. Fires at most once per day (tracked via SystemSetting) so it
 * doesn't spam once the threshold is crossed.
 */
export async function maybeAlertHalfwayToThreshold(snapshot: SpendSnapshot): Promise<void> {
  if (snapshot.estimatedUsd < snapshot.thresholdUsd * ALERT_FRACTION) return;

  await alertOncePerDay(
    "spend-alert-sent",
    "SPEND_ALERT",
    `Estimated spend today is $${snapshot.estimatedUsd.toFixed(2)}, past ${Math.round(ALERT_FRACTION * 100)}% of the $${snapshot.thresholdUsd} daily threshold (${snapshot.totalTokens} tokens).`
  );
}

export class SpendLimitReachedError extends Error {
  constructor(public readonly snapshot: SpendSnapshot) {
    super(
      `Daily spend threshold reached (~$${snapshot.estimatedUsd.toFixed(2)} of $${snapshot.thresholdUsd}). New evaluations and question papers are paused until it resets at UTC midnight.`
    );
    this.name = "SpendLimitReachedError";
  }
}

// The admin "Maintenance mode" toggle (src/app/api/admin/settings/route.ts)
// used to write SystemSetting("maintenanceMode") and nothing ever read it —
// an admin flipping it during an incident got a success toast and zero
// actual effect on the running app. Both call sites of assertSpendGateOpen()
// already catch SpendLimitReachedError and turn it into the same 503
// { maintenance: true } response the frontend displays, so reusing that
// error (rather than inventing a second maintenance-specific one) wires the
// toggle in without touching either caller.
export class MaintenanceModeError extends SpendLimitReachedError {
  constructor(snapshot: SpendSnapshot) {
    super(snapshot);
    this.message = "The app is currently in maintenance mode. New evaluations and question papers are temporarily paused — please check back shortly.";
    this.name = "MaintenanceModeError";
  }
}

async function isMaintenanceModeOn(): Promise<boolean> {
  const setting = await prisma.systemSetting.findUnique({ where: { key: "maintenanceMode" } });
  return setting?.value === "true";
}

/**
 * The kill switch. Call before enqueueing any new evaluation or paper
 * generation job — throws if maintenance mode is on, or if today's
 * estimated spend has crossed the threshold, either of which the caller
 * should turn into a 503 "maintenance" response rather than accepting the
 * job.
 */
export async function assertSpendGateOpen(): Promise<void> {
  const snapshot = await getTodaysSpend();

  if (await isMaintenanceModeOn()) {
    throw new MaintenanceModeError(snapshot);
  }

  await maybeAlertHalfwayToThreshold(snapshot);
  if (snapshot.killSwitchActive) {
    throw new SpendLimitReachedError(snapshot);
  }
}
