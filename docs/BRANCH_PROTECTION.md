# Branch Protection Rules

This guide explains how to configure branch protection rules for the main branch to ensure code quality and stability.

## ⚠️ Important Note

**This configuration must be applied manually by a repository administrator.** Ralph (the autonomous agent) cannot configure branch protection rules as it requires GitHub repository admin permissions.

## Required Status Checks

The following GitHub Actions workflows must pass before merging to main:

1. **Test workflow** (`.github/workflows/test.yml`)
   - Type check (`pnpm nuxt typecheck`)
   - Unit tests (`pnpm test:run`)
   - E2E tests (`pnpm test:e2e`)

2. **Coverage** (informational, generated as part of Test workflow)

3. **Lighthouse CI** (`.github/workflows/lighthouse.yml`, PRs only)
   - Performance metrics
   - Accessibility, Best Practices, SEO scores

## Setup via GitHub UI

### Step 1: Navigate to Branch Protection Settings

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Click **Branches** in the left sidebar
4. Click **Add branch protection rule** button

### Step 2: Configure Branch Protection

#### Branch Name Pattern
- Enter: `main`
- Click **Configure**

#### Protection Settings

**Require status checks before merging**
- ☑️ Require status checks to pass before merging
- ☑️ Require branches to be up to date before merging

**Required Status Checks**
Check the following workflows:
- `Test / Run tests`
- `Lighthouse CI / Run Lighthouse` (optional for PRs)

**Additional Options**
- ☑️ Require pull request reviews before merging
  - Number of required approving reviews: `1`
- ☑️ Dismiss stale PR approvals when new commits are pushed
- ☑️ Require conversation resolution before merging
- ☑️ Require branches to be up to date before merging
- ☑️ Do not allow bypassing the above settings

**Restrict who can push**
- ☑️ Limit who can push to this branch
- Select: Only administrators

**Restrict who can force push**
- ☑️ Do not allow force pushing to this branch

**Restrict who can delete**
- ☑️ Do not allow deletion of this branch

### Step 3: Save Changes

Click **Create** or **Save changes** to apply the branch protection rule.

## Setup via GitHub CLI (Alternative)

If you prefer using the GitHub CLI (`gh`), here's the command to configure branch protection:

```bash
# First, authenticate with GitHub
gh auth login

# Create branch protection rule
gh api \
  --method PUT \
  -H "Accept: application/vnd.github+json" \
  repos/{owner}/{repo}/protection/branches/main \
  -f required_status_checks='{"strict":true,"contexts":["Test","Lighthouse CI"]}' \
  -f enforce_admins='false' \
  -f required_pull_request_reviews='{"required_approving_review_count":1,"dismiss_stale_reviews":true,"require_code_owner_reviews":false}' \
  -f restrictions='{"users":[],"teams":[]}' \
  -f allow_deletions='false' \
  -f allow_force_pushes='false'
```

Replace `{owner}` and `{repo}` with your repository details.

## Verification

After configuring branch protection:

1. **Create a test branch**: `git checkout -b test-branch-protection`
2. **Make a small change**: e.g., update a comment
3. **Create a PR**: Push and create a pull request to main
4. **Verify protection**:
   - PR should show required status checks
   - Merge button should be disabled until all checks pass
   - Force push to main should be blocked

## Troubleshooting

### "Required status check not found" error
- Ensure workflows have run at least once on the main branch
- Check that status check names exactly match the workflow job names

### PR can still be merged despite failed checks
- Verify "Require branches to be up to date before merging" is enabled
- Check that "Require status checks to pass before merging" is enabled

### Want to bypass protection temporarily
Only repository administrators can bypass protection by:
1. Pushing directly to main (if admin bypass is enabled)
2. Temporarily disabling the protection rule

## Best Practices

1. **Keep protection rules minimal but effective**: Don't add unnecessary friction
2. **Review required status checks regularly**: Remove obsolete workflows
3. **Test rules on a non-main branch first**: Verify configuration before applying to main
4. **Document exceptions**: If you need to bypass rules, create a clear approval process

## References

- [GitHub Branch Protection Documentation](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [GitHub Actions Status Checks](https://docs.github.com/en/actions/using-workflows/about-workflows#workflow-status-checks)
