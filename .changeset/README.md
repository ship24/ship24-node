# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

For any user-facing change, add a changeset and apply it in the same PR:

```bash
pnpm changeset          # pick the bump (major/minor/patch), write a short summary
pnpm changeset version  # bumps package.json, writes CHANGELOG.md, deletes the changeset
pnpm lint:fix           # changeset version reformats package.json
```

Merging to `main` then publishes the new version to npm with provenance. The release
workflow can't open its own version PR because GitHub Actions isn't allowed to create
pull requests in this org.
