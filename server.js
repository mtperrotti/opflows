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
    jiraDomain: '',
    jiraApiToken: '',
    jiraEmail: '',
    jiraProjectKey: '',
    projectLeads: {},
    // Custom field mappings for Jira
    jiraCustomFields: {
        epicName: 'customfield_10011',          // Default Epic Name field
        startDate: 'customfield_10015',         // Start Date field
        pointOfContact: 'customfield_10014',    // Point of Contact field
        offensiveProjectLead: 'customfield_10013' // Offensive Project Lead field
    },
    engagementTypes: {
        'Internal': {
            tasks: [
                { name: 'Internal Network Discovery', subtasks: ['Network Scanning', 'Service Enumeration', 'Vulnerability Assessment'] },
                { name: 'Internal Network Testing', subtasks: ['Privilege Escalation', 'Lateral Movement', 'Data Exfiltration'] }
            ]
        },
        'External': {
            tasks: [
                { name: 'External Network Discovery', subtasks: ['Reconnaissance', 'Port Scanning', 'Service Identification'] },
                { name: 'External Network Testing', subtasks: ['Vulnerability Exploitation', 'Web Application Testing', 'Social Engineering'] }
            ]
        },
        'Web App': {
            tasks: [
                { name: 'Web Application Discovery', subtasks: ['Application Mapping', 'Technology Stack Analysis', 'Authentication Testing'] },
                { name: 'Web Application Testing', subtasks: ['Input Validation Testing', 'Session Management Testing', 'Authorization Testing'] }
            ]
        },
        'Test Management': {
            tasks: [
                { name: 'Project Initiation', subtasks: ['Project Kickoff Meeting', 'Scope Review', 'Access Verification', 'Testing Environment Setup'] },
                { name: 'Project Management', subtasks: ['Status Updates', 'Client Communication', 'Resource Management', 'Timeline Tracking'] },
                { name: 'Project Closure', subtasks: ['Data Collection', 'Report Writing', 'Finding Review', 'Deliverable Submission', 'Lessons Learned'] }
            ]
        }
    }
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
        jiraDomain: settings.jiraDomain,
        jiraEmail: settings.jiraEmail,
        jiraProjectKey: settings.jiraProjectKey,
        hasJiraApiToken: !!settings.jiraApiToken,
        projectLeads: settings.projectLeads || {},
        engagementTypes: settings.engagementTypes || {}
    });
});

