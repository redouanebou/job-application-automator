document.addEventListener('DOMContentLoaded', () => {
  const dataDisplayArea = document.getElementById('data-display-area');
  const controlsContainer = document.getElementById('controls-container');

  const showMessage = (message, type = 'default') => {
      dataDisplayArea.innerHTML = ''; // Clear previous content
      const messageP = document.createElement('p');
      messageP.className = 'message-area';
      if (type === 'error') {
          messageP.classList.add('error');
      }
      messageP.textContent = message;
      dataDisplayArea.appendChild(messageP);
  };

  const createButton = (text, btnClass, clickHandler) => {
      const button = document.createElement('button');
      button.className = `btn ${btnClass}`;
      button.textContent = text;
      button.addEventListener('click', clickHandler);
      return button;
  };

  showMessage("Loading data, please wait...");
  if(controlsContainer) controlsContainer.innerHTML = ''; // Clear controls while loading

  chrome.storage.local.get(['scrapedData'], (result) => {
    if (chrome.runtime.lastError) {
      console.error("[data_display.js] Error loading data:", chrome.runtime.lastError.message);
      showMessage('Error loading data. Check the console for details.', 'error');
      return;
    }

    const scrapedData = result.scrapedData;
    console.log("[data_display.js] Retrieved data:", scrapedData);

    if (scrapedData && scrapedData.length > 0) {
      dataDisplayArea.innerHTML = ''; // Clear loading message
      if(controlsContainer) controlsContainer.innerHTML = ''; // Clear and prepare for new buttons

      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'table-responsive-wrapper';

      const table = document.createElement('table');
      table.className = 'data-table';

      const thead = table.createTHead();
      const headerRow = thead.insertRow();
      // Updated headers for display: Company Name, Person Name, Email (Error column removed)
      const displayHeaders = ["Company Name", "Person Name", "Email"];
      displayHeaders.forEach(text => {
        const th = document.createElement('th');
        th.textContent = text;
        headerRow.appendChild(th);
      });

      const tbody = table.createTBody();
      scrapedData.forEach((entry) => {
        const row = tbody.insertRow();
        row.insertCell().textContent = entry.companyName || 'N/A';
        row.insertCell().textContent = entry.personName || 'N/A';
        
        const emailCell = row.insertCell();
        if (entry.email && entry.email !== 'N/A' && entry.email !== 'Error') {
            const mailLink = document.createElement('a');
            mailLink.href = `mailto:${entry.email}`;
            mailLink.textContent = entry.email;
            emailCell.appendChild(mailLink);
        } else {
            emailCell.textContent = entry.email || 'N/A';
        }
        // Error column display logic removed from here
        // if (entry.error) {
        //     row.title = `Error: ${entry.error}`; // Tooltip for error
        // }
      });

      tableWrapper.appendChild(table);
      dataDisplayArea.appendChild(tableWrapper);

      // Add Download CSV button
      const downloadCsvButton = createButton('Download Data (CSV)', 'btn-green', () => {
          const csvData = convertToCSV(scrapedData); // convertToCSV will use the updated headers
          const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'gastrojobs_scraped_data.csv'; // Filename for Gastrojobs
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      });
      if(controlsContainer) controlsContainer.appendChild(downloadCsvButton);

    } else {
      showMessage('No data collected yet. Start scraping to see results.');
      if(controlsContainer) controlsContainer.innerHTML = ''; // No data, no download buttons
    }
  });
});

// Function to convert data to CSV (Updated to remove Error column)
function convertToCSV(data) {
  // Updated CSV headers: Company Name, Person Name, Email (Error column removed)
  const csvHeaders = ["Company Name", "Person Name", "Email"];
  const csvRows = [];
  csvRows.push(csvHeaders.join(','));

  for (const item of data) {
    const values = [
      item.companyName || 'N/A',
      item.personName || 'N/A',
      item.email || 'N/A'
      // item.error || '' // Error data removed from CSV export
    ].map(value => {
      const stringValue = String(value);
      // Escape double quotes by doubling them, and enclose in double quotes
      const escapedValue = stringValue.replace(/"/g, '""');
      return `"${escapedValue}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}
