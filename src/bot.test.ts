import { Context } from '@actions/github/lib/context';

import { hasLabel } from './bot';

function contextWithLabels(labels: unknown): Context {
  return { payload: { issue: { labels } } } as unknown as Context;
}

test('hasLabel returns true when the label is present', () => {
  const context = contextWithLabels([{ name: 'v1' }, { name: 'vote-start' }]);

  expect(hasLabel(context, 'v1')).toBe(true);
});

test('hasLabel returns false when the label is absent', () => {
  const context = contextWithLabels([{ name: 'vote-start' }]);

  expect(hasLabel(context, 'v1')).toBe(false);
});

test('hasLabel returns false when there are no labels', () => {
  expect(hasLabel(contextWithLabels([]), 'v1')).toBe(false);
  expect(hasLabel({ payload: {} } as unknown as Context, 'v1')).toBe(false);
});
