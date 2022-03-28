# bot

The bot automating the [publiccodeyml organization](https://github.com/publiccodeyml/)
procedures implemented as a GitHub action.

## Commands

The bot is instructed to perform tasks using its tag (fe. @yaml-9000) in issues
and PR comments followed by the command.

* `@yaml-9000 vote-start`: Open the polls for the voting procedure on the current
  proposal

* `@yaml-9000 vote-end`: End the voting procedure, closing the pools and
  announcing the results.

* `@yaml-9000 breaking-change`: Mark the proposal as a [breaking change to the Standard](https://github.com/publiccodeyml/publiccode.yml/blob/main/governance/procedure-proposing-changes-and-voting.md#proposing-changes).

  Aliases: `breaking`, `major`

* `@yaml-9000 minor-change`: Mark the proposal as a [minor change to the Standard](https://github.com/publiccodeyml/publiccode.yml/blob/main/governance/procedure-proposing-changes-and-voting.md#proposing-changes)

  Aliases: `minor`

* `@yaml-9000 bugfix-change`: Mark the proposal as a [bugfix change to the Standard](https://github.com/publiccodeyml/publiccode.yml/blob/main/governance/procedure-proposing-changes-and-voting.md#proposing-changes)

  Aliases: `bugfix`, `patch`

* `@yaml-9000 deprecation-change`: Mark the proposal as a [change deprecating something in the Standard](https://github.com/publiccodeyml/publiccode.yml/blob/main/governance/procedure-proposing-changes-and-voting.md#proposing-changes)

  Aliases: `deprecation`

* `@yaml-9000 national-section USERNAME`: Mark the proposal as a [change in the national section](https://github.com/publiccodeyml/publiccode.yml/blob/main/governance/procedure-proposing-changes-and-voting.md#country-specific-sections) ([doc](https://yml.publiccode.tools/country.html)).

  It needs the `USERNAME` of the Steering Commitee Member Steering representing that Country as an argument (fe. `@yaml-9000 national-section mickey`).

  Aliases: `national`, `country-section`, `country`, `country-specific`

## Inputs to the GitHub Action

Use the following inputs in the GitHub action via `with`:

* `username` [**Optional**] - GitHub repository to fetch (default `bot`)
* `github_token` [**Optional**] - GitHub token to interact with GitHub API (default `${{ github.token }}`).

  If the environment `GITHUB_TOKEN` variable is set, it takes precedence over
  the input.

## Examples

Include this action in your repo by creating
`.github/workflows/publiccodeyml-bot.yml`and edit where needed:

```yml
on:
  issue_comment:
    types: [created]

jobs:
  examplejob:
    runs-on: ubuntu-latest
    steps:
    - uses: publiccodeyml/bot@v1
      with:
        username: yaml-9000
```

## Build the action

Install dependencies

```sh
npm i
```

Build the action

```sh
npm run build
```

## Contributing

Contributing is always appreciated.
Feel free to open issues, fork or submit a Pull Request.
If you want to know more about how to add new fields, check out [CONTRIBUTING.md](CONTRIBUTING.md).

## Maintainers

This software is maintained by the
[Developers Italia](https://developers.italia.it/) team.

## License

© 2021 Dipartimento per la Trasformazione Digitale - Presidenza del Consiglio dei
Ministri

Licensed under the EUPL.
The version control system provides attribution for specific lines of code.

## Remarks

This GitHub Action is published in the Github Marketplace.
As such, you can find the [Terms of Service here](https://docs.github.com/en/free-pro-team@latest/github/site-policy/github-marketplace-terms-of-service).
Also, [here](https://docs.github.com/en/free-pro-team@latest/github/site-policy/github-marketplace-developer-agreement)
you can find the GitHub Marketplace Developer Agreement.
