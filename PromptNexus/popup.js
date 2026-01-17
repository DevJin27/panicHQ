document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('enabled-toggle');
    const statusText = document.getElementById('status-text');
    const apiUrlInput = document.getElementById('api-url');
    const saveApiBtn = document.getElementById('save-api');
    const saveStatus = document.getElementById('save-status');

    // Load saved state
    chrome.storage.sync.get(['enabled', 'apiUrl'], (result) => {
        const isEnabled = result.enabled ?? false;
        toggle.checked = isEnabled;
        updateStatusText(isEnabled);

        if (result.apiUrl) {
            apiUrlInput.value = result.apiUrl;
        }
    });

    // Listen for toggle changes
    toggle.addEventListener('change', () => {
        const isEnabled = toggle.checked;
        chrome.storage.sync.set({ enabled: isEnabled }, () => {
            updateStatusText(isEnabled);
        });
    });

    // Save API URL
    saveApiBtn.addEventListener('click', () => {
        const apiUrl = apiUrlInput.value.trim();

        if (!apiUrl) {
            showSaveStatus('Please enter a URL', false);
            return;
        }

        chrome.storage.sync.set({ apiUrl: apiUrl }, () => {
            showSaveStatus('Saved!', true);
        });
    });

    function updateStatusText(enabled) {
        statusText.textContent = enabled ? 'Active' : 'Disabled';
        statusText.style.color = enabled ? '#2563eb' : '#666';
    }

    function showSaveStatus(message, success) {
        saveStatus.textContent = message;
        saveStatus.style.color = success ? '#10b981' : '#ef4444';
        setTimeout(() => {
            saveStatus.textContent = '';
        }, 2000);
    }
});
