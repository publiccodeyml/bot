import { processResults, VoteResult } from './voteEnd';

test('first round', () => {
  expect(
    processResults(['user1', 'user2', 'user3'], [], true),
  ).toBe(VoteResult.Approved);

  expect(
    processResults(['user1', 'user2'], ['user3'], true),
  ).toBe(VoteResult.AdditionalPeriod);

  expect(
    processResults(['user1', 'user2'], ['user3', 'user4'], true),
  ).toBe(VoteResult.AdditionalPeriod);

  expect(
    processResults(['user1'], ['user2', 'user3', 'user4'], true),
  ).toBe(VoteResult.Rejected);

  expect(processResults([], ['user4'], true)).toBe(VoteResult.Rejected);
  expect(processResults([], [], true)).toBe(VoteResult.Rejected);
});

test('second round, at least 75% votes', () => {
  expect(
    processResults(['user1', 'user2', 'user3', 'user4'], [], false),
  ).toBe(VoteResult.Approved);

  expect(
    processResults(['user1', 'user2', 'user3'], ['user4'], false),
  ).toBe(VoteResult.Approved);

  expect(
    processResults(['user1', 'user2'], ['user3', 'user4'], false),
  ).toBe(VoteResult.Rejected);

  expect(processResults([], ['user3'], false)).toBe(VoteResult.Rejected);
  expect(processResults([], [], false)).toBe(VoteResult.Rejected);
});

test('national section (with member representing the country and at least 50% votes)', () => {
  expect(
    processResults(['approving_member', 'user1'], [], true, 'approving_member'),
  ).toBe(VoteResult.Approved);

  expect(
    processResults(['approving_member'], [], true, 'approving_member'),
  ).toBe(VoteResult.Approved);

  expect(
    processResults(['user1'], ['user2'], false, 'approving_member'),
  ).toBe(VoteResult.Rejected);

  expect(
    processResults(['user1'], ['approving_member'], true, 'approving_member'),
  ).toBe(VoteResult.Rejected);

  expect(
    processResults([], [], false, 'approving_member'),
  ).toBe(VoteResult.Rejected);
});
