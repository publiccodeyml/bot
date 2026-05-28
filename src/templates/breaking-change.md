Thanks for your contribution :pray:

{{^release_candidate}}
This is now marked as a [`breaking-change` proposal to the standard](https://github.com/publiccodeyml/publiccode.yml/labels/standard-breaking-change) proposal to the Standard, this means that an old version of `publiccode.yml` won't be compatible with the new version.
{{/release_candidate}}
{{#release_candidate}}
This is now marked as a [`breaking-change` proposal to the standard](https://github.com/publiccodeyml/publiccode.yml/labels/standard-breaking-change) proposal to the Standard. This targets the upcoming **v1.0** on the `1.0-rc` branch.
{{/release_candidate}}

{{^release_candidate}}
Breaking changes can be released with a new major version at most once every two years, provided the current version of the Standard has been deprecating the object of this proposal for at least 6 months.

{{/release_candidate}}
Example of breaking changes are removal of keys or changes to key types.

The next eligible voting round will take place on **{{ next_vote_date }}**

cc @{{{ steering_committee_team }}}
