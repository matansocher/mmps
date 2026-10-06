# Stickers — WhatsApp Sticker Vault

A WhatsApp sticker vault on top of Meta's WhatsApp Cloud API. The vault is shared: every sticker anyone saves can be found by everyone. Send it stickers and it saves them, tag them with words, then send a word to get matching stickers back as real WhatsApp stickers. It runs on the shared MMPS Express server.

- `GET /whatsapp-webhook` handles Meta's verification handshake.
- `POST /whatsapp-webhook` receives incoming messages (stickers and text).

Code lives in `src/features/stickers/` (vault logic, tag parsing, Mongo repositories) and the shared `src/services/whatsapp/`, which any WhatsApp bot can reuse:

- `registerWhatsAppWebhook(app, { path, onMessage, allowedPhones? })` registers the GET verification and POST message routes, checks the signature, acks Meta, logs failed delivery statuses, applies the allowlist and hands each text or sticker message to `onMessage`. Call it before the global `express.json()`.
- Webhook helpers: `extractIncomingMessage`, `isValidSignature`, `parseAllowedPhones`, `isAllowedSender`, plus the webhook payload types.
- The Graph API client: text, sticker send, typing indicator, media download and upload.

The feature was renamed from `whatsapp` to `stickers`. The webhook path (`/whatsapp-webhook`), the Mongo database (`Whatsapp`) and the env var names stay the same, so Meta's webhook config and stored data don't change.

All replies are in Hebrew. English commands keep working next to their Hebrew aliases.

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
4. If `WHATSAPP_ALLOWED_PHONES` is set and the sender isn't in it, the message is logged and dropped: no read receipt, no typing indicator, no reply and nothing saved. When it's unset, everyone can use the bot (a warning is logged at boot).
5. It logs the message and hands it to `handleIncomingMessage` in `sticker-vault.service.ts`.

## Sticker vault

### Saving

When a sticker arrives, the bot downloads it from the Graph API and hashes the bytes (sha256). If anyone already saved that sticker, it replies "קיים 👍" with the sticker's search words (tags) instead of storing a copy. Otherwise it stores the bytes and replies "נשמר ✅" with a hint to quote-reply the sticker with words to add search words. A plain text message after a sticker is always a search; only a quote-reply tags. User-facing text calls tags "מילות חיפוש" (search words).

WhatsApp only delivers stickers up to 512×512 and 100 KB (static) or 500 KB (animated). Larger ones are re-encoded with sharp (resized to 512×512, lower WebP quality) before saving. If it still doesn't fit, the bot refuses it. Stickers saved before this check are shrunk the first time they're sent.

### Commands (text messages)

| You send | What happens |
|----------|--------------|
| A quote-reply to a sticker with words | Edits that sticker's tags (works on stickers you sent and stickers the bot sent) |
| A quote-reply to a sticker with `-`, `delete` or `מחק` | Removes the sticker (anyone can delete, not just whoever saved it) |
| Anything else | Searches tags and sends every sticker tagged with every word sent (throttled), or replies `לא נמצאו סטיקרים עבור "..."` |

In a quote-reply, a word with a leading or trailing `-` (`-לילה` or `לילה-`) removes that tag; every other word is added. The text is split on whitespace first so the `-` is seen, then each word is normalized (lowercased, split into letters, digits and emojis). Emojis work as tags too: each emoji is its own word (`😂😂🔥` gives `😂` and `🔥`), skin tones and ZWJ sequences stay whole (`👍🏽`, `👨‍👩‍👧`), and `❤` matches `❤️`. After any change the bot replies "עודכן ✅" with the updated tag list. Tags are matched on whole words.

### Timing logs

Every handled message logs one line with how long each step took, e.g. `Timing for text wamid.X: search=12ms sendCached=410ms recordId=8ms total=430ms sinceSent≈1500ms`. `sinceSent` compares Meta's message timestamp to now, so it includes webhook delivery delay (and Heroku cold start). A sticker's first send shows `getData`, `upload`, `setMedia` and `send` instead of `sendCached`, which is usually the slow path. Use it to find the bottleneck when replies feel slow.

