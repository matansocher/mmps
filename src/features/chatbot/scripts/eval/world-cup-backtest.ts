import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatOpenAI } from '@langchain/openai';
import { config } from 'dotenv';
import { dirname, join } from 'node:path';
import { writeFileSync } from 'node:fs';
import { env } from 'node:process';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { Logger } from '@core/utils';
import { getMatchDetails } from '@services/scores-365';
import { buildMatchDossier, buildPreviewPrompt, getWorldCupStandingsRows } from '../../schedulers/world-cup-preview';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = join(HERE, '../../../../../');
config({ path: join(REPO_ROOT, '.env') });

const logger = new Logger('wc-backtest');

// Completed Round-of-32 matches (2026 World Cup) with known outcomes.
const R32_MATCH_IDS = [4749274, 4749268, 4749273, 4747699, 4749272, 4749271, 4748888, 4748234, 4748109, 4747697];

const PREDICTOR_MODEL = 'gpt-4.1-mini'; // matches production chatbot model
const EXTRACTOR_MODEL = 'gpt-4.1-mini';
const JUDGE_MODEL = 'gpt-4o';

const predictionSchema = z.object({
  predictedOutcome: z.enum(['home', 'draw', 'away']).describe('The predicted 90-minute outcome the preview is leaning towards'),
  homeGoals: z.number().int().describe('Predicted home goals in the stated scoreline'),
  awayGoals: z.number().int().describe('Predicted away goals in the stated scoreline'),
  homeWinPct: z.number().describe('Home win probability percent stated in the preview'),
  drawPct: z.number().describe('Draw probability percent stated in the preview'),
  awayWinPct: z.number().describe('Away win probability percent stated in the preview'),
  confidence: z.string().describe('Confidence level stated (Low/Medium/High or similar)'),
});
type Prediction = z.infer<typeof predictionSchema>;

const judgeSchema = z.object({
  dataGrounding: z.number().min(1).max(5).describe('Are all stats/claims grounded in the provided dossier (no invented numbers)?'),
  reasoning: z.number().min(1).max(5).describe('Quality and depth of the tactical/analytical reasoning'),
  structure: z.number().min(1).max(5).describe('Formatting: header, standings, form, odds, analysis, prediction all present and clean'),
  languageEnglish: z.number().min(1).max(5).describe('Is the whole message fluent English (no leaked Hebrew from the raw data)?'),
  calibration: z.number().min(1).max(5).describe('Do probabilities/scoreline/confidence look internally consistent and sensible for a knockout tie?'),
  overall: z.number().min(1).max(5).describe('Overall quality of the preview'),
  critique: z.string().describe('One short sentence: the single most important thing to improve in the PROMPT that produced this'),
});
type Judgement = z.infer<typeof judgeSchema>;

const JUDGE_SYSTEM = `You are a strict, PRECISE evaluator of an AI-generated FIFA World Cup match preview.
You receive: (1) the raw DATA DOSSIER the model was given, and (2) the model's PREVIEW output.
Score the PREVIEW 1 (poor) to 5 (excellent) on each dimension. Evaluate ONLY what is actually true — do not give generic advice.

VERIFY, do not assume:
- calibration: ACTUALLY ADD the three win-probability numbers. If they total exactly 100, that part is correct — do NOT tell them to "make probabilities sum to 100" when they already do. Also, for a KNOCKOUT tie, check a winner is implied (either a decisive scoreline or an "Advances"/extra-time/penalties note). Penalize only real problems.
- dataGrounding: penalize ONLY numbers that contradict or are absent from the dossier.
- structure: if the dossier's "pregameStats" is null, betting odds are genuinely unavailable — do NOT penalize the preview for omitting the odds line in that case (omitting is the correct behaviour).
- languageEnglish: penalize only if actual Hebrew characters remain in the output.
Your critique must name a REAL, specific flaw in THIS preview, or say "No significant issues" if it is clean.
Return only the structured scores and the one-sentence critique.`;

type MatchResult = {
  matchId: number;
  fixture: string;
  statusText: string;
  actualScore: string;
  actualOutcome: 'home' | 'draw' | 'away';
  prediction: Prediction;
  outcomeCorrect: boolean;
  exactScoreCorrect: boolean;
  judgement: Judgement;
  preview: string;
};

function actualOutcome(home: number, away: number): 'home' | 'draw' | 'away' {
  if (home > away) return 'home';
  if (away > home) return 'away';
  return 'draw';
}

