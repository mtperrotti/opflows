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

            // Send webhook request
            const response = await fetch('/send-webhook', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });

            const responseData = await response.json();

            if (response.ok) {
                showResult('success', 'Webhook sent successfully to Jira automation!', responseData);
                form.reset(); // Clear form on success
            } else {
                showResult('error', 'Failed to send webhook to Jira automation', responseData);
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
        result.innerHTML = `
            <div><strong>${message}</strong></div>
            <pre>${JSON.stringify(data, null, 2)}</pre>
        `;
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
                label.style.backgroundColor = '#f0f9ff';
            } else {
                label.style.backgroundColor = '';
            }
        });
    });
});

window.addEventListener("DOMContentLoaded" , () => {
    document.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
});
