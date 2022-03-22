import { Context } from '@actions/github/lib/context';

import breakingChange from './breakingChange';
import minorChange from './minorChange';
import bugfixChange from './bugfixChange';
import deprecationChange from './deprecationChange';

import nationalSection from './nationalSection';

import voteStart from './voteStart';
import voteEnd from './voteEnd';

import { Command } from '../bot';

interface CommandMap {
  name: string;
  fn: (context: Context, args?: string[]) => Promise<void>;
}

export const commandList: CommandMap[] = [
  { name: 'breaking-change', fn: breakingChange },
  { name: 'breaking', fn: breakingChange },
  { name: 'major', fn: breakingChange },

  { name: 'minor-change', fn: minorChange },
  { name: 'minor', fn: minorChange },

  { name: 'bugfix-change', fn: bugfixChange },
  { name: 'bugfix', fn: bugfixChange },
  { name: 'patch', fn: bugfixChange },

  { name: 'deprecation-change', fn: deprecationChange },
  { name: 'deprecation', fn: deprecationChange },

  { name: 'national-section', fn: nationalSection },
  { name: 'country-section', fn: nationalSection },
  { name: 'national', fn: nationalSection },
  { name: 'country', fn: nationalSection },

  { name: 'vote-start', fn: voteStart },
  { name: 'vote-end', fn: voteEnd },
];

export async function runCommand(context: Context, command: Command) {
  console.log(`Running '${command.command}' command for comment ${context.payload.comment?.html_url} ...`);

  const c = commandList.find(c => c.name === command.command);
  if (!c) {
    console.log(`Unknown command '${command.command}'`);
    return;
  }

  await c.fn(context, command.args);
}
