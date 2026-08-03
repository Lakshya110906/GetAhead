import { prisma } from "@/lib/prisma";

// Approximate blended Gemini 2.0 Flash rates (USD per token). These are
// estimates for an internal early-warning signal, not a billing-accurate
// figure — Google Cloud billing is the source of truth for the actual
// invoice. The point of this module is to notice a runaway day *before*
// that invoice arrives, without needing to open the Google console to do it.
const INPUT_COST_PER_TOKEN = 0.10 / 1_000_000;
const OUTPUT_COST_PER_TOKEN = 0.40 / 1_000_000;

// Kill-switch threshold and alert threshold (half of it), both configurable
// without a code change.
export const MAX_DAILY_SPEND_USD = Number(process.env.MAX_DAILY_SPEND_USD || 5);
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
 * Records an ops alert both to the server log (visible in Vercel's function
 * logs immediately) and to ErrorLog (visible in the admin panel's System
 * Logs tab, which already lists these) so it's durable and doesn't depend
 * on catching the log line live. There's no external channel (email/Slack)
 * wired up here — plug one in inside this function when you have one.
 */
async function sendOpsAlert(message: string): Promise<void> {
  console.error(`[SPEND ALERT] ${message}`);
  try {
    await prisma.errorLog.create({
      data: { type: "SPEND_ALERT", message, path: "spendControl" },
    });
  } catch (err) {
    console.error("[SPEND ALERT] failed to persist alert log:", err);
  }
}

/**
 * Call this after every model call that might push spend over the alert
 * threshold. Fires at most once per day (tracked via SystemSetting) so it
 * doesn't spam once the threshold is crossed.
 */
export async function maybeAlertHalfwayToThreshold(snapshot: SpendSnapshot): Promise<void> {
  if (snapshot.estimatedUsd < snapshot.thresholdUsd * ALERT_FRACTION) return;

  const alertKey = `spend-alert-sent:${snapshot.date}`;
  const already = await prisma.systemSetting.findUnique({ where: { key: alertKey } });
  if (already) return;

  await sendOpsAlert(
    `Estimated spend today is $${snapshot.estimatedUsd.toFixed(2)}, past ${Math.round(ALERT_FRACTION * 100)}% of the $${snapshot.thresholdUsd} daily threshold (${snapshot.totalTokens} tokens).`
  );

  await prisma.systemSetting.upsert({
    where: { key: alertKey },
    create: { key: alertKey, value: new Date().toISOString() },
    update: { value: new Date().toISOString() },
  });
}

export class SpendLimitReachedError extends Error {
  constructor(public readonly snapshot: SpendSnapshot) {
    super(
      `Daily spend threshold reached (~$${snapshot.estimatedUsd.toFixed(2)} of $${snapshot.thresholdUsd}). New evaluations and question papers are paused until it resets at UTC midnight.`
    );
    this.name = "SpendLimitReachedError";
  }
}

/**
 * The kill switch. Call before enqueueing any new evaluation or paper
 * generation job — throws if today's estimated spend has crossed the
 * threshold, which the caller should turn into a 503 "maintenance" response
 * rather than accepting the job.
 */
export async function assertSpendGateOpen(): Promise<void> {
  const snapshot = await getTodaysSpend();
  await maybeAlertHalfwayToThreshold(snapshot);
  if (snapshot.killSwitchActive) {
    throw new SpendLimitReachedError(snapshot);
  }
}
