document.addEventListener('DOMContentLoaded', () => {
    const startScrapingButton = document.getElementById('startScraping');
    const stopScrapingButton = document.getElementById('stopScraping');
    const showDataButton = document.getElementById('showData');
    const deleteDataButton = document.getElementById('deleteData'); 
    const statusDiv = document.getElementById('status');

    const setStatus = (message, type = 'default') => {
        if (statusDiv) {
            statusDiv.textContent = message;
            statusDiv.className = 'status-area'; 
            switch (type) {
                case 'info': statusDiv.classList.add('status-info'); break;
                case 'success': statusDiv.classList.add('status-success'); break;
                case 'warning': statusDiv.classList.add('status-warning'); break;
                case 'error': statusDiv.classList.add('status-error'); break;
                default: statusDiv.classList.add('status-default');
            }
        }
    };

    const updateButtonStates = (isScraping) => {
        if (startScrapingButton) startScrapingButton.disabled = isScraping;
        if (stopScrapingButton) stopScrapingButton.disabled = !isScraping;
        if (deleteDataButton) deleteDataButton.disabled = isScraping;
    };

    if (startScrapingButton) {
        startScrapingButton.addEventListener('click', () => {
            updateButtonStates(true);
            setStatus("Sending start request...", 'info');
            chrome.runtime.sendMessage({ action: "startScraping" });
        });
    }

    if (stopScrapingButton) {
        stopScrapingButton.addEventListener('click', () => {
            stopScrapingButton.disabled = true; 
            if(deleteDataButton) deleteDataButton.disabled = true;
            setStatus("Sending stop request...", 'info');
            chrome.runtime.sendMessage({ action: "stopScraping" });
        });
    }

    if (showDataButton) {
        showDataButton.addEventListener('click', () => {
            setStatus("Opening data page...", 'info');
            chrome.runtime.sendMessage({ action: "openDataPage" });
        });
    }

    if (deleteDataButton) {
        deleteDataButton.addEventListener('click', () => {
            setStatus("Requesting data deletion...", 'warning');
            chrome.runtime.sendMessage({ action: "deleteData" }, (response) => {
                if (chrome.runtime.lastError) {
                    setStatus(`Error deleting data: ${chrome.runtime.lastError.message}`, 'error');
                    console.warn("Error response from deleteData:", chrome.runtime.lastError);
                } else if (response && response.status) {
                    setStatus(response.status, response.statusType || 'success');
                } else {
                    setStatus("Data deletion request sent.", 'info'); 
                }
            });
        });
    }

    chrome.runtime.onMessage.addListener((message) => {
        if (message.action === "updateStatus" && typeof message.status !== 'undefined') {
            const statusType = message.statusType || 'default'; 
            console.log(`[popup.js] Status Update: Msg='${message.status}', Type='${statusType}'`);
            setStatus(message.status, statusType);

            if (statusType === 'success' || statusType === 'error' || statusType === 'warning' || message.status.toLowerCase().includes("ready.") || message.status.toLowerCase().includes("data deleted")) {
                updateButtonStates(false);
            } else if (statusType === 'info' && (message.status.toLowerCase().includes("processing") || message.status.toLowerCase().includes("scraping") || message.status.toLowerCase().includes("initializing") || message.status.toLowerCase().includes("navigating") || message.status.toLowerCase().includes("opening"))) {
                updateButtonStates(true);
            }
            if (message.status.toLowerCase().includes("stopping...")) {
                if(stopScrapingButton) stopScrapingButton.disabled = true;
                if(deleteDataButton) deleteDataButton.disabled = true;
            }
        }
    });

    chrome.runtime.sendMessage({ action: "getScraperState" }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn("[popup.js] Error getting scraper state:", chrome.runtime.lastError.message);
        setStatus("Could not get status from background.", "error");
        updateButtonStates(false);
        return;
      }
      if (response && typeof response.isScraping !== 'undefined') {
        updateButtonStates(response.isScraping);
        setStatus(response.currentStatus || "Ready.", response.statusType || 'default');
      } else {
        updateButtonStates(false);
        setStatus("Ready.", 'default');
      }
    });
});

