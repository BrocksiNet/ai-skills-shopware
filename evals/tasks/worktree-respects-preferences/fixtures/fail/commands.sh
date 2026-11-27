# shared default, preferences ignored
git -C /home/dev/code/shopware-private fetch origin
git -C /home/dev/code/shopware-private worktree add -b feat/order-export-custom-fields /home/dev/code/worktrees/shopware-private/issue-4711-order-export-custom-fields origin/trunk
