import { readFileSync } from 'fs';

import { Context } from '@actions/github/lib/context';
import { RequestError } from '@octokit/types';

import Mustache from 'mustache';

import {
  BOT_USERNAME,
  CHAIR_TEAM,
  MAINTAINERS_TEAM,
  STEERING_COMMITTEE_TEAM,
} from './config';
import octokit from './octokit';
import { LabelName } from './labels';

interface TemplateVariables {
  chair_team: string;
  maintainers_team: string;
  steering_committee_team: string;
  bot_username: string;
  comment_author_username: string;
  next_vote_date: string;
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

export async function inTeam(org: string, username: string, team: string) {
  const members = await octokit.teams.listMembersInOrg({ org, team_slug: team });

  return members.data.map(m => m.login).includes(username);
}

export async function isMaintainer(org: string, username: string) {
  return inTeam(org, username, 'maintainers');
}

export async function isChair(org: string, username: string) {
  return inTeam(org, username, 'chair');
}

export async function reactToComment(context: Context) {
  const { owner: org, repo } = context.repo;

  if (!context.payload.comment) {
    return;
  }

  octokit.reactions.createForIssueComment({
    owner: org, repo, comment_id: context.payload.comment?.id, content: 'rocket',
  });
}

function getNextVoteDate() {
  const now = new Date();
  const year = now.getFullYear();

  // Today at 00:00. We compare dates (not times).
  const today = new Date(year, now.getMonth(), now.getDate());

  const schedule = [
    new Date(year, 0 /* Jan */, 30),
    new Date(year, 4 /* May */, 30),
    new Date(year, 8 /* Sep */, 30),
  ];

  const next = schedule.find(d => d > today);
  const nextDate = next ?? new Date(year + 1, schedule[0]!.getMonth(), schedule[0]!.getDate());

  return nextDate.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

function toMustacheView(context: Context): TemplateVariables {
  return {
    bot_username: BOT_USERNAME,
    chair_team: CHAIR_TEAM,
    maintainers_team: MAINTAINERS_TEAM,
    steering_committee_team: STEERING_COMMITTEE_TEAM,
    comment_author_username: context.payload.comment?.user?.login ?? '',
    next_vote_date: getNextVoteDate(),
  };
}

export async function commentToIssue(
  context: Context,
  template: string,
  additionalVariables?: { [key: string]: string },
) {
  const { owner, repo } = context.repo;

  const content = Mustache.render(template, {
    ...toMustacheView(context),
    ...additionalVariables,
  });

  // We need ncc to detect the concatenation and include the template file
  // in the build
  //
  // eslint-disable-next-line prefer-template,no-path-concat
  const footerTpl = readFileSync(__dirname + '/templates/footer.md', 'utf8');
  const footer = Mustache.render(footerTpl, {
    ...toMustacheView(context),
    ...additionalVariables,
  });

  const body = `${content}\n${footer}`;

  octokit.issues.createComment({
    owner, repo, issue_number: context.issue.number, body,
  });
}

export async function setLabels(context: Context, labels: LabelName[]) {
  const { owner, repo } = context.repo;

  octokit.issues.setLabels({
    owner, repo, issue_number: context.issue.number, labels,
  });
}

export async function addLabels(context: Context, labels: LabelName[]) {
  const { owner, repo } = context.repo;

  octokit.issues.addLabels({
    owner, repo, issue_number: context.issue.number, labels,
  });
}

export async function removeLabel(context: Context, name: LabelName) {
  const { owner, repo } = context.repo;

  try {
    return await octokit.issues.removeLabel({
      owner, repo, issue_number: context.issue.number, name,
    });
  } catch (e) {
    // Just log if the label does not exist
    if ((e as RequestError).status === 404) {
      console.warn(`404 while removing '${name}' label`);
      return [];
    }

    throw (e);
  }
}
