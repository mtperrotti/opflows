document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('settingsForm');
    const result = document.getElementById('result');
    const submitBtn = document.querySelector('.submit-btn');
    const loadBtn = document.getElementById('loadSettings');
    const btnText = document.querySelector('.btn-text');
    const btnLoading = document.querySelector('.btn-loading');

    // Load current settings on page load
    loadCurrentSettings();

    // Load settings button
    loadBtn.addEventListener('click', loadCurrentSettings);

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
            const data = {
                webhookUrl: formData.get('webhookUrl'),
                webhookSecret: formData.get('webhookSecret')
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
            document.getElementById('webhookUrl').value = settings.webhookUrl || '';

            // Don't populate sensitive fields, but show status
            updateConfigStatus(settings);

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
            webhookUrl: document.getElementById('webhookUrlStatus'),
            webhookSecret: document.getElementById('webhookSecretStatus')
        };

        // Update Webhook URL status
        if (settings.webhookUrl) {
            statusElements.webhookUrl.textContent = 'Configured';
            statusElements.webhookUrl.className = 'status-value configured';
        } else {
            statusElements.webhookUrl.textContent = 'Not configured';
            statusElements.webhookUrl.className = 'status-value not-configured';
        }

        // Update Webhook Secret status
        if (settings.hasWebhookSecret) {
            statusElements.webhookSecret.textContent = 'Configured';
            statusElements.webhookSecret.className = 'status-value configured';
        } else {
            statusElements.webhookSecret.textContent = 'Not configured';
            statusElements.webhookSecret.className = 'status-value not-configured';
        }

        // No project key in this flow
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
});
