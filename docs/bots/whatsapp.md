# WhatsApp — Cloud API Webhook

A WhatsApp sticker vault on top of Meta's WhatsApp Cloud API. The vault is shared: every sticker anyone saves can be found by everyone. Send it stickers and it saves them, tag them with words, then send a word to get matching stickers back as real WhatsApp stickers. It runs on the shared MMPS Express server.

- `GET /whatsapp-webhook` handles Meta's verification handshake.
- `POST /whatsapp-webhook` receives incoming messages (stickers and text).

Code lives in `src/features/whatsapp/` (routes, payload parsing, signature check, vault logic, Mongo repository) and `src/services/whatsapp/` (the Graph API client: text, sticker send, media download and upload).

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
3. It reads `entry[0].changes[0].value.messages[0]`. Only `sticker` and `text` messages are handled; everything else is ignored. Status updates with `status: "failed"` are logged with Meta's error code and details (an accepted send can still fail delivery later).
4. It logs the message and hands it to `handleIncomingMessage` in `sticker-vault.service.ts`.

## Sticker vault

### Saving

When a sticker arrives, the bot downloads it from the Graph API and hashes the bytes (sha256). If anyone already saved that sticker, it says so instead of storing a copy. Otherwise it stores the bytes and replies asking for tags.

WhatsApp only delivers stickers up to 512×512 and 100 KB (static) or 500 KB (animated). Larger ones are re-encoded with sharp (resized to 512×512, lower WebP quality) before saving. If it still doesn't fit, the bot refuses it. Stickers saved before this check are shrunk the first time they're sent.

### Commands (text messages)

| You send | What happens |
|----------|--------------|
| Words, within 5 minutes of sending an untagged sticker (tracked per sender) | Those words become the sticker's tags |
| A quote-reply to a sticker with words | Adds those words as tags to that sticker (works on stickers you sent and stickers the bot sent) |
| A quote-reply to a sticker with `delete` | Removes the sticker, only if you are the one who saved it |
| `random` | Sends a random saved sticker |
| `help` | Shows usage and how many stickers you have |
| Anything else | Searches tags and sends up to 3 matching stickers, or replies "No stickers match" |

Text is lowercased and split into words; tags are matched on whole words.

### Sending stickers back

Stickers go out as `type: "sticker"` messages, so they show up as stickers, not images. WhatsApp media ids expire, so the bot keeps the last uploaded media id and reuses it for up to 25 days. If it's older, or the send fails, the bot re-uploads the stored bytes (`sticker.webp`) and retries. The id of every sent message is stored on the sticker so quote-replies to it work.

### Storage

MongoDB database `Whatsapp`, collection `stickers`, one document per sticker, shared by all users. Each document holds the uploader (`ownerPhone`), the last sender (`lastReceivedFrom`), the sticker bytes, sha256, mime type, animated flag, tags, related message ids and the cached media id. Indexes (unique `sha256`, tags, message ids, `lastReceivedFrom + lastReceivedAt`) are created at boot by `ensureStickerIndexes`, which also drops the old per-sender indexes. The connection uses `MONGO_DB_URL`.

### Sending (`sendWhatsAppMessage`)

```
POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages
Authorization: Bearer {WHATSAPP_TOKEN}
Content-Type: application/json

{ "messaging_product": "whatsapp", "recipient_type": "individual", "to": "<number>", "type": "text", "text": { "body": "<reply>" } }
```

When a text send fails, the Graph API error body (`error.response?.data`) is logged and the error is swallowed, so a failed reply never crashes the webhook. `sendWhatsAppSticker`, `downloadWhatsAppMedia` and `uploadWhatsAppMedia` throw instead, so the vault can fall back (for example, re-upload and retry).

## Environment variables

| Variable              | Required | Description |
|-----------------------|----------|-------------|
| `PORT`                | no       | Express port (default `3000`) |
| `MONGO_DB_URL`        | yes      | MongoDB connection string (sticker storage) |
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

The tests cover payload extraction (text, quote-replies, stickers), tokenizing, signature validation, the verification handshake, the immediate ack, signature rejection, and the vault flows: saving, dedupe, tagging, delete, search, random, help and media re-upload.
