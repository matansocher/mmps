# Google Calendar Integration Setup Guide

This guide will walk you through setting up the Google Calendar integration for your chatbot. The integration allows your chatbot to create, list, and manage calendar events using natural language.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Google Cloud Console Setup](#google-cloud-console-setup)
3. [Service Account Creation](#service-account-creation)
4. [Calendar Configuration](#calendar-configuration)
5. [Application Configuration](#application-configuration)
6. [Testing the Integration](#testing-the-integration)
7. [Usage Examples](#usage-examples)
8. [Troubleshooting](#troubleshooting)

## Prerequisites

- A Google account
- Access to Google Cloud Console
- Node.js application with the chatbot already set up
- Admin access to the Google Calendar you want to integrate

## Google Cloud Console Setup

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top of the page
3. Click "New Project"
4. Enter a project name (e.g., "Chatbot Calendar Integration")
5. Click "Create"

### Step 2: Enable Google Calendar API

1. In the Google Cloud Console, navigate to "APIs & Services" > "Library"
2. Search for "Google Calendar API"
3. Click on "Google Calendar API" from the results
4. Click the "Enable" button
5. Wait for the API to be enabled (this may take a few moments)

## Service Account Creation

### Step 1: Create a Service Account

1. In the Google Cloud Console, go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "Service Account"
3. Fill in the service account details:
   - Service account name: `chatbot-calendar-service`
   - Service account ID: (will auto-generate)
   - Description: "Service account for chatbot calendar integration"
4. Click "Create and Continue"
5. Skip the "Grant this service account access to project" step (click "Continue")
6. Skip the "Grant users access to this service account" step (click "Done")

### Step 2: Create and Download Service Account Key

1. In the Credentials page, find your newly created service account
2. Click on the service account email
3. Go to the "Keys" tab
4. Click "Add Key" > "Create new key"
5. Select "JSON" as the key type
6. Click "Create"
7. The JSON key file will be downloaded to your computer
8. **IMPORTANT**: Keep this file secure and never commit it to version control

## Calendar Configuration

### Step 1: Share Your Calendar with the Service Account

1. Open [Google Calendar](https://calendar.google.com/)
2. Find the calendar you want to integrate in the left sidebar
3. Hover over the calendar and click the three dots menu
4. Select "Settings and sharing"
5. Scroll down to "Share with specific people or groups"
6. Click "Add people and groups"
7. Enter the service account email (found in the JSON key file as `client_email`)
   - It will look like: `chatbot-calendar-service@your-project-id.iam.gserviceaccount.com`
8. Set the permission to "Make changes to events"
9. Click "Send"

### Step 2: Get Your Calendar ID (Optional)

If you want to use a specific calendar instead of the primary calendar:

1. In Google Calendar settings for your calendar
2. Find "Integrate calendar" section
3. Copy the "Calendar ID"
4. You'll use this in the application configuration

## Application Configuration

### Option 1: Using Environment Variables (Recommended for Production)

1. Create a `.env` file in your project root (if it doesn't exist)
2. Add the following environment variables:

```bash
# Required: Google Calendar credentials (paste the entire JSON content as a single line)
GOOGLE_CALENDAR_CREDENTIALS='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...@....iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'

# Optional: Specific calendar ID (defaults to 'primary' if not set)
GOOGLE_CALENDAR_ID=your-calendar-id@group.calendar.google.com

# Optional: Timezone (defaults to 'Asia/Jerusalem' if not set)
GOOGLE_CALENDAR_TIMEZONE=America/New_York
```

**Important Notes:**
- The `GOOGLE_CALENDAR_CREDENTIALS` must be a valid JSON string on a single line
- Replace all the placeholder values with your actual credentials
- To convert the downloaded JSON file to a single line:
  - Open the JSON file in a text editor
  - Remove all line breaks (you can use an online JSON minifier)
  - Wrap the entire JSON in single quotes

### Option 2: Using a Credentials File (For Development)

1. Copy the downloaded JSON key file to your project root
2. Rename it to `google-calendar-credentials.json`
3. Add `google-calendar-credentials.json` to your `.gitignore` file:

```gitignore
# Google Calendar credentials
google-calendar-credentials.json
```

## Testing the Integration

### Step 1: Start Your Application

```bash
npm run start:dev
```

### Step 2: Test Calendar Commands

Try these commands with your chatbot:

1. **Create an event:**
   - "Schedule a meeting tomorrow at 3pm"
   - "Add team standup today at 10am for 30 minutes"
   - "Create an appointment with John next week at 2:30pm at the office"

2. **List events:**
   - "What's on my calendar today?"
   - "Show me my upcoming events"
   - "List my meetings this week"

3. **Check specific events:**
   - "Do I have any meetings tomorrow?"
   - "What events do I have next week?"

## Usage Examples

The chatbot's LLM will parse your natural language requests and extract structured data to create calendar events. Here are some examples:

### Basic Event Creation
When you say: "Meeting tomorrow at 2pm"
The LLM extracts:
- Title: "Meeting"
- Start time: Tomorrow at 2:00 PM (converted to ISO format)
- End time: Tomorrow at 3:00 PM (default 1 hour duration)

### Events with Duration
When you say: "Team meeting tomorrow at 10am for 2 hours"
The LLM extracts:
- Title: "Team meeting"
- Start time: Tomorrow at 10:00 AM
- End time: Tomorrow at 12:00 PM

### Events with Location
When you say: "Dinner at Italian Restaurant tonight at 7pm"
The LLM extracts:
- Title: "Dinner"
- Location: "Italian Restaurant"
- Start time: Today at 7:00 PM
- End time: Today at 8:00 PM

### Events with Attendees
When you say: "Meeting with john@example.com tomorrow at 2pm"
The LLM extracts:
- Title: "Meeting"
- Attendees: ["john@example.com"]
- Start time: Tomorrow at 2:00 PM
- End time: Tomorrow at 3:00 PM

### Complex Events
When you say: "Project review meeting tomorrow at 2:30pm for 90 minutes at Conference Room B with team@company.com"
The LLM extracts:
- Title: "Project review meeting"
- Location: "Conference Room B"
- Attendees: ["team@company.com"]
- Start time: Tomorrow at 2:30 PM
- End time: Tomorrow at 4:00 PM

## Troubleshooting

### Common Issues and Solutions

#### 1. "Google Calendar credentials not found" Error

**Problem:** The application can't find the credentials.

**Solutions:**
- Ensure the environment variable `GOOGLE_CALENDAR_CREDENTIALS` is set correctly
- If using a file, ensure `google-calendar-credentials.json` exists in the project root
- Check that the JSON is valid (use a JSON validator)

#### 2. "Permission denied" or "Forbidden" Errors

**Problem:** The service account doesn't have access to the calendar.

**Solutions:**
- Verify you've shared the calendar with the service account email
- Ensure the permission level is set to "Make changes to events"
- Wait a few minutes after sharing for permissions to propagate

#### 3. Events Not Appearing in Calendar

**Problem:** Events are created but don't show up.

**Solutions:**
- Check you're looking at the correct calendar
- Verify the `GOOGLE_CALENDAR_ID` if using a specific calendar
- Ensure the timezone is set correctly

#### 4. Invalid Date/Time Parsing

**Problem:** The tool misinterprets dates or times.

**Solutions:**
- Be more specific with dates (e.g., "January 15" instead of "15th")
- Include AM/PM for times (e.g., "3pm" instead of "3")
- Use clear date indicators (today, tomorrow, next Monday)

### Debug Mode

To enable detailed logging for troubleshooting:

1. Set the environment variable:
```bash
DEBUG=google-calendar:*
```

2. Check the console logs for detailed error messages

## Security Best Practices

1. **Never commit credentials to version control**
   - Always use `.gitignore` for credential files
   - Use environment variables for production

2. **Use least privilege principle**
   - Only grant the service account access to necessary calendars
   - Use "Make changes to events" permission, not "Make changes and manage sharing"

3. **Rotate keys regularly**
   - Create new service account keys periodically
   - Delete old keys from Google Cloud Console

4. **Monitor usage**
   - Check Google Cloud Console for API usage
   - Set up alerts for unusual activity

## Additional Features

The calendar tool supports these actions:

- **Create Event** (`action: 'create'`): Creates a new calendar event with structured data (title, startDateTime, endDateTime, location, attendees)
- **List Events** (`action: 'list'`): Lists events with optional search query
- **Upcoming Events** (`action: 'upcoming'`): Shows events for the next N days
- **Delete Event** (`action: 'delete'`): Removes an event by ID

The LLM handles all natural language parsing and provides the tool with properly formatted data:
- Dates and times in ISO format (YYYY-MM-DDTHH:mm:ss)
- Attendees as an array of email addresses
- Duration calculations (converting "for 2 hours" to appropriate end time)

## Support and Resources

- [Google Calendar API Documentation](https://developers.google.com/calendar/api/v3/reference)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Service Account Documentation](https://cloud.google.com/iam/docs/service-accounts)
- [Node.js Google APIs Client](https://github.com/googleapis/google-api-nodejs-client)

## Next Steps

Once your calendar integration is working:

1. Add more calendar actions (update events, RSVP to invitations)
2. Implement recurring events support
3. Add calendar notifications/reminders
4. Integrate with other calendar systems (Outlook, Apple Calendar)
5. Add support for all-day events
6. Implement conflict detection for overlapping events

---

**Note:** This integration requires proper setup of Google Cloud services and appropriate permissions. Ensure you comply with Google's Terms of Service and your organization's data policies when implementing this integration.
