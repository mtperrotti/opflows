const express = require('express');
const axios = require('axios');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const httpsModule = require('https');
const app = express();
const PORT = process.env.PORT || 3000;
const HOST = '0.0.0.0';

// Settings file path (directory-based for robust Docker volume)
const SETTINGS_DIR = process.env.SETTINGS_DIR || path.join(__dirname, 'data');
const SETTINGS_FILE = path.join(SETTINGS_DIR, 'settings.json');

// Default settings
const defaultSettings = {
    webhookUrl: '',
    webhookSecret: '',
    projectLeads: {}
};

// Load settings from file
function loadSettings() {
    try {
        if (fs.existsSync(SETTINGS_FILE)) {
            const data = fs.readFileSync(SETTINGS_FILE, 'utf8');
            return { ...defaultSettings, ...JSON.parse(data) };
        }
    } catch (error) {
        console.error('Error loading settings:', error);
    }
    return defaultSettings;
}

// Save settings to file
function saveSettings(settings) {
    try {
        if (!fs.existsSync(SETTINGS_DIR)) {
            fs.mkdirSync(SETTINGS_DIR, { recursive: true });
        }
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving settings:', error);
        return false;
    }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Serve the main HTML page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Serve the settings page
app.get('/settings', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'settings.html'));
});

// Get current settings
app.get('/api/settings', (req, res) => {
    const settings = loadSettings();
    // Don't return sensitive data
    res.json({
        webhookUrl: settings.webhookUrl,
        hasWebhookSecret: !!settings.webhookSecret,
        projectLeads: settings.projectLeads || {}
    });
});

// Update settings
app.post('/api/settings', (req, res) => {
    try {
        const { webhookUrl, webhookSecret, projectLeads } = req.body;
        const currentSettings = loadSettings();
        
        const newSettings = {
            ...currentSettings,
            webhookUrl: webhookUrl || currentSettings.webhookUrl,
            webhookSecret: webhookSecret || currentSettings.webhookSecret,
            projectLeads: (projectLeads && typeof projectLeads === 'object') ? projectLeads : (currentSettings.projectLeads || {})
        };

        if (saveSettings(newSettings)) {
            res.json({ success: true, message: 'Settings saved successfully' });
        } else {
            res.status(500).json({ error: 'Failed to save settings' });
        }
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Webhook endpoint to send data to Jira
app.post('/send-webhook', async (req, res) => {
    try {
        const { clientName, opName, opPhases, projectLead, projectLeadAccountId, pointOfContact, startDate, endDate } = req.body;
        const settings = loadSettings();
        
        // Validate required fields
        if (!clientName || !opName) {
            return res.status(400).json({ 
                error: 'Missing required fields: clientName and opName are required' 
            });
        }

        if (!settings.webhookUrl) {
            return res.status(400).json({ 
                error: 'Webhook URL not configured. Please configure webhook URL in settings.' 
            });
        }

        // Format phases as lines: "Phase: name" separated by newlines
        const selectedPhases = Array.isArray(opPhases) ? opPhases : [];
        const phasesString = selectedPhases.map(p => `Phase: ${p}`).join('\n');
        const dateLines = [];
        if (startDate) dateLines.push(`Start: ${startDate}`);
        if (endDate) dateLines.push(`End: ${endDate}`);
        const datesSection = dateLines.length ? `\n${dateLines.join('\n')}` : '';

        // Prepare the webhook payload for Jira automation (exact shape required)
        const webhookPayload = {
            data: {
                opName: opName,
                ClientName: clientName,
                phases: phasesString,
                startDate: startDate || '',
                endDate: endDate || '',
                projectLead: projectLeadAccountId || projectLead || '',
                pointOfContact: pointOfContact || ''
            }
        };

        // Prepare headers
        const headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'Jira-Webhook-Server/1.0'
        };

        // Add webhook secret if configured
        if (settings.webhookSecret) {
            headers['X-Automation-Webhook-Token'] = settings.webhookSecret;
        }

        // Send webhook to Jira automation
        const webhookResponse = await axios.post(settings.webhookUrl, webhookPayload, {
            headers: headers,
            timeout: 10000 // 10 second timeout
        });

        res.json({ 
            success: true, 
            message: 'Webhook sent successfully to Jira automation',
            sentPayload: webhookPayload,
            webhookResponse: {
                status: webhookResponse.status,
                statusText: webhookResponse.statusText
            }
        });

    } catch (error) {
        console.error('Error sending webhook:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to send webhook to Jira automation',
            details: error.response?.data || error.message
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Optional HTTPS support via local certificates
function startServer() {
    const httpsEnabled = process.env.HTTPS_ENABLED === '1' || process.env.HTTPS_ENABLED === 'true';
    const certDir = process.env.CERT_DIR || process.env.CERT_PATH || '/certificates';
    const certFile = process.env.CERT_FILE || 'fullchain.pem';
    const keyFile = process.env.KEY_FILE || 'privkey.pem';

    if (httpsEnabled) {
        try {
            const certPath = path.join(certDir, certFile);
            const keyPath = path.join(certDir, keyFile);
            const options = {
                cert: fs.readFileSync(certPath),
                key: fs.readFileSync(keyPath)
            };
            httpsModule.createServer(options, app).listen(PORT, HOST, () => {
                console.log(`HTTPS server is running on https://${HOST}:${PORT}`);
                console.log('Configure your Jira webhook URL and secret in the web interface');
            });
            return;
        } catch (err) {
            console.error('Failed to start HTTPS server, falling back to HTTP:', err.message);
        }
    }

    app.listen(PORT, HOST, () => {
        console.log(`HTTP server is running on http://${HOST}:${PORT}`);
        console.log('Configure your Jira webhook URL and secret in the web interface');
    });
}

startServer();
