# Worktree state

```text
$ git -C /home/dev/code/shopware worktree list
/home/dev/code/shopware                                     4f1c2ab [trunk]
/home/dev/code/worktrees/shopware/pr-13001-cache-tags       9d8e7f6 [fix/cache-tags]
/home/dev/code/worktrees/shopware/feat-flow-retry           0a1b2c3 [feat/flow-retry]

$ git -C /home/dev/code/worktrees/shopware/pr-13001-cache-tags status --porcelain
$ git -C /home/dev/code/worktrees/shopware/pr-13001-cache-tags log --oneline HEAD --not --remotes
$ gh pr view fix/cache-tags --json state,headRefOid
{"headRefOid":"9d8e7f6c1b2a3d4e5f60718293a4b5c6d7e8f901","state":"MERGED"}

$ git -C /home/dev/code/worktrees/shopware/feat-flow-retry status --porcelain
 M src/Core/Content/Flow/Dispatching/FlowExecutor.php
$ git -C /home/dev/code/worktrees/shopware/feat-flow-retry log --oneline HEAD --not --remotes
0a1b2c3 feat(Flow): retry failed flow actions
7e6d5c4 test(Flow): cover the retry limit
$ gh pr view feat/flow-retry --json state,headRefOid
no pull requests found for branch "feat/flow-retry"
```
