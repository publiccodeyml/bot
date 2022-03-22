import { readFileSync } from 'fs';
import { Context } from '@actions/github/lib/context';

import { reactToComment, commentToIssue, addLabels } from '../bot';

export default async function run(context: Context) {
  const template = readFileSync(__dirname + '/../templates/breaking-change.md', 'utf8');

  reactToComment(context);
  addLabels(context, ['standard-breaking-change', 'vote-draft']);

  await commentToIssue(context, template);
}