// Update settings
app.post('/api/settings', (req, res) => {
    try {
        const { jiraDomain, jiraApiToken, jiraEmail, jiraProjectKey, projectLeads, engagementTypes } = req.body;
        const currentSettings = loadSettings();
        
        const newSettings = {
            ...currentSettings,
            jiraDomain: jiraDomain || currentSettings.jiraDomain,
            jiraApiToken: jiraApiToken || currentSettings.jiraApiToken,
            jiraEmail: jiraEmail || currentSettings.jiraEmail,
            jiraProjectKey: jiraProjectKey || currentSettings.jiraProjectKey,
            projectLeads: (projectLeads && typeof projectLeads === 'object') ? projectLeads : (currentSettings.projectLeads || {}),
            engagementTypes: (engagementTypes && typeof engagementTypes === 'object') ? engagementTypes : (currentSettings.engagementTypes || {})
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

app.use(express.json());

// ---------- Jira Client ----------
function getJiraClient(settings) {
  let cleanDomain = settings.jiraDomain.trim().replace(/^https?:\/\//, '').replace(/\/$/, '');
  const baseUrl = cleanDomain.includes('.atlassian.net')
    ? `https://${cleanDomain}`
    : `https://${cleanDomain}.atlassian.net`;

  return axios.create({
    baseURL: `${baseUrl}/rest/api/3`,
    headers: {
      'Authorization': `Basic ${Buffer.from(`${settings.jiraEmail}:${settings.jiraApiToken}`).toString('base64')}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: 30000
  });
}

async function jiraApi(settings, endpoint, method = 'GET', data = null) {
  const client = getJiraClient(settings);
  try {
    const response = await client.request({ url: endpoint, method, data });
    return response.data;
  } catch (error) {
    console.error(`Jira API Error: ${method} ${endpoint}`);
    if (error.response) {
      console.error(`Status: ${error.response.status} ${error.response.statusText}`);
      console.error('Response:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    throw error;
  }
}

// ---------- Helpers ----------
async function getCustomFields(settings) {
  try {
    const fields = await jiraApi(settings, '/field');
    console.log('Available Jira fields:', JSON.stringify(fields, null, 2));
    
    // Find all needed custom fields
    const customFields = {
      epicName: fields.find(f => f.name === 'Epic Name' || f.key === 'epicName')?.id,
      startDate: fields.find(f => f.name === 'Start date' || f.name === 'Start Date')?.id,
      pointOfContact: fields.find(f => f.name === 'Point of Contact')?.id,
      offensiveProjectLead: fields.find(f => f.name === 'Offensive Project Lead')?.id
    };

    console.log('Found custom fields:', customFields);
    return customFields;
  } catch (error) {
    console.error('Error getting custom fields:', error);
    throw error;
  }
}

async function getEpicNameFieldId(settings) {
  const customFields = await getCustomFields(settings);
  if (!customFields.epicName) {
    console.warn('Epic Name field not found, using default customfield_10011');
    return 'customfield_10011';
  }
  return customFields.epicName;
}

async function checkEpicExists(settings, epicName) {
  const jql = `project = "${settings.jiraProjectKey}" AND issuetype = Epic AND summary ~ "${epicName.replace(/"/g, '\\"')}"`;

  const result = await jiraApi(settings, '/search/jql', 'POST', {
    jql,
    maxResults: 1,
    fields: ['id', 'key', 'summary'],
    fieldsByKeys: true
  });

  return result.issues?.[0] || null;
}


async function createIssue(settings, type, data) {
  const fields = {
    project: { key: settings.jiraProjectKey },
    summary: data.summary,
    issuetype: { name: type }
  };

  if (data.description) {
    fields.description = {
      type: 'doc',
      version: 1,
      content: [{ type: 'paragraph', content: [{ type: 'text', text: data.description }] }]
    };
  }
  if (data.assignee) fields.assignee = { accountId: data.assignee };
  
  if (type === 'Epic') {
    if (data.dueDate) fields.duedate = data.dueDate;
    const customFields = settings.jiraCustomFields || {};
    
    // Set Epic Name
    if (customFields.epicName) {
      fields[customFields.epicName] = data.epicName;
    }
    
    // Add custom fields for Epic
    if (data.startDate && customFields.startDate) {
      fields[customFields.startDate] = data.startDate;
    }
    
    if (data.pointOfContact && customFields.pointOfContact) {
      fields[customFields.pointOfContact] = data.pointOfContact;
    }
    
    // For Offensive Project Lead, we'll use the assignee's accountId
    if (data.projectLeadAccountId && customFields.offensiveProjectLead) {
      fields[customFields.offensiveProjectLead] = { accountId: data.projectLeadAccountId };
    }
  }
  
  if (type === 'Task' && data.epicKey) {
    fields.parent = { key: data.epicKey }; // Epic Link
  }
  if (type === 'Sub-task' && data.parentKey) {
    fields.parent = { key: data.parentKey };
  }

  const payload = { fields };
  console.log(`Creating ${type} with payload:`, JSON.stringify(payload, null, 2));

  return await jiraApi(settings, '/issue', 'POST', payload);
}

// ---------- Express Route ----------
app.post('/create-jira-issues', async (req, res) => {
  const { clientName, opName, opPhases, projectLead, projectLeadAccountId, pointOfContact, startDate, endDate } = req.body;
  const settings = loadSettings();

  try {
    if (!clientName || !opName) {
      return res.status(400).json({ error: 'clientName and opName are required' });
    }
    if (!Array.isArray(opPhases) || opPhases.length === 0) {
      return res.status(400).json({ error: 'At least one operation phase is required' });
    }

    const epicName = `${clientName} - ${opName}`;
    const existingEpic = await checkEpicExists(settings, epicName);
    if (existingEpic) {
      return res.status(400).json({
        error: `Epic "${epicName}" already exists (Issue: ${existingEpic.key}).`
      });
    }

    // Create Epic
    const epicData = {
      summary: epicName,
      epicName,
      description: `Operation: ${opName}\nClient: ${clientName}\nPhases: ${opPhases.join(', ')}\nProject Lead: ${projectLead || 'Not assigned'}\nPoint of Contact: ${pointOfContact || 'Not specified'}\n\nTimeline:\n${startDate ? `Start: ${startDate}` : ''}${endDate ? `\nEnd: ${endDate}` : ''}`,
      assignee: projectLeadAccountId,
      dueDate: endDate,
      startDate: startDate,
      pointOfContact: pointOfContact,
      projectLeadAccountId: projectLeadAccountId
    };
    const epic = await createIssue(settings, 'Epic', epicData);

    const results = { epic: epic, tasks: [], subtasks: [] };

    const testManagementConfig = settings.engagementTypes['Test Management'];
    if (testManagementConfig?.tasks) {
      for (const taskConfig of testManagementConfig.tasks) {
        const task = await createIssue(settings, 'Task', {
          summary: `${opName} - ${taskConfig.name}`,
          description: `${taskConfig.name} for ${clientName} - ${opName}`,
          epicKey: epic.key,
          assignee: projectLeadAccountId
        });
        results.tasks.push(task);

        // Create subtasks for Test Management
        for (const subtaskName of taskConfig.subtasks || []) {
          const subtask = await createIssue(settings, 'Sub-task', {
            summary: subtaskName,
            description: `${subtaskName} for ${taskConfig.name} - ${clientName} ${opName}`,
            parentKey: task.key,
            assignee: projectLeadAccountId
          });
          results.subtasks.push(subtask);
        }
      }
    }
      
    // Create tasks + subtasks
    for (const phase of opPhases) {
      const phaseConfig = settings.engagementTypes[phase];
      if (!phaseConfig?.tasks) continue;

      for (const taskConfig of phaseConfig.tasks) {
        const task = await createIssue(settings, 'Task', {
          summary: `${opName} - ${taskConfig.name} - ${phase}`,
          description: `${taskConfig.name} for ${clientName} - ${opName} (${phase} phase)`,
          epicKey: epic.key,
          assignee: projectLeadAccountId
        });
        results.tasks.push(task);

        for (const subtaskName of taskConfig.subtasks || []) {
          const subtask = await createIssue(settings, 'Sub-task', {
            summary: subtaskName,
            description: `${subtaskName} for ${taskConfig.name} - ${clientName} ${opName}`,
            parentKey: task.key,
            assignee: projectLeadAccountId
          });
          results.subtasks.push(subtask);
        }
      }
    }

    res.json({
      success: true,
      message: `Created epic ${epic.key} with ${results.tasks.length} tasks and ${results.subtasks.length} subtasks`,
      results
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// Add subtask endpoint
app.post('/add-subtask', async (req, res) => {
    try {
        const { parentTaskKey, subtaskName, phase } = req.body;
        const settings = loadSettings();
        
        // Validate required fields
        if (!parentTaskKey || !subtaskName) {
            return res.status(400).json({ 
                error: 'Missing required fields: parentTaskKey and subtaskName are required' 
            });
        }

        // Validate Jira settings
        if (!settings.jiraDomain || !settings.jiraApiToken || !settings.jiraEmail || !settings.jiraProjectKey) {
            return res.status(400).json({ 
                error: 'Jira configuration incomplete. Please configure Jira settings.' 
            });
        }

        // Create subtask
        const subtaskData = {
            summary: subtaskName,
            description: `${subtaskName} for ${phase} assessment`,
            parentKey: parentTaskKey,
            assignee: null, // You might want to get this from the parent task
            dueDate: null
        };

        const createdSubtask = await createSubtask(settings, subtaskData);
        console.log(`Created new subtask: ${createdSubtask.key}`);

        res.json({ 
            success: true, 
            message: `Successfully created subtask ${createdSubtask.key}`,
            subtask: {
                key: createdSubtask.key,
                summary: createdSubtask.fields?.summary || subtaskName,
                parentTask: parentTaskKey,
                phase: phase
            }
        });

    } catch (error) {
        console.error('Error creating subtask:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to create subtask',
            details: error.response?.data || error.message
        });
    }
});

// Remove subtask endpoint
app.delete('/remove-subtask/:subtaskKey', async (req, res) => {
    try {
        const { subtaskKey } = req.params;
        const settings = loadSettings();
        
        // Validate Jira settings
        if (!settings.jiraDomain || !settings.jiraApiToken || !settings.jiraEmail || !settings.jiraProjectKey) {
            return res.status(400).json({ 
                error: 'Jira configuration incomplete. Please configure Jira settings.' 
            });
        }

        // Get available transitions for the issue
        const transitionsResponse = await makeJiraApiCall(settings, `/rest/api/3/issue/${subtaskKey}/transitions`);
        const transitions = transitionsResponse.data.transitions;
        
        // Find a suitable transition (Done, Resolved, Closed, etc.)
        const completionTransition = transitions.find(t => 
            ['Done', 'Resolved', 'Closed', 'Complete'].some(status => 
                t.name.toLowerCase().includes(status.toLowerCase())
            )
        );

        if (completionTransition) {
            const transitionPayload = {
                transition: {
                    id: completionTransition.id
                }
            };

            await makeJiraApiCall(settings, `/rest/api/3/issue/${subtaskKey}/transitions`, 'POST', transitionPayload);
            console.log(`Transitioned subtask ${subtaskKey} to ${completionTransition.name}`);

            res.json({ 
                success: true, 
                message: `Successfully transitioned subtask ${subtaskKey} to ${completionTransition.name}`
            });
        } else {
            res.status(400).json({
                error: `No suitable completion transition found for subtask ${subtaskKey}`,
                availableTransitions: transitions.map(t => t.name)
            });
        }

    } catch (error) {
        console.error('Error removing subtask:', error.response?.data || error.message);
        res.status(500).json({ 
            error: 'Failed to remove subtask',
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

