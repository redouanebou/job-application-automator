document.addEventListener('DOMContentLoaded', () => {
  const dataDisplayArea = document.getElementById('data-display-area');
  const controlsContainer = document.getElementById('controls-container');

  const showMessage = (message, type = 'default') => {
      dataDisplayArea.innerHTML = ''; 
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
  if(controlsContainer) controlsContainer.innerHTML = ''; 

  chrome.storage.local.get(['scrapedData'], (result) => {
    if (chrome.runtime.lastError) {
      console.error("[data_display.js] Error loading data:", chrome.runtime.lastError.message);
      showMessage('Error loading data. Check the console for details.', 'error');
      return;
    }

    const scrapedData = result.scrapedData;
    console.log("[data_display.js] Retrieved data:", scrapedData);

    if (scrapedData && scrapedData.length > 0) {
      dataDisplayArea.innerHTML = ''; 
      if(controlsContainer) controlsContainer.innerHTML = ''; 

      const tableWrapper = document.createElement('div');
      tableWrapper.className = 'table-responsive-wrapper';

      const table = document.createElement('table');
      table.className = 'data-table';

      const thead = table.createTHead();
      const headerRow = thead.insertRow();
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
      });

      tableWrapper.appendChild(table);
      dataDisplayArea.appendChild(tableWrapper);

      const downloadCsvButton = createButton('Download Data (CSV)', 'btn-green', () => {
          const csvData = convertToCSV(scrapedData); 
          const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'gastrojobs_scraped_data.csv'; 
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
      });
      if(controlsContainer) controlsContainer.appendChild(downloadCsvButton);

    } else {
      showMessage('No data collected yet. Start scraping to see results.');
      if(controlsContainer) controlsContainer.innerHTML = ''; 
    }
  });
});

function convertToCSV(data) {
  const csvHeaders = ["Company Name", "Person Name", "Email"];
  const csvRows = [];
  csvRows.push(csvHeaders.join(','));

  for (const item of data) {
    const values = [
      item.companyName || 'N/A',
      item.personName || 'N/A',
      item.email || 'N/A'
    ].map(value => {
      const stringValue = String(value);
      const escapedValue = stringValue.replace(/"/g, '""');
      return `"${escapedValue}"`;
    });
    csvRows.push(values.join(','));
  }
  return csvRows.join('\n');
}

