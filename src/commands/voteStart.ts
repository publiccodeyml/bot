import { readFileSync } from 'fs';
import { Context } from '@actions/github/lib/context';

import { VOTE_PERIOD_DAYS } from '../config';
import { reactToComment, commentToIssue, addLabels } from '../bot';

export default async function run(context: Context) {
  // We need ncc to detect the concatenation and include the template file
  // in the build
  //
  // eslint-disable-next-line prefer-template,no-path-concat
  const template = readFileSync(__dirname + '/../templates/vote-start.md', 'utf8');

  reactToComment(context);
  addLabels(context, ['vote-start']);

  const date = new Date();
  date.setDate(date.getDate() + VOTE_PERIOD_DAYS);

  const vars = {
    vote_period_days: VOTE_PERIOD_DAYS.toString(),
    vote_end_date: date.toUTCString(),
  };

  await commentToIssue(context, template, vars);
}
