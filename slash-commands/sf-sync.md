# /sf:sync - Sync State with Tracker

Synchronize .specflow/ state with external tracker.

## Usage

```
/sf:sync
/sf:sync --tracker github
/sf:sync --dry-run
```

## What This Does

Bidirectional sync between local .specflow/ files and tracker:
1. Reads .specflow/issues/*.json
2. Compares with tracker state (GitHub/Jira/Linear)
3. Updates local files OR pushes to tracker
4. Reports drift

## Sync Direction

- `--pull` - Tracker -> local (default)
- `--push` - Local -> tracker
- `--bidirectional` - Merge both ways

## Options

| Option | Description |
|--------|-------------|
| --tracker | github, jira, linear (default: github) |
| --dry-run | Show changes without applying |
| --pull | Pull from tracker to local |
| --push | Push local to tracker |
| --force | Overwrite conflicts |

## Supported Trackers

| Tracker | Config | Detection |
|---------|--------|-----------|
| GitHub | Automatic (uses gh CLI) | .git/config remote |
| Jira | JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN | .specflow/config.json |
| Linear | LINEAR_API_KEY | .specflow/config.json |
| Local | None (offline mode) | Default fallback |

## Drift Detection

Reports when local and tracker differ:
```
Drift detected:
  Issue #42: local=closed, tracker=open
  Issue #45: missing locally
  Issue #48: missing in tracker
```

## Conflict Resolution

When conflicts exist:
```
Conflict on issue #42:
  Local:  title="Login form", status=closed
  Remote: title="Login page", status=open

Options:
  (l) Keep local
  (r) Keep remote
  (m) Merge (interactive)
```

## State Files

Local state stored in:
```
.specflow/
├── issues/
│   ├── 42.json
│   └── 45.json
├── sync.log
└── tracker.log
```

## Related

- `/sf:issue` - Issue management
- `/sf:scrum` - Full ticket workflow
- `src/trackers/` - Tracker utilities
