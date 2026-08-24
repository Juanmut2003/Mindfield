import { describe, expect, it } from 'vitest';
import { assertValidDefinition, createSelfCheckResponse, scoreSelfCheck } from './self-check';
import { ValidationError } from './validation';
import type { SelfCheckDefinition } from './types';

// A throwaway questionnaire: no validated clinical instrument is bundled yet.
const definition: SelfCheckDefinition = {
  id: 'strain-check',
  version: 1,
  title: 'Belastungs-Check',
  questions: [
    { id: 'q1', text: 'Ich fühle mich ausgelaugt.', min: 1, max: 5 },
    { id: 'q2', text: 'Ich schlafe erholsam.', min: 1, max: 5, reverseScored: true }
  ],
  bands: [
    { id: 'low', label: 'Unauffällig', minScore: 2, maxScore: 5 },
    { id: 'elevated', label: 'Erhöht', minScore: 6, maxScore: 10 }
  ]
};

describe('scoreSelfCheck', () => {
  it('inverts reverse-scored questions so a higher total always means more strain', () => {
    // q2 answered 5 ("schlafe sehr erholsam") inverts to 1.
    expect(scoreSelfCheck(definition, { q1: 4, q2: 5 })).toEqual({ score: 5, bandId: 'low' });
  });

  it('assigns the band the raw score falls into', () => {
    expect(scoreSelfCheck(definition, { q1: 5, q2: 1 })).toEqual({ score: 10, bandId: 'elevated' });
  });

  it('reports no band when the score falls outside every range', () => {
    const unbanded: SelfCheckDefinition = { ...definition, bands: [] };

    expect(scoreSelfCheck(unbanded, { q1: 3, q2: 3 }).bandId).toBeNull();
  });

  it('rejects a partially answered questionnaire', () => {
    expect(() => scoreSelfCheck(definition, { q1: 3 })).toThrow(ValidationError);
  });

  it('rejects answers to questions the questionnaire does not have', () => {
    expect(() => scoreSelfCheck(definition, { q1: 3, q2: 3, q9: 1 })).toThrow(ValidationError);
  });

  it('rejects an answer outside the question scale', () => {
    expect(() => scoreSelfCheck(definition, { q1: 9, q2: 3 })).toThrow(ValidationError);
  });
});

describe('createSelfCheckResponse', () => {
  it('records the definition version so old responses stay readable', () => {
    const response = createSelfCheckResponse(
      definition,
      { definitionId: 'strain-check', answers: { q1: 2, q2: 4 }, completedAt: '2026-08-21T12:00:00Z' },
      { id: 'response-1', now: new Date('2026-08-24T09:30:00Z') }
    );

    expect(response.definitionVersion).toBe(1);
    expect(response.day).toBe('2026-08-21');
    expect(response.score).toBe(4);
    expect(response.answers).toEqual({ q1: 2, q2: 4 });
  });
});

describe('assertValidDefinition', () => {
  it('rejects a questionnaire without questions', () => {
    expect(() => assertValidDefinition({ ...definition, questions: [] })).toThrow(ValidationError);
  });

  it('rejects duplicate question ids', () => {
    const broken = { ...definition, questions: [definition.questions[0]!, definition.questions[0]!] };

    expect(() => assertValidDefinition(broken)).toThrow(ValidationError);
  });

  it('rejects an empty answer scale', () => {
    const broken = { ...definition, questions: [{ id: 'q1', text: '?', min: 3, max: 3 }] };

    expect(() => assertValidDefinition(broken)).toThrow(ValidationError);
  });
});
