# Jira Webhook Server

A simple web server that triggers Jira automations via webhooks with operation data including client name, operation name, and operation phases.

## Features

- **Modern Web Interface**: Clean, responsive UI with form validation
- **Jira Integration**: Triggers Jira automations via webhooks
- **Operation Phases**: Checkbox selection for different operation phases
- **Real-time Feedback**: Success/error messages with detailed responses

## Prerequisites

- A Jira instance with automation capabilities
- A Jira webhook URL for automation triggers

## Installation

```
git clone https://github.com/VannG0gh/opflows.git
# Add HTTPS certs to certificates directory and edit Docker Files for HTTPS
docker compose up -d --build
```

## Configuration

1. **Configure Jira Webhook Settings**:
   - **Jira Webhook URL**: Your Jira webhook URL for automation triggers
   - **Webhook Secret**: Secret for webhook authentication
   - **Project Leads**: Add a name and account ID to assign work items to users.

3. **Set up Jira Automation**:
   - Go to your Jira project settings
   - Navigate to **Automation** → **Rules**
   - Create a new rule with **Webhook received** trigger
   - Copy the webhook URL and paste it in the settings
   - Configure your automation actions (create issues, send notifications, etc.)

## API Endpoints

- `GET /` - Serves the main web interface
- `GET /settings` - Serves the settings page
- `GET /api/settings` - Get current settings (excludes sensitive data)
- `POST /api/settings` - Update settings
- `POST /send-webhook` - Triggers Jira automation via webhook
- `GET /health` - Health check endpoint

## Webhook Request (Format)

The server sends a POST request to your Jira Automation webhook URL with headers and payload matching Jira's expectations:

Headers:

```text
Content-type: application/json
X-Automation-Webhook-Token: <Jira Secret>
```

Payload:

```json
{
  "data": {
    "opName": "2509-TEST-E",
    "ClientName": "Test Client",
    "phases": "Phase: Internal\nPhase: External",
    "startDate": "2025-09-10",
    "endDate": "2025-09-20"
  }
}
```

## Customization

### Adding More Operation Phases

Edit `public/index.html` and add new checkbox options in the checkbox-group div:

```html
<label class="checkbox-label">
    <input type="checkbox" name="opPhases" value="New Phase">
    <span class="checkmark"></span>
    New Phase
</label>
```

## Troubleshooting

### Common Issues

1. **401 Unauthorized**: Check your Jira API token
2. **404 Not Found**: Verify your Jira URL is correct
3. **403 Forbidden**: Ensure your API token has the necessary permissions
4. **Project not found**: Update the project key in the server code

### Logs

Check the console output for detailed error messages when webhook sending fails.

```
docker compose logs --tail 200
```


## License

MIT License - feel free to modify and use as needed.
