# WhatsApp — Cloud API Webhook

A WhatsApp bot on top of Meta's WhatsApp Cloud API. It runs on the shared MMPS Express server and needs no database.

- `GET /whatsapp-webhook` handles Meta's verification handshake.
- `POST /whatsapp-webhook` receives incoming messages and replies to text messages.

Code lives in `src/features/whatsapp/` (routes, payload parsing, signature check) and `src/services/whatsapp/` (the Graph API client).

## How it works

### Verification (`GET /whatsapp-webhook`)

When you subscribe the webhook in the Meta dashboard, Meta calls:

```
GET /whatsapp-webhook?hub.mode=subscribe&hub.verify_token=<VERIFY_TOKEN>&hub.challenge=<random>
```

If `hub.mode` is `subscribe` and `hub.verify_token` matches `VERIFY_TOKEN`, the server returns `200` with `hub.challenge` as the plain-text body. Anything else gets `403 Forbidden`.

### Incoming messages (`POST /whatsapp-webhook`)

1. If `WHATSAPP_APP_SECRET` is set, the `X-Hub-Signature-256` header is checked against an HMAC-SHA256 of the raw request body. A missing or invalid signature returns `401`.
2. The server answers `200 OK` right away, so Meta doesn't retry.
3. It reads `entry[0].changes[0].value.messages[0]`. Anything that isn't a `text` message is ignored (this includes status updates such as delivered or read receipts).
4. It logs the sender (`from`) and the text (`text.body`), then replies through `sendWhatsAppMessage(to, text)`.

The default reply echoes the message (`You said: …`). To change it, edit `buildReply` in `src/features/whatsapp/whatsapp.utils.ts`.

### Sending (`sendWhatsAppMessage`)

```
POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_TOKEN}
Content-Type: application/json

{ "messaging_product": "whatsapp", "recipient_type": "individual", "to": "<number>", "type": "text", "text": { "body": "<reply>" } }
```

When a send fails, the Graph API error body (`error.response?.data`) is logged and the error is swallowed, so a failed reply never crashes the webhook.

## Environment variables

| Variable              | Required | Description |
|-----------------------|----------|-------------|
| `PORT`                | no       | Express port (default `3000`) |
| `WHATSAPP_TOKEN`      | yes      | Meta Graph API access token (temporary or System User token) |
| `PHONE_NUMBER_ID`     | yes      | WhatsApp Business phone number id (not the phone number itself) |
| `VERIFY_TOKEN`        | yes      | Any string you choose. It must match the "Verify token" field in the Meta dashboard |
| `WHATSAPP_APP_SECRET` | no       | Meta app secret (App settings → Basic). Turns on signature validation |

Copy `.env.example` to `.env` and fill these in. If any of them are missing, a warning is logged at boot.

## Meta setup

1. Create an app at [developers.facebook.com](https://developers.facebook.com/apps) of type **Business** and add the **WhatsApp** product.
2. Under **WhatsApp → API Setup**, copy the temporary access token (`WHATSAPP_TOKEN`) and the **Phone number ID** (`PHONE_NUMBER_ID`). Add your own number as a test recipient.
3. Under **WhatsApp → Configuration → Webhook**, set the callback URL to `https://<your-host>/whatsapp-webhook` and the verify token to your `VERIFY_TOKEN`. Then click **Verify and save**.
4. Subscribe to the **messages** webhook field.
5. For production, create a permanent System User token in Business Settings. The temporary token expires after 24 hours.

## Running locally (ngrok)

```bash
npm install
cp .env.example .env    # fill in the WhatsApp variables
npm run dev             # starts Express on PORT (default 3000)
ngrok http 3000         # use the https URL + /whatsapp-webhook as the Meta callback URL
```

The webhook runs no matter what `LOCAL_ACTIVE_BOT_ID` is set to.

Test it with curl:

```bash
# Verification: prints "12345"
curl "http://localhost:3000/whatsapp-webhook?hub.mode=subscribe&hub.verify_token=$VERIFY_TOKEN&hub.challenge=12345"

# Incoming text message (without WHATSAPP_APP_SECRET set)
curl -X POST http://localhost:3000/whatsapp-webhook \
  -H 'Content-Type: application/json' \
  -d '{"object":"whatsapp_business_account","entry":[{"changes":[{"value":{"messages":[{"from":"15551234567","id":"wamid.1","type":"text","text":{"body":"hello"}}]}}]}]}'

# With WHATSAPP_APP_SECRET set, sign the exact body
BODY='{"entry":[]}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WHATSAPP_APP_SECRET" | sed 's/^.* //')
curl -X POST http://localhost:3000/whatsapp-webhook -H 'Content-Type: application/json' -H "X-Hub-Signature-256: sha256=$SIG" -d "$BODY"
```

## Deploying

### Heroku

The repo already ships a `Procfile` (`web: npm start`). Heroku sets `PORT` for you.

```bash
heroku create
heroku config:set WHATSAPP_TOKEN=... PHONE_NUMBER_ID=... VERIFY_TOKEN=... WHATSAPP_APP_SECRET=...
git push heroku main
```

Then set the Meta callback URL to `https://<app>.herokuapp.com/whatsapp-webhook`.

### Other hosts

Any Node.js host that runs `npm run build && npm start` and exposes HTTPS works: Render, Fly.io, a VM, or a VM behind a Cloudflare Tunnel (`cloudflared tunnel --url http://localhost:3000`). Meta requires a public HTTPS callback URL with a valid certificate.

## Tests

```bash
npx vitest run src/features/whatsapp
```

The tests cover payload extraction, signature validation, the verification handshake, the immediate ack, the reply call and signature rejection.
