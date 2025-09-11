# Jira API Integration Tool

A sophisticated web application that leverages the Jira REST API to create and manage epics, tasks, and subtasks programmatically. This tool provides direct integration with Jira's API to automate project structure creation and task management through a modern, dark-themed UI.

## Features

- **Direct Jira API Integration**
  - Real-time API communication with Jira
  - No webhook setup required
  - Secure API token authentication
  - Native Jira issue creation and management

- **Epic & Task Management**
  - Direct creation of epics via Jira API
  - Real-time task and subtask management
  - Immediate feedback from API operations
  - Interactive task completion tracking

- **Modern Interface**
  - Clean, responsive dark-themed UI
  - Form validation and error handling
  - Dynamic task expansion/collapse
  - Intuitive subtask management

- **Advanced Configuration**
  - Customizable engagement type templates
  - Project lead management with Jira account integration
  - Flexible operation phase configuration
  - Persistent settings storage

## Prerequisites

- Node.js (v14 or higher)
- Jira Cloud instance
- Jira API token (for direct API authentication)
- Jira user with appropriate permissions

## API Integration Benefits

- **Direct Communication**: No intermediate webhooks needed
- **Real-time Operations**: Immediate feedback from Jira
- **Secure Authentication**: API token-based security
- **Reduced Complexity**: No webhook configuration required
- **Better Reliability**: Direct API calls with proper error handling

## Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/VannG0gh/opflows.git
   cd jira-webhook-server
   npm install
   ```

2. **Configuration**
   Create a `.env` file:
   ```env
   JIRA_DOMAIN=your-domain
   JIRA_EMAIL=your-email@company.com
   JIRA_API_TOKEN=your-api-token
   JIRA_PROJECT_KEY=your-project-key
   ```

3. **Docker Setup (Optional)**
   ```bash
   docker compose up -d --build
   ```

## Configuration Guide

### 1. Jira API Setup

1. **API Access Setup**:
   - Visit https://id.atlassian.com/manage/api-tokens
   - Generate a new API token for direct API access
   - Save it securely for the configuration
   - Ensure your Jira user has appropriate permissions

2. **API Configuration**:
   - Navigate to the Settings page
   - Enter your Jira domain (e.g., 'your-company')
   - Configure your API credentials:
     - Jira email (associated with API token)
     - API token (for direct API authentication)
     - Project key (target project for API operations)
   - Test API connection through the interface

### 2. Project Lead Configuration

1. Access the Settings page
2. In the Project Leads section:
   - Add lead names and their Jira account IDs
   - Use the "Add/Update Lead" button to save changes

### 3. Engagement Types Setup

1. Select "Engagement Type" from the dropdown
2. Configure task templates:
   - Add main tasks
   - Define subtasks for each task
   - Save configurations for reuse

## Usage Guide

### Creating New Epics

1. **Access Main Form**:
   - Navigate to the home page
   - Ensure your settings are configured

2. **Fill Required Information**:
   - Client Name
   - Operation Name
   - Select Operation Phases
   - Choose Project Lead
   - Set Start/End Dates (optional)

3. **Submit and Review**:
   - Click Submit to create the epic
   - Review the debug information
   - Check Jira for created items

### Managing Tasks & Subtasks

1. **Task Management**:
   - Expand tasks using the '+' icon
   - View subtask count badges
   - Remove tasks as needed

2. **Subtask Operations**:
   - Add new subtasks via "Add Subtask"
   - Mark subtasks as complete
   - Remove completed subtasks

## API Integration Details

### Local API Endpoints

These endpoints handle the communication between the UI and Jira's API:

- `POST /create-jira-issues`
  - Creates epics/tasks using Jira REST API
  - Handles all necessary API calls in sequence
  - Returns detailed API response data

- `POST /add-subtask`
  - Makes direct Jira API call to create subtask
  - Links subtask to parent using Jira's API
  - Returns immediate API confirmation

- `DELETE /remove-subtask/:key`
  - Updates subtask status via Jira API
  - Handles proper task relationship management
  - Returns API operation result

### Jira API Integration

The tool interacts with several Jira API endpoints:

- Issue Creation API
  - `/rest/api/3/issue` for creating epics/tasks
  - Handles custom field mapping
  - Manages issue relationships

- Issue Link API
  - Creates parent-child relationships
  - Manages issue hierarchies
  - Handles subtask associations

### Settings Management

- `GET /api/settings`
  - Retrieves local configuration
  - Excludes sensitive API credentials
  - Returns template configurations

- `POST /api/settings`
  - Updates local settings
  - Validates API credentials
  - Tests API connectivity

## Project Structure

```text
jira-webhook-server/
├── server.js          # Main server file
├── public/           
│   ├── index.html    # Main form
│   ├── settings.html # Settings page
│   ├── script.js     # Main form logic
│   ├── settings.js   # Settings page logic
│   └── styles.css    # Shared styles
├── data/
│   └── settings.json # Configuration storage
└── docker-compose.yml # Docker configuration
```

## Troubleshooting

### Common Issues

1. **API Authentication**:
   - Verify API token hasn't expired
   - Ensure API token has correct permissions
   - Check email matches API token owner
   - Confirm Jira domain is correct

2. **API Operation Failures**:
   - Review API response errors in console
   - Verify user has required Jira permissions
   - Check project key accessibility via API
   - Confirm API rate limits haven't been exceeded

3. **Integration Issues**:
   - Validate API endpoint accessibility
   - Check network connectivity to Jira
   - Review API error responses
   - Verify API version compatibility

### Debug Mode

Enable detailed logging:
```bash
# In your .env file
DEBUG=true
VERBOSE_LOGGING=true
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## Security Notes

- API tokens are stored securely
- All inputs are sanitized
- HTTPS recommended for production
- Regular security updates applied

## Support

For issues and feature requests:
- Create a GitHub issue
- Include reproduction steps
- Attach relevant logs
docker compose logs --tail 200
```


## License

MIT License - feel free to modify and use as needed.
