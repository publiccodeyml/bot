import { readFileSync } from 'fs';
import { Context } from '@actions/github/lib/context';

import { reactToComment, commentToIssue, addLabels } from '../bot';

export default async function run(context: Context) {
  const template = readFileSync(__dirname + '/../templates/minor-change.md', 'utf8');

  reactToComment(context);
  addLabels(context, ['standard-minor-change', 'vote-draft']);

  await commentToIssue(context, template);
}
