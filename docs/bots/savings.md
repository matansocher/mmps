# Savings

**Shared Portfolio Rebalancer** - Password-protected React application backed by MongoDB.

## Overview

Savings is not a Telegram bot. It is a standalone React application from `apps/savings-web` served at `/savings/*`. Family members use one shared portfolio to maintain real ILS values, review currency and asset-type exposure, and simulate a new investment before adding it.

## Features

- **Real Portfolio Values** - Current holdings and portfolio totals use ILS amounts
- **Portfolio Overview** - Summary cards and composition bars show FX/ILS and equity/solid exposure
- **Investment Simulation** - A modal previews before-and-after portfolio percentages before a holding is added
- **Editable Holdings** - Amounts, account sections, classifications, geography, and notes can be updated in the portfolio list
- **Configurable Targets** - A dedicated modal controls the FX limit, solid allocation target, and normalized target weights for manual holdings
- **Shared Persistence** - One portfolio is stored in the `Savings` MongoDB database
- **Conflict Protection** - Revision checks prevent family members from silently overwriting newer changes
- **Password Authentication** - A shared password creates a signed HttpOnly browser session
- **Explicit Saving** - Edits remain local until the user saves the portfolio

## Configuration

```bash
MONGO_DB_URL=mongodb://localhost:27017
SAVINGS_APP_PASSWORD=choose-a-strong-shared-password
```

Savings does not have a Telegram bot token and does not use `LOCAL_ACTIVE_BOT_ID`.

## Getting Started

Run the backend and React development server:

```bash
npm run dev
npm run dev:savings-web
```

The Vite server proxies `/api/savings/*` to the Express server on port 3000.

## API Routes

- `POST /api/savings/auth/login` - Validate the shared password and create a signed session
- `POST /api/savings/auth/logout` - Clear the browser session
- `GET /api/savings/portfolio` - Load the shared portfolio
- `PUT /api/savings/portfolio` - Save the full portfolio with revision conflict detection
- `GET /savings/*` - Serve the built React SPA

## Database

**Database name**: `Savings`

**Collection**: `Portfolio`

The collection contains one shared document identified by `_id: "shared"`. It stores settings, holdings, a revision number, and the last update timestamp.

## Scheduled Tasks

Savings does not register scheduled tasks.

## Next Steps

- [Bot and Web Feature Overview](/bots/overview)
- [Database Architecture](/architecture/database)
- [Project Structure](/architecture/project-structure)
