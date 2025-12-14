# WhatsApp Bot (Node.js + Baileys)

This project provides a simple WhatsApp bot scaffold using the Baileys library. It includes feature toggles and a simple menu interface.

Features
- autoread: automatically mark incoming messages as read
- autoreact: automatically react to incoming messages with an emoji
- autoviewstatus: attempt to subscribe/presence for status viewing
- group menu notes: placeholder command to request group additions

Quick start
1. Install dependencies: `npm install`
2. Start the bot: `npm start` (scan the QR printed in your terminal)
3. Generate a deployment ZIP: `npm run package` -> creates `project.zip`

Configuration
- See `bot-config.json` for default feature toggles. You can toggle at runtime using `!toggle <feature> on|off`.

Commands
- `!menu` or `/menu` — show menu and features
- `!toggle <feature> on|off` — toggle a boolean feature (autoread, autoreact, autoviewstatus)
- `!group add <phone>` — placeholder to request adding a participant (see notes)

Deploying & GitHub
- Create a new GitHub repository and push this folder. Update the link in `index.html` to your repository URL.
- Optionally enable GitHub Actions to build releases that include the ZIP.

Contact / Quick Link
- Click to chat with the author: https://wa.me/254725391914

Automatic deployer link
- After deployment you can update `bot-config.json` with your phone and author details. The project homepage includes a quick `wa.me` link to the configured author so visitors can contact you.

Bug reporting (in-chat)
- `!bug report <text>` — create a new bug report (notifies owner)
- `!bug list` — shows open and closed reports
- `!bug close <id>` — close a bug (owner only)

GitHub push (local)
1. Create a repository on GitHub (via website) and copy its HTTPS URL.
2. Run these commands in this folder to push:

```bash
git remote add origin <YOUR_REPO_URL>
git branch -M main
git push -u origin main
```

If you have GitHub CLI and are logged in you can instead run:

```bash
gh repo create <repo-name> --public --source=. --push

Deployment notes

Heroku
- Create an app on Heroku (dashboard) and add this repo as the app source.
- Add a config var named `AUTH_STATE` and paste the Base64 string of your `v1_auth.json` (see below).
- Scale the worker dyno: `heroku ps:scale worker=1`.
- To obtain `AUTH_STATE`: run locally, scan the QR to login, then run `npm run export-auth` to print the base64 string; paste that into Heroku config.

Render
- Create a new service on Render using this repository. Use `node v1/index.js` as the start command.
- Add an Environment Variable `AUTH_STATE` (empty initially). After pairing locally, set `AUTH_STATE` to the base64 output from `npm run export-auth` and redeploy.

GitHub / v1
- The `v1` folder contains a deployment-friendly entrypoint `v1/index.js` that accepts `AUTH_STATE` (base64) and prints an updated `AUTH_STATE` after credentials change. Use this file for hosted deploys.

```

Notes
- The bot uses Baileys; keep your Node.js up to date (Node 16+ recommended).
- This is a scaffold intended to be extended: group management and advanced features need additional permission checks and error handling.
