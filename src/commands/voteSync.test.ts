import {
  parseStateMarker, diffVotes, buildUpdatedComment, resolveDeadline,
} from './voteSync';

test('resolveDeadline reads the marker when present', () => {
  const body = 'body\n\n<!-- ##bot-vote-deadline## 2026-06-25T07:00:00.000Z -->';
  expect(resolveDeadline(body)).toEqual(new Date('2026-06-25T07:00:00.000Z'));
});

test('resolveDeadline returns null when the marker is absent', () => {
  expect(resolveDeadline('no marker here')).toBeNull();
});

test('parseStateMarker returns empty object when marker is absent', () => {
  expect(parseStateMarker('<!-- ##bot-voting-marker## -->\nsome body')).toEqual({});
});

test('parseStateMarker returns empty object on malformed JSON', () => {
  expect(parseStateMarker('<!-- ##bot-vote-log-state## not-json -->')).toEqual({});
});

test('parseStateMarker parses a valid state', () => {
  const body = 'body\n\n<!-- ##bot-vote-log-state## {"alice":"+1","bob":"-1"} -->';
  expect(parseStateMarker(body)).toEqual({ alice: '+1', bob: '-1' });
});

const DEADLINE = new Date('2026-06-25T07:00:00Z');
const BEFORE_DEADLINE = new Date('2026-06-20T10:00:00Z');
const AFTER_DEADLINE = new Date('2026-06-26T08:00:00Z');

test('diffVotes: no change returns empty array', () => {
  expect(
    diffVotes(
      { alice: '+1' },
      [{ login: 'alice', content: '+1', created_at: '2026-06-12T10:00:00Z' }],
      DEADLINE,
      BEFORE_DEADLINE,
    ),
  ).toEqual([]);
});

test('diffVotes: new vote appended', () => {
  expect(
    diffVotes(
      {},
      [{ login: 'alice', content: '+1', created_at: '2026-06-12T10:00:00Z' }],
      DEADLINE,
      BEFORE_DEADLINE,
    ),
  ).toEqual(['@alice voted :+1: on 2026-06-12T10:00:00Z']);
});

test('diffVotes: new vote after deadline gets suffix', () => {
  expect(
    diffVotes(
      {},
      [{ login: 'alice', content: '+1', created_at: '2026-06-26T10:00:00Z' }],
      DEADLINE,
      AFTER_DEADLINE,
    ),
  ).toEqual(['@alice voted :+1: on 2026-06-26T10:00:00Z, after the deadline']);
});

test('diffVotes: removed vote appended', () => {
  const result = diffVotes(
    { alice: '+1' },
    [],
    DEADLINE,
    BEFORE_DEADLINE,
  );
  expect(result).toEqual([
    `@alice removed their vote (detected on ${BEFORE_DEADLINE.toISOString()})`,
  ]);
});

test('diffVotes: removal after deadline gets suffix inside parens', () => {
  const result = diffVotes(
    { alice: '+1' },
    [],
    DEADLINE,
    AFTER_DEADLINE,
  );
  expect(result).toEqual([
    `@alice removed their vote (detected on ${AFTER_DEADLINE.toISOString()}, after the deadline)`,
  ]);
});

test('diffVotes: changed vote emits removal then new vote', () => {
  const result = diffVotes(
    { alice: '+1' },
    [{ login: 'alice', content: '-1', created_at: '2026-06-15T09:00:00Z' }],
    DEADLINE,
    BEFORE_DEADLINE,
  );
  expect(result).toEqual([
    `@alice removed their vote (detected on ${BEFORE_DEADLINE.toISOString()})`,
    '@alice voted :-1: on 2026-06-15T09:00:00Z',
  ]);
});

test('diffVotes: no deadline — no suffix even when sync is late', () => {
  expect(
    diffVotes(
      {},
      [{ login: 'alice', content: '+1', created_at: '2026-07-01T10:00:00Z' }],
      null,
      new Date('2026-07-05T00:00:00Z'),
    ),
  ).toEqual(['@alice voted :+1: on 2026-07-01T10:00:00Z']);
});

const ORIGINAL_BODY = '<!-- ##bot-voting-marker## -->\noriginal body';

test('buildUpdatedComment: creates vote log section on first sync', () => {
  const result = buildUpdatedComment(
    ORIGINAL_BODY,
    ['@alice voted :+1: on 2026-06-12T10:00:00Z'],
    { alice: '+1' },
  );
  expect(result).toBe(
    '<!-- ##bot-voting-marker## -->\noriginal body\n\n---\n\n### Vote log\n\n@alice voted :+1: on 2026-06-12T10:00:00Z\n\n<!-- ##bot-vote-log-state## {"alice":"+1"} -->',
  );
});

test('buildUpdatedComment: appends to existing vote log section', () => {
  const body = '<!-- ##bot-voting-marker## -->\noriginal body\n\n---\n\n### Vote log\n\n@alice voted :+1: on 2026-06-12T10:00:00Z\n\n<!-- ##bot-vote-log-state## {"alice":"+1"} -->';
  const result = buildUpdatedComment(
    body,
    ['@bob voted :-1: on 2026-06-13T10:00:00Z'],
    { alice: '+1', bob: '-1' },
  );
  expect(result).toBe(
    '<!-- ##bot-voting-marker## -->\noriginal body\n\n---\n\n### Vote log\n\n@alice voted :+1: on 2026-06-12T10:00:00Z\n@bob voted :-1: on 2026-06-13T10:00:00Z\n\n<!-- ##bot-vote-log-state## {"alice":"+1","bob":"-1"} -->',
  );
});

test('buildUpdatedComment: appends to a CRLF body without duplicating section or marker', () => {
  const body = '<!-- ##bot-voting-marker## -->\r\noriginal body\r\n\r\n---\r\n\r\n### Vote log\r\n\r\n@alice voted :+1: on 2026-06-12T10:00:00Z\r\n\r\n<!-- ##bot-vote-log-state## {"alice":"+1"} -->';
  const result = buildUpdatedComment(
    body,
    ['@bob voted :-1: on 2026-06-13T10:00:00Z'],
    { alice: '+1', bob: '-1' },
  );
  expect(result).toBe(
    '<!-- ##bot-voting-marker## -->\noriginal body\n\n---\n\n### Vote log\n\n@alice voted :+1: on 2026-06-12T10:00:00Z\n@bob voted :-1: on 2026-06-13T10:00:00Z\n\n<!-- ##bot-vote-log-state## {"alice":"+1","bob":"-1"} -->',
  );
});
