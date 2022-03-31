import { readFileSync } from 'fs';
import { Context } from '@actions/github/lib/context';

import { reactToComment, commentToIssue, addLabels } from '../bot';

export default async function run(context: Context) {
  // We need ncc to detect the concatenation and include the template file
  // in the build
  //
  // eslint-disable-next-line prefer-template,no-path-concat
  const template = readFileSync(__dirname + '/../templates/deprecation-change.md', 'utf8');

  reactToComment(context);
  addLabels(context, ['standard-deprecation', 'vote-draft']);

  await commentToIssue(context, template);
}
