# ARAL Control Center — Website-only MVP

A consent-based browser session dashboard. It does **not** bypass permissions, collect camera/microphone media, access files/messages/location, or inspect system-wide mobile traffic.

## Requirements
- Node.js 18+
- npm

## Run locally
```bash
npm install
npm start
```
Open http://localhost:3000

## Pair a test browser
1. On the dashboard, click **Generate pairing link**.
2. Open the link in a second browser/device.
3. Review the information disclosure and tick the consent checkbox.
4. Click **Accept and connect**.
5. The dashboard will show the connected browser session. Revoke it from the table.

For a phone on the same Wi-Fi, use your computer's LAN IP instead of `localhost`, e.g. `http://192.168.1.10:3000`. The browser may require HTTPS for camera/microphone tests; those tests run locally in the dashboard browser and never transmit media.

## Deployment / security
- Use HTTPS/WSS in production.
- Put the service behind authentication before exposing it to the internet.
- This MVP uses in-memory session storage; restarting the server clears sessions.
- Pairing tokens expire after 30 minutes.
- Add rate limiting, CSRF protections, persistent storage, audit logging, and authenticated admin accounts before production use.
- Network details are limited to browser-exposed connection hints, not packet capture or all mobile traffic.
