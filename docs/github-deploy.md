# GitHub Publish

The project is already committed locally on branch `main`.

If GitHub CLI is available:

```bash
gh repo create dzikrirazzan/pocketflow --public --source=. --remote=origin --push
```

If you create the repository manually on GitHub:

```bash
git remote add origin https://github.com/dzikrirazzan/pocketflow.git
git push -u origin main
```

After the push, Vercel can be connected to the GitHub repository for automatic deploys on every commit. The included `vercel.json` builds the Next.js web frontend and API backend together from the repository root.
