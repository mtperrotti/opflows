#!/bin/bash

# Debian Setup Script for Jira Webhook Server
# This script sets up the environment and installs dependencies on Debian/Ubuntu

echo "🚀 Setting up Jira Webhook Server on Debian/Ubuntu..."

# Update package list
echo "📦 Updating package list..."
sudo apt-get update

# Install Node.js and npm
echo "📦 Installing Node.js and npm..."
sudo apt-get install -y nodejs npm

# Check versions
echo "✅ Checking installed versions:"
node --version
npm --version

# Install project dependencies
echo "📦 Installing project dependencies..."
npm install

# Create settings.json if it doesn't exist
if [ ! -f "settings.json" ]; then
    echo "📝 Creating default settings file..."
    cat > settings.json << EOF
{
  "webhookUrl": "",
  "webhookSecret": "",
  "jiraUrl": "",
  "jiraToken": "",
  "projectKey": "WEBHOOK"
}
EOF
fi

# Set proper permissions
echo "🔐 Setting file permissions..."
chmod 644 settings.json
chmod +x server.js

# Create systemd service file (optional)
echo "🔧 Creating systemd service file..."
sudo tee /etc/systemd/system/jira-webhook.service > /dev/null << EOF
[Unit]
Description=Jira Webhook Server
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
EOF

echo "✅ Setup complete!"
echo ""
echo "🎯 Next steps:"
echo "1. Configure your settings: http://localhost:3000/settings"
echo "2. Start the server: npm start"
echo "3. Or start as a service: sudo systemctl start jira-webhook"
echo "4. Enable auto-start: sudo systemctl enable jira-webhook"
echo ""
echo "📖 For more information, see README.md"
