document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('enabled-toggle');
    const statusText = document.getElementById('status-text');

    // Load saved state
    chrome.storage.sync.get(['enabled'], (result) => {
        const isEnabled = result.enabled ?? false; // Default to false
        toggle.checked = isEnabled;
        updateStatusText(isEnabled);
    });

    // Listen for changes
    toggle.addEventListener('change', () => {
        const isEnabled = toggle.checked;
        chrome.storage.sync.set({ enabled: isEnabled }, () => {
            updateStatusText(isEnabled);
        });
    });

    function updateStatusText(enabled) {
        statusText.textContent = enabled ? 'Active' : 'Disabled';
        statusText.style.color = enabled ? '#2563eb' : '#666';
    }
});
