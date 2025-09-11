document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settingsForm');
    const result = document.getElementById('result');
    const submitBtn = document.querySelector('.submit-btn');
    const loadBtn = document.getElementById('loadSettings');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const leadsList = document.getElementById('leadsList');
    const addLeadBtn = document.getElementById('addLeadBtn');
    const leadNameInput = document.getElementById('leadName');
    const leadAccountIdInput = document.getElementById('leadAccountId');
    const engagementTypesList = document.getElementById('engagementTypesList');
    const engagementTypeSelect = document.getElementById('engagementTypeSelect');
    const engagementTypeConfig = document.getElementById('engagementTypeConfig');
    const tasksList = document.getElementById('tasksList');
    const taskNameInput = document.getElementById('taskName');
    const subtasksInput = document.getElementById('subtasksInput');
    const addTaskBtn = document.getElementById('addTaskBtn');

    // Make these variables and functions global so they can be accessed by window functions
    window.projectLeads = {};
    window.engagementTypes = {};
    window.currentEngagementType = '';
    
    // Make renderTasksList and other needed functions global
    window.renderTasksList = function() {
        if (!tasksList || !window.currentEngagementType) return;
        const tasks = window.engagementTypes[window.currentEngagementType]?.tasks || [];
        if (tasks.length === 0) {
            tasksList.innerHTML = '<div class="help-text">No tasks configured for this engagement type.</div>';
            return;
        }
        tasksList.innerHTML = tasks.map((task, index) => `
            <div class="task-container">
                <div class="task-header" onclick="toggleSettingsTaskSubtasks('settings-task-${index}')">
                    <span class="toggle-icon" id="settings-icon-task-${index}">+</span>
                    <span class="status-label">${task.name}</span>
                    <div class="action-group">
                        <span class="status-value configured">${task.subtasks.length} subtasks</span>
                        <button type="button" data-index="${index}" class="btn-secondary btn-small btn-remove">Remove</button>
                    </div>
                </div>
                <div class="subtasks-container" id="settings-task-${index}" style="display: none;">
                    <div class="subtasks-content">
                        <div class="subtasks-header">
                            <h5>Subtasks for ${task.name}</h5>
                            <button type="button" onclick="addSubtaskToTask(${index})" class="btn-secondary btn-small btn-add">+ Add Subtask</button>
                        </div>
                        <div class="subtasks-list">
                            ${task.subtasks.map((subtask, subtaskIndex) => `
                                <div class="subtask-item">
                                    <span>${subtask}</span>
                                    <button type="button" onclick="removeSubtaskFromTask(${index}, ${subtaskIndex})" class="btn-secondary btn-small btn-remove">Remove</button>
                                </div>
                            `).join('')}
                            ${task.subtasks.length === 0 ? '<div class="no-subtasks">No subtasks configured</div>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        tasksList.querySelectorAll('button[data-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the expand/collapse
                const index = parseInt(btn.getAttribute('data-index'));
                window.engagementTypes[window.currentEngagementType].tasks.splice(index, 1);
                window.renderTasksList();
            });
        });
    };

    window.renderEngagementTypesList = function() {
        if (!engagementTypesList) return;
        const types = Object.keys(window.engagementTypes).sort();
        if (types.length === 0) {
            engagementTypesList.innerHTML = '<div class="help-text">No engagement types configured.</div>';
            return;
        }
        engagementTypesList.innerHTML = types.map(type => {
            const taskCount = window.engagementTypes[type].tasks ? window.engagementTypes[type].tasks.length : 0;
            return `
                <div class="status-item">
                    <span class="status-label">${type}</span>
                    <span class="status-value configured">${taskCount} tasks</span>
                    <button type="button" data-type="${type}" class="btn-secondary btn-small">Remove</button>
                </div>
            `;
        }).join('');
    };

    // Function to save settings to server
    window.saveSettings = async function() {
        try {
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    engagementTypes: window.engagementTypes
                })
            });

            if (!response.ok) {
                throw new Error('Failed to save settings');
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Error saving settings:', error);
            throw error;
        }
    };

    // Function to automatically refresh settings
    async function refreshSettings() {
        await loadCurrentSettings();
        if (window.currentEngagementType) {
            renderTasksList();
        }
    }

    // Load current settings on page load
    refreshSettings();

    // Load settings button
    loadBtn.addEventListener('click', refreshSettings);

    // Form submission
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        result.style.display = 'none';

        try {
            // Get form data
            const formData = new FormData(form);
            let jiraDomain = formData.get('jiraDomain').trim();
            
            // Clean the domain input
            if (jiraDomain.startsWith('https://')) {
                jiraDomain = jiraDomain.replace('https://', '');
            }
            if (jiraDomain.startsWith('http://')) {
                jiraDomain = jiraDomain.replace('http://', '');
            }
            if (jiraDomain.endsWith('.atlassian.net')) {
                jiraDomain = jiraDomain.replace('.atlassian.net', '');
            }
            if (jiraDomain.endsWith('/')) {
                jiraDomain = jiraDomain.slice(0, -1);
            }
            
            const data = {
                jiraDomain: jiraDomain,
                jiraEmail: formData.get('jiraEmail'),
                jiraApiToken: formData.get('jiraApiToken'),
                jiraProjectKey: formData.get('jiraProjectKey'),
                projectLeads: projectLeads,
                engagementTypes: engagementTypes
            };

            // Send settings to server
            const response = await fetch('/api/settings', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (response.ok) {
                showResult('success', 'Settings saved successfully!', responseData);
                updateConfigStatus(data);
            } else {
                showResult('error', 'Failed to save settings', responseData);
            }

        } catch (error) {
            console.error('Error:', error);
            showResult('error', 'An error occurred', { error: error.message });
        } finally {
            // Hide loading state
            submitBtn.disabled = false;
            submitBtn.classList.remove('loading');
        }
    });

    async function loadCurrentSettings() {
        try {
            const response = await fetch('/api/settings');
            const settings = await response.json();

            // Populate form fields
            document.getElementById('jiraDomain').value = settings.jiraDomain || '';
            document.getElementById('jiraEmail').value = settings.jiraEmail || '';
            document.getElementById('jiraProjectKey').value = settings.jiraProjectKey || '';

            // Don't populate sensitive fields, but show status
            updateConfigStatus(settings);

            // Project leads
            window.projectLeads = settings.projectLeads || {};
            renderLeadsList();

            // Engagement types
            window.engagementTypes = settings.engagementTypes || {};
            renderEngagementTypesList();
            populateEngagementTypeSelect();

            showResult('success', 'Current settings loaded', { 
                message: 'Settings loaded successfully. Sensitive fields are not displayed for security.' 
            });

        } catch (error) {
            console.error('Error loading settings:', error);
            showResult('error', 'Failed to load settings', { error: error.message });
        }
    }

    function updateConfigStatus(settings) {
        const statusElements = {
            jiraDomain: document.getElementById('jiraDomainStatus'),
            jiraEmail: document.getElementById('jiraEmailStatus'),
            jiraApiToken: document.getElementById('jiraApiTokenStatus'),
            jiraProjectKey: document.getElementById('jiraProjectKeyStatus')
        };

        // Update Jira Domain status
        if (settings.jiraDomain) {
            statusElements.jiraDomain.textContent = 'Configured';
            statusElements.jiraDomain.className = 'status-value configured';
        } else {
            statusElements.jiraDomain.textContent = 'Not configured';
            statusElements.jiraDomain.className = 'status-value not-configured';
        }

        // Update Jira Email status
        if (settings.jiraEmail) {
            statusElements.jiraEmail.textContent = 'Configured';
            statusElements.jiraEmail.className = 'status-value configured';
        } else {
            statusElements.jiraEmail.textContent = 'Not configured';
            statusElements.jiraEmail.className = 'status-value not-configured';
        }

        // Update API Token status
        if (settings.hasJiraApiToken) {
            statusElements.jiraApiToken.textContent = 'Configured';
            statusElements.jiraApiToken.className = 'status-value configured';
        } else {
            statusElements.jiraApiToken.textContent = 'Not configured';
            statusElements.jiraApiToken.className = 'status-value not-configured';
        }

        // Update Project Key status
        if (settings.jiraProjectKey) {
            statusElements.jiraProjectKey.textContent = 'Configured';
            statusElements.jiraProjectKey.className = 'status-value configured';
        } else {
            statusElements.jiraProjectKey.textContent = 'Not configured';
            statusElements.jiraProjectKey.className = 'status-value not-configured';
        }
    }

    function showResult(type, message, data) {
        result.className = `result ${type}`;
        result.innerHTML = `
            <div><strong>${message}</strong></div>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
        result.style.display = 'block';
        
        // Scroll to result
        result.scrollIntoView({ behavior: 'smooth' });
    }

    function renderLeadsList() {
        if (!leadsList) return;
        const names = Object.keys(projectLeads).sort();
        if (names.length === 0) {
            leadsList.innerHTML = '<div class="help-text">No project leads configured.</div>';
            return;
        }
        leadsList.innerHTML = names.map(name => `
            <div class="status-item">
                <span class="status-label">${name}</span>
                <span class="status-value configured">${projectLeads[name]}</span>
                <button type="button" data-name="${name}" class="btn-secondary btn-small">Remove</button>
            </div>
        `).join('');
        leadsList.querySelectorAll('button[data-name]').forEach(btn => {
            btn.addEventListener('click', () => {
                const n = btn.getAttribute('data-name');
                delete projectLeads[n];
                renderLeadsList();
            });
        });
    }

    if (addLeadBtn) {
        addLeadBtn.addEventListener('click', () => {
            const name = (leadNameInput.value || '').trim();
            const accountId = (leadAccountIdInput.value || '').trim();
            if (!name || !accountId) {
                showResult('error', 'Name and Account ID are required', {});
                return;
            }
            projectLeads[name] = accountId;
            leadNameInput.value = '';
            leadAccountIdInput.value = '';
            renderLeadsList();
            showResult('success', 'Lead added/updated (remember to Save Settings)', {});
        });
    }

    // Engagement type management
    function renderEngagementTypesList() {
        if (!engagementTypesList) return;
        const types = Object.keys(engagementTypes).sort();
        if (types.length === 0) {
            engagementTypesList.innerHTML = '<div class="help-text">No engagement types configured.</div>';
            return;
        }
        engagementTypesList.innerHTML = types.map(type => {
            const taskCount = engagementTypes[type].tasks ? engagementTypes[type].tasks.length : 0;
            return `
                <div class="status-item">
                    <span class="status-label">${type}</span>
                    <span class="status-value configured">${taskCount} tasks</span>
                    <button type="button" data-type="${type}" class="btn-secondary btn-small">Remove</button>
                </div>
            `;
        }).join('');
        
        engagementTypesList.querySelectorAll('button[data-type]').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-type');
                delete engagementTypes[type];
                renderEngagementTypesList();
                populateEngagementTypeSelect();
            });
        });
    }

    function populateEngagementTypeSelect() {
        if (!engagementTypeSelect) return;
        engagementTypeSelect.innerHTML = '<option value="">Select an engagement type to configure</option>';
        Object.keys(engagementTypes).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            engagementTypeSelect.appendChild(option);
        });
    }

    if (engagementTypeSelect) {
        engagementTypeSelect.addEventListener('change', (e) => {
            currentEngagementType = e.target.value;
            if (currentEngagementType) {
                engagementTypeConfig.style.display = 'block';
                renderTasksList();
            } else {
                engagementTypeConfig.style.display = 'none';
            }
        });
    }

    function renderTasksList() {
        if (!tasksList || !currentEngagementType) return;
        const tasks = engagementTypes[currentEngagementType]?.tasks || [];
        if (tasks.length === 0) {
            tasksList.innerHTML = '<div class="help-text">No tasks configured for this engagement type.</div>';
            return;
        }
        tasksList.innerHTML = tasks.map((task, index) => `
            <div class="task-container" style="background: #2d2d2d; border-radius: 6px; border: 1px solid #1a1a1a overflow: hidden; margin-bottom: 8px;">
                <div class="task-header" style="display: flex; align-items: center; gap: 10px; padding: 12px; cursor: pointer; background: #2d2d2d; border:1px solid #1a1a1a;" onclick="toggleSettingsTaskSubtasks('settings-task-${index}')">
                    <span class="toggle-icon" id="settings-icon-task-${index}" style="font-size: 1.2rem; color: #6b7280; transition: transform 0.2s ease;">+</span>
                    <span class="status-label" style="flex: 1;">${task.name}</span>
                    <span class="status-value configured" style="background: #2d2d2d; color: #ffffff; padding: 2px 5px; border-radius: 4px; font-size: 0.8rem;">${task.subtasks.length} subtasks</span>
                    <button type="button" data-index="${index}" class="btn-secondary btn-small" style="background: #ef4444; color: white;">Remove</button>
                </div>
                <div class="subtasks-container" id="settings-task-${index}" style="display: none; border-top: 1px solid #363636;">
                    <div style="padding: 12px; background: #363636;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                            <h5 style="margin: 0; color: #ffffff; font-size: 0.9rem;">Subtasks for ${task.name}</h5>
                            <button type="button" onclick="addSubtaskToTask(${index})" style="background: #10b981; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; cursor: pointer;">+ Add Subtask</button>
                        </div>
                        <div class="subtasks-list" style="display: grid; gap: 6px;">
                            ${task.subtasks.map((subtask, subtaskIndex) => `
                                <div class="subtask-item" style="display: flex; align-items: center; gap: 8px; padding: 8px; background: #2d2d2d; border-radius: 4px; border: 1px solid #2d2d2d;">
                                    <span style="flex: 1; font-size: 0.9rem;">${subtask}</span>
                                    <button type="button" onclick="removeSubtaskFromTask(${index}, ${subtaskIndex})" style="background: #ef4444; color: white; border: none; padding: 2px 6px; border-radius: 3px; font-size: 0.7rem; cursor: pointer;">Remove</button>
                                </div>
                            `).join('')}
                            ${task.subtasks.length === 0 ? '<div style="padding: 20px; text-align: center; color: #6b7280; font-style: italic; font-size: 0.9rem;">No subtasks configured</div>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        
        tasksList.querySelectorAll('button[data-index]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the expand/collapse
                const index = parseInt(btn.getAttribute('data-index'));
                engagementTypes[currentEngagementType].tasks.splice(index, 1);
                renderTasksList();
            });
        });
    }

    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', () => {
            const taskName = (taskNameInput.value || '').trim();
            const subtasksText = (subtasksInput.value || '').trim();
            if (!taskName || !subtasksText) {
                showResult('error', 'Task name and subtasks are required', {});
                return;
            }
            
            if (!currentEngagementType) {
                showResult('error', 'Please select an engagement type first', {});
                return;
            }
            
            if (!engagementTypes[currentEngagementType]) {
                engagementTypes[currentEngagementType] = { tasks: [] };
            }
            
            const subtasks = subtasksText.split(',').map(s => s.trim()).filter(s => s);
            engagementTypes[currentEngagementType].tasks.push({
                name: taskName,
                subtasks: subtasks
            });
            
            taskNameInput.value = '';
            subtasksInput.value = '';
            renderTasksList();
            renderEngagementTypesList();
            showResult('success', 'Task added (remember to Save Settings)', {});
        });
    }
});

// Global functions for settings page task management
window.toggleSettingsTaskSubtasks = function(taskId) {
    const container = document.getElementById(taskId);
    const icon = document.getElementById('settings-icon-' + taskId);
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        icon.textContent = '−';
        icon.style.transform = 'rotate(0deg)';
    } else {
        container.style.display = 'none';
        icon.textContent = '+';
        icon.style.transform = 'rotate(0deg)';
    }
};

window.addSubtaskToTask = function(taskIndex) {
    // Create modal HTML
    const modalHTML = `
        <div id="subtaskModal" class="modal" style="display: block; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000;">
            <div class="modal-content" style="background: #2d2d2d; margin: 15% auto; padding: 20px; width: 80%; max-width: 500px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h3 style="margin-top: 0;">Add Subtasks</h3>
                <div id="subtasksList" style="margin: 15px 0; max-height: 300px; overflow-y: auto;">
                    <div class="subtask-input-row" style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <input type="text" class="subtask-input" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Enter subtask name">
                    </div>
                </div>
                <button onclick="addNewSubtaskRow()" style="background: #10b981; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-right: 10px; cursor: pointer;">
                    Add Another
                </button>
                <div style="margin-top: 20px; text-align: right;">
                    <button onclick="closeSubtaskModal()" style="background: #ef4444; color: white; border: none; padding: 8px 16px; border-radius: 4px; margin-right: 10px; cursor: pointer;">
                        Cancel
                    </button>
                    <button onclick="saveSubtasks(${taskIndex})" style="background: #3b82f6; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer;">
                        Save Subtasks
                    </button>
                </div>
            </div>
        </div>
    `;

    // Add modal to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer);

    // Focus first input
    setTimeout(() => {
        document.querySelector('.subtask-input').focus();
    }, 100);
};

window.addNewSubtaskRow = function() {
    const subtasksList = document.getElementById('subtasksList');
    const newRow = document.createElement('div');
    newRow.className = 'subtask-input-row';
    newRow.style = 'display: flex; gap: 10px; margin-bottom: 10px;';
    newRow.innerHTML = `
        <input type="text" class="subtask-input" style="flex: 1; padding: 8px; border: 1px solid #ddd; border-radius: 4px;" placeholder="Enter subtask name">
        <button onclick="this.parentElement.remove()" style="background: #ef4444; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">
            ✕
        </button>
    `;
    subtasksList.appendChild(newRow);
    newRow.querySelector('.subtask-input').focus();
};

window.closeSubtaskModal = function() {
    const modal = document.getElementById('subtaskModal');
    if (modal) {
        modal.parentElement.remove();
    }
};

window.saveSubtasks = async function(taskIndex) {
    const inputs = document.querySelectorAll('.subtask-input');
    const subtasks = Array.from(inputs)
        .map(input => input.value.trim())
        .filter(value => value !== '');

    if (subtasks.length === 0) {
        showResult('error', 'Please enter at least one subtask', {});
        return;
    }

    if (!window.engagementTypes[window.currentEngagementType]) {
        window.engagementTypes[window.currentEngagementType] = { tasks: [] };
    }

    if (!window.engagementTypes[window.currentEngagementType].tasks[taskIndex]) {
        showResult('error', 'Task not found', {});
        return;
    }

    try {
        // Add the new subtasks to our local state
        window.engagementTypes[window.currentEngagementType].tasks[taskIndex].subtasks.push(...subtasks);
        
        // Close modal
        closeSubtaskModal();
        
        // Save to server
        await window.saveSettings();
        
        // Update UI
        window.renderTasksList();
        window.renderEngagementTypesList();
        
        // Show success message
        showResult('success', `${subtasks.length} subtask(s) added successfully`, {});
    } catch (error) {
        console.error('Error saving subtasks:', error);
        showResult('error', 'Failed to save subtasks: ' + error.message, {});
    }
};

window.removeSubtaskFromTask = async function(taskIndex, subtaskIndex) {
    if (!confirm('Are you sure you want to remove this subtask?')) {
        return;
    }

    try {
        // Store the current state in case we need to rollback
        const previousState = JSON.parse(JSON.stringify(window.engagementTypes));
        
        // Remove the subtask immediately from local state
        window.engagementTypes[window.currentEngagementType].tasks[taskIndex].subtasks.splice(subtaskIndex, 1);
        
        // Update UI immediately
        renderTasksList();
        
        // Save to server
        const saveResponse = await fetch('/api/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                engagementTypes: window.engagementTypes
            })
        });

        if (!saveResponse.ok) {
            // If save failed, rollback to previous state
            window.engagementTypes = previousState;
            renderTasksList();
            throw new Error('Failed to save changes');
        }

        // Show success message
        showResult('success', 'Subtask removed successfully', {});
    } catch (error) {
        console.error('Error removing subtask:', error);
        showResult('error', 'Failed to remove subtask: ' + error.message, {});
    }
};
