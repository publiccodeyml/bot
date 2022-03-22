import { getInput } from '@actions/core';

export const VOTE_PERIOD_DAYS = 14;
export const BOT_USERNAME = process.env.BOT_USERNAME || getInput('username');
export const CHAIR_TAG = '@bfabio';
export const MAINTAINERS_TEAM = 'publiccodeyml/maintainers';
export const STEERING_COMMITTEE_TEAM = 'publiccodeyml/steering-committee';
