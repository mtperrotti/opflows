# Jira Webhook Server

A simple web server that triggers Jira automations via webhooks with operation data including client name, operation name, and operation phases.

## Features

- **Modern Web Interface**: Clean, responsive UI with form validation
- **Jira Integration**: Triggers Jira automations via webhooks
- **Operation Phases**: Checkbox selection for different operation phases
- **Real-time Feedback**: Success/error messages with detailed responses
- **Secure**: Uses webhook secrets for authentication

## Prerequisites

- Node.js (version 14 or higher)
- A Jira instance with automation capabilities
- A Jira webhook URL for automation triggers

## Installation

### Windows
1. Clone or download this repository
2. Install Node.js from [nodejs.org](https://nodejs.org/)
3. Install dependencies:
   ```bash
   npm install
   ```

### Debian/Ubuntu
1. Clone or download this repository
2. Run the setup script:
   ```bash
   chmod +x debian-setup.sh
   ./debian-setup.sh
   ```
   
   Or manually:
   ```bash
   sudo apt-get update
   sudo apt-get install -y nodejs npm
   npm install
   ```

## Configuration

1. **Access the Settings Page**:
   - Start the server: `npm start`
   - Open `http://localhost:3000/settings` in your browser

2. **Configure Jira Webhook Settings**:
   - **Jira Webhook URL**: Your Jira webhook URL for automation triggers
   - **Webhook Secret**: Optional secret for webhook authentication

3. **Set up Jira Automation**:
   - Go to your Jira project settings
   - Navigate to **Automation** → **Rules**
   - Create a new rule with **Webhook received** trigger
   - Copy the webhook URL and paste it in the settings
   - Configure your automation actions (create issues, send notifications, etc.)

## Usage

1. **Start the server**:
   ```bash
   npm start
   ```
   
   For development with auto-restart:
   ```bash
   npm run dev
   ```

2. **Access the web interface**:
   - Open your browser and go to `http://localhost:3000`

3. **Fill out the form**:
   - **Client Name**: Enter the client name (required)
   - **Operation Name**: Enter the operation name (required)
   - **Operation Phases**: Select any of: Internal, External, Web app, Desktop App, Social Engineering, cloud, Mobile, code review, physical, IOT
   - **Engagement Dates**: Optionally set Start and End dates

4. **Send to Jira**: Click the "Send to Jira" button

   **Note**: Make sure to configure your Jira webhook URL first in the Settings page!

## Operation Phases

The following operation phases are available:
- Planning
- Preparation
- Execution
- Monitoring
- Cleanup
- Review

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

### Changing the Jira Project Key

Use the Settings page to change the project key, or edit `settings.json`:

```json
{
  "projectKey": "YOUR_PROJECT_KEY"
}
```

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

## Security Notes

- Webhook secrets are stored locally in `settings.json`
- Settings file should be protected with appropriate file permissions
- Webhooks are sent securely over HTTPS to Jira
- No sensitive data is logged or stored permanently
- Webhook secrets are only used for authentication headers

## Debian/Ubuntu Service

The setup script creates a systemd service for easy management:

```bash
# Start the service
sudo systemctl start jira-webhook

# Stop the service
sudo systemctl stop jira-webhook

# Enable auto-start on boot
sudo systemctl enable jira-webhook

# Check service status
sudo systemctl status jira-webhook

# View logs
sudo journalctl -u jira-webhook -f
```

## Deploy behind HTTPS (recommended)

Use Nginx and Let’s Encrypt to put OpFlows behind HTTPS while the app runs on port 3000.

### 1) Install Nginx and Certbot
```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2) Start OpFlows service
```bash
sudo systemctl start jira-webhook
sudo systemctl enable jira-webhook
```

### 3) Point DNS to your server
- Create an A record for your domain (e.g., `opflows.example.com`) to your server’s public IP.

### 4) Configure Nginx reverse proxy
Create `/etc/nginx/sites-available/opflows`:
```nginx
server {
    listen 80;
    server_name opflows.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```
Enable site and reload Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/opflows /etc/nginx/sites-enabled/opflows
sudo nginx -t && sudo systemctl reload nginx
```

### 5) Obtain HTTPS certificate
```bash
sudo certbot --nginx -d opflows.example.com
```
This will configure TLS automatically and set up auto‑renew.

### 6) (Optional) Open firewall
```bash
sudo ufw allow 'Nginx Full'
```

You can now access OpFlows at `https://opflows.example.com`.

## Docker (with built-in HTTPS)

Run OpFlows via Docker and mount your certificates folder:

### 1) Prepare certs
- Place your certificate chain and private key in a folder on the host, e.g. `./certificates`:
  - `fullchain.pem`
  - `privkey.pem`

### 2) Build and run with docker-compose
```bash
docker compose up -d --build
```
This will:
- Bind to port 3000
- Mount `./certificates` into the container at `/certificates`
- Enable HTTPS by default (can be toggled via `HTTPS_ENABLED=0`)

Environment overrides (optional):
```bash
HTTPS_ENABLED=1
CERT_FILE=fullchain.pem
KEY_FILE=privkey.pem
```

### 3) Access the app
- HTTPS: https://your-server:3000
- HTTP (if HTTPS disabled): http://your-server:3000

To change the external port, edit `ports` in `docker-compose.yml` (e.g., `443:3000`).

## License

MIT License - feel free to modify and use as needed.
