import { readFileSync } from 'fs';
import { Context } from '@actions/github/lib/context';

import { reactToComment, commentToIssue, addLabels } from '../bot';

export default async function run(context: Context, args?: string[]) {
  // We need ncc to detect the concatenation and include the template file
  // in the build
  //
  // eslint-disable-next-line prefer-template,no-path-concat
  const template = readFileSync(__dirname + '/../templates/national-section.md', 'utf8');

  if (args?.length !== 1) {
    console.log('"national-section" command must have one argument');
    console.log('(the username of the committee member for that nation)');

    return;
  }

  const nationMember = args[0]!;

  reactToComment(context);
  addLabels(context, ['standard-national-section', 'vote-draft']);

  const vars = {
    nation_member: nationMember,
  };

  await commentToIssue(context, template, vars);
}
