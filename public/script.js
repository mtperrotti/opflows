document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('webhookForm');
    const result = document.getElementById('result');
    const submitBtn = document.querySelector('.submit-btn');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');
    const projectLeadSelect = document.getElementById('projectLeadSelect');

    // Load project leads from server settings
    let projectLeadDirectory = {};
    async function loadProjectLeads() {
        try {
            const res = await fetch('/api/settings');
            const json = await res.json();
            projectLeadDirectory = json.projectLeads || {};
            populateProjectLeadOptions();
        } catch (e) {
            console.error('Failed to load project leads:', e);
        }
    }

    // Populate dropdown
    function populateProjectLeadOptions() {
        projectLeadSelect.innerHTML = '';
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'Select a project lead';
        placeholder.disabled = true;
        placeholder.selected = true;
        projectLeadSelect.appendChild(placeholder);

        Object.keys(projectLeadDirectory).forEach(name => {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = name;
            projectLeadSelect.appendChild(opt);
        });
    }
    loadProjectLeads();

    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        // Show loading state
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
        result.style.display = 'none';

        try {
            // Get form data
            const formData = new FormData(form);
            const selectedProjectLeadName = projectLeadSelect ? projectLeadSelect.value : '';
            const selectedProjectLeadAccountId = selectedProjectLeadName ? projectLeadDirectory[selectedProjectLeadName] : '';

            const data = {
                clientName: formData.get('clientName'),
                opName: formData.get('opName'),
                opPhases: formData.getAll('opPhases'),
                projectLead: selectedProjectLeadName || '',
                projectLeadAccountId: selectedProjectLeadAccountId || '',
                pointOfContact: formData.get('pointOfContact') || '',
                startDate: formData.get('startDate') || '',
                endDate: formData.get('endDate') || ''
            };

            // Validate required fields
            if (!data.clientName || !data.opName) {
                throw new Error('Please fill in all required fields');
            }

            // Send Jira API request
            const response = await fetch('/create-jira-issues', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (response.ok) {
                showResult('success', 'Jira issues created successfully!', responseData);
                form.reset(); // Clear form on success
            } else {
                showResult('error', 'Failed to create Jira issues', responseData);
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

    function showResult(type, message, data) {
        result.className = `result ${type}`;
        
        let content = `<div><strong>${message}</strong></div>`;
        
        if (type === 'success' && data.results) {
            // Debug: Log the data to console
            console.log('Success data:', data);
            console.log('Subtasks:', data.results.subtasks);
            
            // Only show debug info
            content += `
                <div style="margin-top: 20px; background: #f3f4f6; border: 1px solid #d1d5db; border-radius: 8px; padding: 15px;">
                    <h4 style="color: #374151; margin-bottom: 10px;">🔍 Debug Info</h4>
                    <pre style="background: white; padding: 10px; border-radius: 4px; overflow-x: auto; font-size: 0.8rem;">${JSON.stringify(data, null, 2)}</pre>
                </div>
            `;
        } else {
            // Fallback to JSON display for errors or other cases
            content += `<pre style="margin-top: 15px; background: #f9fafb; padding: 15px; border-radius: 6px; overflow-x: auto;">${JSON.stringify(data, null, 2)}</pre>`;
        }
        
        result.innerHTML = content;
        result.style.display = 'block';
        
        // Scroll to result
        result.scrollIntoView({ behavior: 'smooth' });
    }

    // Add some interactivity to checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', function() {
            const label = this.closest('.checkbox-label');
            if (this.checked) {
                label.style.backgroundColor = '#2d2d2d';
            } else {
                label.style.backgroundColor = '';
            }
        });
    });
});

// Global functions for task management
window.toggleTaskSubtasks = function(taskId) {
    const container = document.getElementById(taskId);
    const icon = document.getElementById('icon-' + taskId);
    
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

window.addSubtask = async function(parentTaskKey, phase) {
    const subtaskName = prompt('Enter subtask name:');
    if (!subtaskName) return;
    
    try {
        const response = await fetch('/add-subtask', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                parentTaskKey: parentTaskKey,
                subtaskName: subtaskName,
                phase: phase
            })
        });

        const responseData = await response.json();

        if (response.ok) {
            alert(`Successfully created subtask: ${responseData.subtask.key}`);
            // Refresh the page to show the new subtask
            location.reload();
        } else {
            alert(`Failed to create subtask: ${responseData.error}`);
        }
    } catch (error) {
        console.error('Error creating subtask:', error);
        alert('An error occurred while creating the subtask');
    }
};

window.removeSubtask = async function(subtaskKey) {
    if (confirm(`Are you sure you want to complete subtask ${subtaskKey}?`)) {
        try {
            const response = await fetch(`/remove-subtask/${subtaskKey}`, {
                method: 'DELETE'
            });

            const responseData = await response.json();

            if (response.ok) {
                alert(`Successfully completed subtask: ${subtaskKey}`);
                // Refresh the page to update the display
                location.reload();
            } else {
                alert(`Failed to complete subtask: ${responseData.error}`);
            }
        } catch (error) {
            console.error('Error completing subtask:', error);
            alert('An error occurred while completing the subtask');
        }
    }
};

window.addEventListener("DOMContentLoaded" , () => {
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
});
