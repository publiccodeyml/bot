import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import { BOT_USERNAME, VOTE_PERIOD_DAYS } from '../config';
import octokit from '../octokit';

type Comment = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.issues.getComment
>;

export type VoteState = Record<string, '+1' | '-1'>;

export interface LiveReaction {
  login: string;
  content: '+1' | '-1';
  created_at: string;
}

const STATE_MARKER_RE = /<!-- ##bot-vote-log-state## ({.*?}) -->/;
const DEADLINE_MARKER_RE = /<!-- ##bot-vote-deadline## (\S+) -->/;

export function resolveDeadline(body: string, commentCreatedAt: string): Date {
  const match = body.match(DEADLINE_MARKER_RE);
  if (match) return new Date(match[1]!);

  const deadline = new Date(commentCreatedAt);
  deadline.setDate(deadline.getDate() + VOTE_PERIOD_DAYS);
  return deadline;
}

export function parseStateMarker(body: string): VoteState {
  const match = body.match(STATE_MARKER_RE);
  if (!match || !match[1]) return {};
  try {
    return JSON.parse(match[1]) as VoteState;
  } catch {
    return {};
  }
}

function afterDeadlineSuffix(ts: Date, deadline: Date | null): string {
  if (!deadline || ts <= deadline) return '';
  return ', after the deadline';
}

export function diffVotes(
  state: VoteState,
  liveReactions: LiveReaction[],
  deadline: Date | null,
  now: Date,
): string[] {
  const liveMap: Record<string, LiveReaction> = Object.fromEntries(
    liveReactions.map(r => [r.login, r]),
  );

  const changedOrNew = liveReactions.flatMap(r => {
    const prev = state[r.login];
    if (prev === r.content) return [];

    const removalLines: string[] = prev !== undefined
      ? [`@${r.login} removed their vote (detected on ${now.toISOString()}${afterDeadlineSuffix(now, deadline)})`]
      : [];

    const emoji = r.content === '+1' ? ':+1:' : ':-1:';
    const voteLine = `@${r.login} voted ${emoji} on ${r.created_at}${afterDeadlineSuffix(new Date(r.created_at), deadline)}`;

    return [...removalLines, voteLine];
  });

  const removed = Object.keys(state)
    .filter(login => !liveMap[login])
    .map(login => `@${login} removed their vote (detected on ${now.toISOString()}${afterDeadlineSuffix(now, deadline)})`);

  return [...changedOrNew, ...removed];
}

const REMOVE_STATE_MARKER_RE = /\n\n<!-- ##bot-vote-log-state## .* -->$/;

export function buildUpdatedComment(
  body: string,
  newLines: string[],
  newState: VoteState,
): string {
  // GitHub rewrites the whole body to CRLF when a human edits the comment in
  // the web UI, which breaks the LF-based marker and section matching below.
  const normalized = body.replace(/\r\n?/g, '\n');
  const withoutMarker = normalized.replace(REMOVE_STATE_MARKER_RE, '');
  const stateMarker = `<!-- ##bot-vote-log-state## ${JSON.stringify(newState)} -->`;

  if (!withoutMarker.includes('\n### Vote log\n')) {
    return `${withoutMarker}\n\n---\n\n### Vote log\n\n${newLines.join('\n')}\n\n${stateMarker}`;
  }
  return `${withoutMarker}\n${newLines.join('\n')}\n\n${stateMarker}`;
}

async function steeringCommitteeMembers(): Promise<string[]> {
  return (await octokit.teams.listMembersInOrg({
    org: 'publiccodeyml',
    team_slug: 'steering-committee',
  })).data.map(m => m.login);
}

export async function syncIssueVoteLog(
  owner: string,
  repo: string,
  issueNumber: number,
  members?: string[],
): Promise<void> {
  const comments = await octokit.paginate(
    'GET /repos/:owner/:repo/issues/:issue_number/comments',
    { owner, repo, issue_number: issueNumber },
  ) as Comment[];

  const voteComment = comments
    .slice()
    .reverse()
    .find(c => c.user?.login === BOT_USERNAME && c.body?.startsWith('<!-- ##bot-voting-marker## -->'));

  if (!voteComment) {
    console.error(`Issue #${issueNumber}: can't find voting comment, skipping sync`);
    return;
  }

  const reactions = await octokit.reactions.listForIssueComment({
    owner,
    repo,
    comment_id: voteComment.id,
  });

  const committee = members ?? await steeringCommitteeMembers();

  const liveReactions: LiveReaction[] = reactions.data
    .filter(r => (r.content === '+1' || r.content === '-1') && committee.includes(r.user?.login ?? ''))
    .map(r => ({
      login: r.user!.login,
      content: r.content as '+1' | '-1',
      created_at: r.created_at,
    }));

  const body = voteComment.body ?? '';
  const state = parseStateMarker(body);

  const deadline = resolveDeadline(body, voteComment.created_at);

  const now = new Date();
  const newLines = diffVotes(state, liveReactions, deadline, now);

  if (newLines.length === 0) return;

  const newState: VoteState = Object.fromEntries(liveReactions.map(r => [r.login, r.content]));

  await octokit.issues.updateComment({
    owner,
    repo,
    comment_id: voteComment.id,
    body: buildUpdatedComment(body, newLines, newState),
  });
}

export default async function run(owner: string, repo: string): Promise<void> {
  const issues = await octokit.paginate(
    'GET /repos/:owner/:repo/issues',
    {
      owner, repo, state: 'open', labels: 'vote-start',
    },
  ) as Array<{ number: number }>;

  const members = await steeringCommitteeMembers();

  await Promise.all(issues.map(issue => syncIssueVoteLog(owner, repo, issue.number, members)));
}
