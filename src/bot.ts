import { readFileSync } from 'fs';

import { Context } from '@actions/github/lib/context';
import { RequestError} from '@octokit/types';

import Mustache from 'mustache';

import {
  BOT_USERNAME,
  CHAIR_TAG,
  MAINTAINERS_TEAM,
  STEERING_COMMITTEE_TEAM
} from './config';
import octokit from './octokit';
import { LabelName } from './labels';

interface TemplateVariables {
  chair_tag: string;
  maintainers_team: string;
  steering_committee_team: string;
  bot_username: string;
  comment_author_username: string;
}

export interface Command {
  command: string;
  args: string[];
}

export function getCommandsFromComment(body: string): Command[] {
  return body
    .split('\n')
    .map(e => e.trim())
    .filter(e => e.startsWith(`@${BOT_USERNAME} `))
    .map(e => e.replace(new RegExp(`^@${BOT_USERNAME} `), ''))
    .map(e => ({ command: e.split(/\s+/).slice(0, 1)[0]!, args: e.split(/\s+/).slice(1) }));
}

export async function isMaintainer(org: string, username: string) {
  const members = await octokit.teams.listMembersInOrg({ org, team_slug: 'maintainers' });

  return members.data.map((m) => m.login).includes(username);
}

export async function reactToComment(context: Context) {
  const { owner: org, repo } = context.repo;

  if (!context.payload.comment) {
    return
  }
  const comment_id = context.payload.comment?.id;

  octokit.reactions.createForIssueComment({
    owner: org, repo, comment_id, content: 'rocket',
  });
}

export async function commentToIssue(
    context: Context,
    template: string,
    additionalVariables?: {[key: string]: string},
) {
  const { owner, repo } = context.repo;
  const issue_number = context.issue.number;

  const content = Mustache.render(template, {
    ...toMustacheView(context),
    ...additionalVariables,
  });

  const footerTpl = readFileSync(__dirname + '/templates/footer.md', 'utf8')
  const footer = Mustache.render(footerTpl, {
    ...toMustacheView(context),
    ...additionalVariables,
  });

  const body = `${content}\n${footer}`;

  octokit.issues.createComment({owner, repo, issue_number, body});
}

export async function setLabels(context: Context, labels: LabelName[]) {
  const { owner, repo } = context.repo;
  const issue_number = context.issue.number;

  octokit.issues.setLabels({owner, repo, issue_number, labels});
}

export async function addLabels(context: Context, labels: LabelName[]) {
  const { owner, repo } = context.repo;
  const issue_number = context.issue.number;

  octokit.issues.addLabels({owner, repo, issue_number, labels});
}

export async function removeLabel(context: Context, name: LabelName) {
  const { owner, repo } = context.repo;
  const issue_number = context.issue.number;

  try {
    return await octokit.issues.removeLabel({owner, repo, issue_number, name});
  } catch (e) {
    // Just log if the label does not exist
    if ((e as RequestError).status === 404) {
      console.warn(`404 while removing '${name}' label`);
      return;
    }

    throw(e);
  }
}

function toMustacheView(context: Context): TemplateVariables {
  return {
    bot_username: BOT_USERNAME,
    chair_tag: CHAIR_TAG,
    maintainers_team: MAINTAINERS_TEAM,
    steering_committee_team: STEERING_COMMITTEE_TEAM,
    comment_author_username: context.payload.comment?.user?.login ?? '',
  }
}
