import type {
  SelfCheckDefinition,
  SelfCheckResponse,
  SelfCheckSubmission
} from './types';
import type { EntryContext } from './mood';
import { ValidationError, assertRating, resolveTimestamp, toDayKey } from './validation';

export interface SelfCheckScore {
  score: number;
  bandId: string | null;
}

/**
 * Sums the answers, inverting reverse-scored questions so that a higher total
 * always means "more strain". Every question must be answered — a partial
 * self-check has no meaningful score.
 */
export function scoreSelfCheck(
  definition: SelfCheckDefinition,
  answers: Record<string, number>
): SelfCheckScore {
  const known = new Set(definition.questions.map((question) => question.id));
  for (const id of Object.keys(answers)) {
    if (!known.has(id)) {
      throw new ValidationError('answers', `answers contains unknown question "${id}"`);
    }
  }

  let score = 0;
  for (const question of definition.questions) {
    const raw = answers[question.id];
    if (raw === undefined) {
      throw new ValidationError('answers', `answers is missing question "${question.id}"`);
    }

    const value = assertRating(raw, `answers.${question.id}`, question.min, question.max);
    score += question.reverseScored ? question.min + question.max - value : value;
  }

  const band = definition.bands.find((b) => score >= b.minScore && score <= b.maxScore);
  return { score, bandId: band ? band.id : null };
}

export function createSelfCheckResponse(
  definition: SelfCheckDefinition,
  submission: SelfCheckSubmission,
  context: EntryContext
): SelfCheckResponse {
  const completedAt = resolveTimestamp(submission.completedAt, context.now, 'completedAt');
  const { score, bandId } = scoreSelfCheck(definition, submission.answers);

  return {
    id: context.id,
    definitionId: definition.id,
    definitionVersion: definition.version,
    day: toDayKey(completedAt),
    completedAt: completedAt.toISOString(),
    answers: { ...submission.answers },
    score,
    bandId
  };
}

/**
 * Fails fast on a malformed questionnaire so a broken definition surfaces at
 * registration time rather than when an athlete is halfway through it.
 */
export function assertValidDefinition(definition: SelfCheckDefinition): SelfCheckDefinition {
  if (definition.questions.length === 0) {
    throw new ValidationError('questions', `self-check "${definition.id}" has no questions`);
  }

  const seen = new Set<string>();
  for (const question of definition.questions) {
    if (seen.has(question.id)) {
      throw new ValidationError('questions', `duplicate question id "${question.id}"`);
    }
    seen.add(question.id);

    if (!Number.isInteger(question.min) || !Number.isInteger(question.max)) {
      throw new ValidationError('questions', `question "${question.id}" needs whole-number bounds`);
    }
    if (question.min >= question.max) {
      throw new ValidationError('questions', `question "${question.id}" has an empty answer scale`);
    }
  }

  return definition;
}
