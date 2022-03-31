import { readFileSync } from 'fs';
import { Context } from '@actions/github/lib/context';
import { GetResponseDataTypeFromEndpointMethod } from '@octokit/types';
import { BOT_USERNAME, CHAIR_TAG, MAINTAINERS_TEAM } from '../config';
import {
  reactToComment, commentToIssue, addLabels, removeLabel,
} from '../bot';
import { LabelName } from '../labels';
import octokit from '../octokit';

type Comment = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.issues.getComment
>;
type Label = GetResponseDataTypeFromEndpointMethod<
  typeof octokit.labels.get
>;

export enum VoteResult {
  Approved,
  Rejected,
  AdditionalPeriod,
}

function getBotComment(comments: Comment[], marker: string): Comment {
  const botComments = comments
    .reverse()
    .filter(c => c.user?.login === BOT_USERNAME)
    .filter(c => c.body?.startsWith(marker));

  return botComments[0]!;
}

export function processResults(
  votesFor: string[],
  votesAgainst: string[],
  firstRound: boolean,
  approvingMember?: string,
): VoteResult {
  const needsApprovingMember = approvingMember !== undefined;
  const allVotes = votesFor.length + votesAgainst.length;
  if (allVotes === 0) {
    return VoteResult.Rejected;
  }

  const percentage = (votesFor.length * 100) / allVotes;

  if (needsApprovingMember) {
    if (!votesFor.includes(approvingMember)) {
      return VoteResult.Rejected;
    }
    if (percentage >= 50) {
      return VoteResult.Approved;
    }
    return VoteResult.Rejected;
  }

  if (percentage === 100) {
    return VoteResult.Approved;
  }

  if (firstRound) {
    if (percentage >= 50) {
      return VoteResult.AdditionalPeriod;
    }
    return VoteResult.Rejected;
  }

  if (percentage >= 75) {
    return VoteResult.Approved;
  }
  return VoteResult.Rejected;
}

function nationalSectionApprovingMember(
  labels: Label[] | undefined,
  comments: Comment[],
): string | undefined {
  const isNationalSection = labels?.find(l => (l.name as LabelName) === 'standard-national-section');

  if (isNationalSection) {
    const nationalSectionComment = getBotComment(comments, '<!-- ##bot-national-section-marker## ');
    if (!nationalSectionComment) {
      return undefined;
    }

    return nationalSectionComment.body?.match(/<!-- ##bot-national-section-marker## "(.+)" -->/)?.[1];
  }

  return undefined;
}

const formatPercentage = (percentage: number) => (percentage ? `${percentage.toFixed(1)}%` : '-');

export default async function run(context: Context) {
  // We need ncc to detect the concatenation and include the template file
  // in the build
  //
  // eslint-disable-next-line prefer-template,no-path-concat
  const template = readFileSync(__dirname + '/../templates/vote-end.md', 'utf8');

  reactToComment(context);

  const { owner, repo, number } = context.issue;

  const comments = await octokit.paginate(
    'GET /repos/:owner/:repo/issues/:issue_number/comments',
    { owner, repo, issue_number: number },
  ) as Comment[];

  const voteComment = getBotComment(comments, '<!-- ##bot-voting-marker## -->');
  if (!voteComment) {
    console.error('Can\'t find the bot comment where the voting is taking place');
    return;
  }

  const reactions = await octokit.reactions.listForIssueComment({
    owner,
    repo,
    comment_id: voteComment.id,
  });

  const members = (await octokit.teams.listMembersInOrg({ org: 'publiccodeyml', team_slug: 'steering-committee' })).data.map(m => m.login);

  const thumbsUps = reactions.data.filter(r => r.content === '+1' && members.includes(r.user?.login ?? ''));
  const thumbsDowns = reactions.data.filter(r => r.content === '-1' && members.includes(r.user?.login ?? ''));
  const votesCount = thumbsDowns.length + thumbsUps.length;

  const thumbsUpsTags = thumbsUps.map(r => `@${r.user?.login}`);
  const thumbsDownsTags = thumbsDowns.map(r => `@${r.user?.login}`);

  let resultMessage = '';
  const voteDetailsNotes: string [] = [];

  await removeLabel(context, 'vote-start');

  const labels = await octokit.issues.listLabelsOnIssue({ owner, repo, issue_number: number });

  const approvingMember = nationalSectionApprovingMember(labels?.data, comments);

  const isAdditionalPeriod = labels?.data.find(l => (l.name as Label) === 'vote-additional-period');

  if (isAdditionalPeriod) {
    voteDetailsNotes.push('<strong>Second round</strong>: at least <strong>75%</strong> approve votes needed');
  }
  if (approvingMember) {
    voteDetailsNotes.push(
      `<strong>National section vote</strong>: approve vote by ${approvingMember} required and at least <strong>50%</strong> approve votes`,
    );
  } else if (!isAdditionalPeriod) {
    voteDetailsNotes.push('<strong>First round</strong>: unanimity required');
  }

  const voteResults = processResults(
    thumbsUps.map(t => t.user!.login),
    thumbsDowns.map(t => t.user!.login),
    !isAdditionalPeriod,
    approvingMember,
  );

  switch (+voteResults) {
    case VoteResult.Approved:
      resultMessage = `
**Proposal approved** :+1:

This proposal is now ready to be merged and get released with a new version of the standard.
      `;

      await removeLabel(context, 'vote-rejected');
      await addLabels(context, ['vote-approved']);

      break;
    case VoteResult.Rejected:
      resultMessage = '**Proposal rejected** :-1:';

      await removeLabel(context, 'vote-approved');
      await addLabels(context, ['vote-rejected']);

      break;
    case VoteResult.AdditionalPeriod:
      resultMessage = `
**No unanimity**

This proposal can be put to vote again in 90 days (using \`${BOT_USERNAME} vote-start\`)
`;
      await addLabels(context, ['vote-additional-period']);

      break;
    default:
  }

  resultMessage = `
${resultMessage}

cc ${CHAIR_TAG} @${MAINTAINERS_TEAM}
`;

  const vars = {
    vote_thumbs_ups_tags: thumbsUpsTags.join(' '),
    vote_thumbs_ups_count: thumbsUps.length.toString(),
    vote_thumbs_downs_tags: thumbsDownsTags.join(' '),
    vote_thumbs_downs_count: thumbsDowns.length.toString(),
    vote_thumbs_ups_percentage: formatPercentage((100 * thumbsUps.length) / votesCount),
    vote_thumbs_downs_percentage: formatPercentage((100 * thumbsDowns.length) / votesCount),
    vote_comment_link: voteComment.html_url,
    vote_details_users: reactions.data.map(r => `- <strong>${r.user?.login}</strong> voted :${r.content}:`).join('\n\n'),
    vote_details_notes: voteDetailsNotes.join('\n\n'),
    result_message: resultMessage,
  };

  await commentToIssue(context, template, vars);
}
