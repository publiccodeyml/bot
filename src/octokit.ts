import { getInput } from '@actions/core';
import { getOctokit } from '@actions/github';

const githubToken = process.env.GITHUB_TOKEN || getInput('github_token') || 'token';

export default getOctokit(githubToken);