async function evalMatch(
  matchId: number,
  standings: Awaited<ReturnType<typeof getWorldCupStandingsRows>>,
  predictor: ChatOpenAI,
  extractor: ChatOpenAI,
  judge: ChatOpenAI,
): Promise<MatchResult> {
  const details = await getMatchDetails(matchId);
  const dossier = await buildMatchDossier(details, standings);
  const fixture = `${details.homeCompetitor.name} vs ${details.awayCompetitor.name}`;
  const date = details.startTime.slice(0, 10);

  const prompt = buildPreviewPrompt(date, [dossier]);
  const previewMsg = await predictor.invoke([new HumanMessage(prompt)]);
  const preview = String(previewMsg.content);

  const prediction = await extractor.withStructuredOutput(predictionSchema).invoke([
    new SystemMessage('Extract the prediction that the following World Cup preview is stating. Use the numbers exactly as written.'),
    new HumanMessage(preview),
  ]);

  const judgement = await judge.withStructuredOutput(judgeSchema).invoke([
    new SystemMessage(JUDGE_SYSTEM),
    new HumanMessage(`DATA DOSSIER:\n${JSON.stringify(dossier, null, 2)}\n\nPREVIEW OUTPUT:\n${preview}`),
  ]);

  const home = details.homeCompetitor.score ?? 0;
  const away = details.awayCompetitor.score ?? 0;
  const outcome = actualOutcome(home, away);

  return {
    matchId,
    fixture,
    statusText: details.statusText,
    actualScore: `${home}-${away}`,
    actualOutcome: outcome,
    prediction,
    outcomeCorrect: prediction.predictedOutcome === outcome,
    exactScoreCorrect: prediction.homeGoals === home && prediction.awayGoals === away,
    judgement,
    preview,
  };
}

async function main(): Promise<void> {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY not set');
  }
  const predictor = new ChatOpenAI({ model: PREDICTOR_MODEL, temperature: 0.2, apiKey: env.OPENAI_API_KEY });
  const extractor = new ChatOpenAI({ model: EXTRACTOR_MODEL, temperature: 0, apiKey: env.OPENAI_API_KEY });
  const judge = new ChatOpenAI({ model: JUDGE_MODEL, temperature: 0, apiKey: env.OPENAI_API_KEY });

  logger.log('Fetching World Cup standings...');
  const standings = await getWorldCupStandingsRows();

  const results: MatchResult[] = [];
  for (const id of R32_MATCH_IDS) {
    try {
      const r = await evalMatch(id, standings, predictor, extractor, judge);
      results.push(r);
      const marks = `${r.outcomeCorrect ? '✅' : '❌'} outcome  ${r.exactScoreCorrect ? '🎯' : '  '} exact`;
      logger.log(
        `${r.fixture} | actual ${r.actualScore} (${r.statusText}) | predicted ${r.prediction.predictedOutcome} ${r.prediction.homeGoals}-${r.prediction.awayGoals} | ${marks} | quality ${r.judgement.overall}/5`,
      );
    } catch (err) {
      logger.error(`Match ${id} failed: ${err}`);
    }
  }

  const n = results.length;
  const outcomeAcc = results.filter((r) => r.outcomeCorrect).length;
  const exactAcc = results.filter((r) => r.exactScoreCorrect).length;
  const avg = (sel: (j: Judgement) => number) => (results.reduce((s, r) => s + sel(r.judgement), 0) / n).toFixed(2);

  console.log('\n================ BACKTEST SUMMARY ================');
  console.log(`Matches evaluated: ${n}`);
  console.log(`Outcome accuracy:  ${outcomeAcc}/${n} (${((outcomeAcc / n) * 100).toFixed(0)}%)`);
  console.log(`Exact scoreline:   ${exactAcc}/${n}`);
  console.log('--- Avg judge scores (1-5) ---');
  console.log(`dataGrounding:   ${avg((j) => j.dataGrounding)}`);
  console.log(`reasoning:       ${avg((j) => j.reasoning)}`);
  console.log(`structure:       ${avg((j) => j.structure)}`);
  console.log(`languageEnglish: ${avg((j) => j.languageEnglish)}`);
  console.log(`calibration:     ${avg((j) => j.calibration)}`);
  console.log(`overall:         ${avg((j) => j.overall)}`);
  console.log('--- Critiques ---');
  results.forEach((r) => console.log(`• ${r.fixture}: ${r.judgement.critique}`));

  const reportFile = join(HERE, 'wc-backtest-report.json');
  writeFileSync(
    reportFile,
    JSON.stringify({ generatedAt: new Date().toISOString(), predictorModel: PREDICTOR_MODEL, judgeModel: JUDGE_MODEL, outcomeAcc, exactAcc, n, results }, null, 2),
  );
  console.log(`\nFull report: ${reportFile}`);
}

main().catch((err) => {
  logger.error(`Backtest failed: ${err}`);
  process.exit(1);
});
