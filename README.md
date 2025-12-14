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

Notes
- The bot uses Baileys; keep your Node.js up to date (Node 16+ recommended).
- This is a scaffold intended to be extended: group management and advanced features need additional permission checks and error handling.