### Typing indicator

At the start of handling every incoming message, the bot calls `sendWhatsAppTypingIndicator(messageId)`:

```
POST https://graph.facebook.com/v20.0/{PHONE_NUMBER_ID}/messages

{ "messaging_product": "whatsapp", "status": "read", "message_id": "<wamid>", "typing_indicator": { "type": "text" } }
```

This marks the message as read and shows "typing…" for up to 25 seconds or until the reply arrives. It's fire-and-forget: errors are logged, never thrown.

### Throttling

Meta allows about 80 messages per second per business number, but also has a per-user pair rate limit (error `131056`): roughly one message every 6 seconds sustained, with short bursts allowed. So a search sends every matching sticker, throttled: the first `STICKER_BURST_SIZE` (10) go out `STICKER_SEND_DELAY_MS` (1 second) apart, the rest `STICKER_SUSTAINED_SEND_DELAY_MS` (6 seconds) apart. When more than 10 match, the bot first says how many it found and that it's sending them gradually. If a send fails with `131056`, the bot waits `STICKER_RATE_LIMIT_BACKOFF_MS` (30 seconds) and retries that sticker once; if it fails again, it stops sending and asks the user to try again shortly.

If handling a message fails unexpectedly (for example a MongoDB error), the error is logged and the user gets a Hebrew reply instead of silence: `משהו השתבש ולא הצלחתי לשמור את הסטיקר 😕 נסו שוב מאוחר יותר.` for stickers, `משהו השתבש 😕 נסו שוב מאוחר יותר.` for text (search or tag edits).

### Sending stickers back

Stickers go out as `type: "sticker"` messages, so they show up as stickers, not images. WhatsApp media ids expire, so the bot keeps the last uploaded media id and reuses it for up to 25 days. If it's older, or the send fails, the bot re-uploads the stored bytes (`sticker.webp`) and retries. The id of every sent message is stored on the sticker so quote-replies to it work.

### Storage

MongoDB database `Whatsapp`, collection `stickers`, one document per sticker, shared by all users. Each document holds who first saved it (`ownerPhone`, informational only), the sticker bytes, sha256, mime type, animated flag, tags, related message ids and the cached media id. Indexes (unique `sha256`, tags, message ids) are created at boot by `ensureStickerIndexes`, which also drops legacy indexes (the old per-sender and `last_received` indexes). The connection uses `MONGO_DB_URL`.

### Search metrics

Every text search (not tag edits) is recorded in the `searches` collection of the same database, for dashboards. One document per search:

| Field | Meaning |
| --- | --- |
| `phone` | Who searched |
| `query` | The raw text |
| `words` | The normalized words that were matched (all must match) |
| `matchedCount` | Matches found (all of them are sent) |
| `sentStickerIds` | Ids of the stickers actually delivered |
| `failedCount` | Matches that couldn't be sent |
| `rateLimited` | Sending stopped on error `131056` |
| `durationMs` | Time from receiving the message to the end of sending |
| `createdAt` | When the search happened |

Indexes `{ createdAt: -1 }` and `{ words: 1, createdAt: -1 }` are created at boot by `ensureSearchIndexes`. The write is fire-and-forget: a failure is logged and never affects the reply. There is no TTL. Zero-result searches (`matchedCount: 0`) show which words people look for that the vault doesn't have yet.

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
| `WHATSAPP_ALLOWED_PHONES` | no   | Comma-separated phone numbers allowed to use the bot, with country code (e.g. `972501234567,972521234567`). `+`, spaces and dashes are ignored. Unset = everyone |

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
npx vitest run src/features/stickers src/services/whatsapp
```

The tests cover the typing indicator payload, tag edit parsing, payload extraction (text, quote-replies, stickers), tokenizing (including emojis), signature validation, the phone allowlist, the verification handshake, the immediate ack, signature rejection, and the vault flows: saving, dedupe, tagging, tag removal, delete by anyone (including `-` and Hebrew aliases), search metrics recording, throttled search, the rate-limit stop and media re-upload.
