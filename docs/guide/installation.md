# Installation

Detailed installation instructions for MMPS.

## System Requirements

- **Operating System**: Linux, macOS, or Windows
- **Node.js**: 24.x or later
- **npm**: 10.x or later
- **MongoDB**: 4.0 or later

## Step-by-Step Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/matansocher/mmps
cd mmps
```

### Step 2: Install Node.js

If you don't have Node.js 24.x installed, download it from [nodejs.org](https://nodejs.org).

Verify your installation:

```bash
node --version  # Should be v24.x.x
npm --version   # Should be 10.x.x
```

### Step 3: Install Dependencies

```bash
npm install
```

This installs all required packages from `package.json`.

### Step 4: Verify Installation

```bash
npm run lint    # Check code style
npm run build   # Build TypeScript
npm test        # Run tests
```

If all commands succeed, your installation is complete!

## Docker Installation (Optional)

You can also run MMPS in Docker:

```bash
docker build -t mmps .
docker run -e MONGO_URI=mongodb://host.docker.internal:27017 mmps
```

## Next Steps

- [Configuration Guide](/guide/environment-setup)
- [Running Locally](/guide/running-locally)
- [Quick Start](/guide/getting-started)
