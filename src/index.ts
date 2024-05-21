import { context } from '@actions/github';

import { getCommandsFromComment, isChair, isMaintainer } from './bot';
import { runCommand } from './commands';
import { BOT_USERNAME } from './config';

async function run() {
  // TODO: Check for github.context.eventName == 'issue_comment'

  const { comment } = context.payload;
  if (!comment) {
    console.error('No comment object found');
    return;
  }
  const commenter = comment.user?.login;
  if (!commenter) {
    console.error(`Can't get commenter username in message ${comment.html_url}`);
    return;
  }

  if (commenter === BOT_USERNAME) {
    console.error(`Skipping bot comment in message ${comment.html_url}`);
    return;
  }

  if (
    !await isMaintainer(context.repo.owner, commenter)
    && !await isChair(context.repo.owner, commenter)
  ) {
    console.log(`User '${commenter}' can't run commands in message ${comment.html_url}, exiting`);
    return;
  }

  const commands = getCommandsFromComment(comment.body);
  if (commands.length === 0) {
    console.log(`No commands in message ${comment.html_url}`);
    return;
  }

  await Promise.all(commands.map(async cmd => runCommand(context, cmd)));
}

run();
