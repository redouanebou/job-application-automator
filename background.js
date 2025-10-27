const scrapingManager = {
  state: {
    active: false, originalTabId: null, data: [],
    jobUrls: [], processedJobUrls: new Set(), currentPageUrl: null, currentPageIndex: 1,
    jobsProcessedOnCurrentPage: 0, // Index for jobUrls on the current page
    isPaginating: false, // Will effectively be unused or always false after a page
    currentStatus: "Ready.", statusType: "default",
    activeWorkerCount: 0, maxConcurrentWorkers: 2,
    openJobTabIds: new Set()
  },

  startScraping: async function() {
    if (this.state.active) {
      this.sendStatus("Scraping already in progress.", "warning"); return;
    }
    console.log("[background.js] Starting scraping (single page) for Gastrojobs");
    this.state = {
      ...this.state, active: true, data: [], processedJobUrls: new Set(),
      currentPageIndex: 1, jobsProcessedOnCurrentPage: 0, isPaginating: false,
      activeWorkerCount: 0, openJobTabIds: new Set(),
      currentStatus: "Initializing...", statusType: "info"
    };
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found");
      if (!tab.url || !tab.url.startsWith("https://www.gastrojobs.de/")) {
         this.sendStatus("Please navigate to gastrojobs.de search results.", "error");
         this.completeScraping(false); return;
      }
      this.state.originalTabId = tab.id; this.state.currentPageUrl = tab.url;
      console.log(`[bg] Initializing on tab ${tab.id} - URL: ${tab.url}`);
      this.sendStatus(this.state.currentStatus, this.state.statusType);
      this.processListPage(tab.id);
    } catch (e) {
      console.error("[bg] Start scraping failed:", e);
      this.sendStatus(`Start failed: ${e.message}`, "error"); this.completeScraping(false);
    }
  },

  processListPage: async function(tabId) {
      if (!this.state.active) { // Removed isPaginating check as we won't paginate
          console.log("[bg] Skip processListPage: inactive."); return;
      }
      this.sendStatus(`P${this.state.currentPageIndex}: Extracting links...`, "info");
      this.state.jobUrls = []; this.state.jobsProcessedOnCurrentPage = 0;
      try {
         const originalTab = await chrome.tabs.get(tabId).catch(() => null);
         if (!this.state.active) return;
         if (!originalTab || !originalTab.url || !originalTab.url.startsWith("https://www.gastrojobs.de/jobs")) {
             console.warn(`[bg] Original tab ${tabId} no longer valid/navigated away. Stopping.`);
             this.stopScrapingProcess(); return;
         }
         this.state.currentPageUrl = originalTab.url;
         await chrome.scripting.executeScript({ target: {tabId}, files: ['content.js'] })
           .catch(e => console.warn(`[bg] CS inject (list) failed: ${e.message}`));
         if (!this.state.active) return;
         await new Promise(r => setTimeout(r, 700));
         if (!this.state.active) return;
         const result = await chrome.scripting.executeScript({
             target: {tabId},
             func: () => window.gastrojobsScraper?.getJobUrls() || []
         });
         if (!this.state.active) return;
         const newJobUrls = result?.[0]?.result || [];
         console.log(`[bg] P${this.state.currentPageIndex}: Found ${newJobUrls.length} URLs.`);
         this.state.jobUrls = newJobUrls.filter(url => !this.state.processedJobUrls.has(url));
         console.log(`[bg] P${this.state.currentPageIndex}: ${this.state.jobUrls.length} new URLs to process.`);

         if (this.state.jobUrls.length > 0) {
             this.sendStatus(`P${this.state.currentPageIndex}: ${this.state.jobUrls.length} new jobs. Starting workers...`, "info");
             this.manageJobProcessingLoop();
         } else {
             console.log(`[bg] No new URLs on P${this.state.currentPageIndex}. Scraping of this page complete.`);
             this.completeScraping(); // MODIFICATION: No more jobs on this page, complete.
         }
      } catch (e) {
          if (!this.state.active) { console.log("[bg] Error in processListPage, but scraping already stopped."); return; }
          console.error(`[bg] processListPage (P${this.state.currentPageIndex}) error:`, e);
          this.sendStatus(`Error P${this.state.currentPageIndex}: ${e.message}`, "error");
          this.completeScraping(); // MODIFICATION: Error on page, complete.
      }
  },

  manageJobProcessingLoop: async function() {
    if (!this.state.active) { // Removed isPaginating check
        console.log("[bg] manageJobLoop: Not active, exiting.");
        if (this.state.activeWorkerCount === 0) { // Ensure completion if stopped and workers done
             this.completeScraping(false);
        }
        return;
    }

    while (this.state.activeWorkerCount < this.state.maxConcurrentWorkers &&
           this.state.jobsProcessedOnCurrentPage < this.state.jobUrls.length) {
        if (!this.state.active) break;
        const jobUrl = this.state.jobUrls[this.state.jobsProcessedOnCurrentPage];
        this.state.jobsProcessedOnCurrentPage++;
        this.state.activeWorkerCount++;
        console.log(`[bg] Starting worker ${this.state.activeWorkerCount}/${this.state.maxConcurrentWorkers} for: ${jobUrl.substring(0,70)}...`);
        this.processSingleJob(jobUrl)
            .catch(err => {
                console.error(`[bg] Worker for ${jobUrl.substring(0,70)}... unhandled promise rejection:`, err.message);
            })
            .finally(() => {
                if (this.state.activeWorkerCount > 0) this.state.activeWorkerCount--;
                console.log(`[bg] Worker finished/failed. Active workers: ${this.state.activeWorkerCount}`);
                this.manageJobProcessingLoop();
            });
    }

    if (this.state.jobsProcessedOnCurrentPage >= this.state.jobUrls.length &&
        this.state.activeWorkerCount === 0 && 
        this.state.active) { // Removed isPaginating check
        console.log(`[bg] All jobs for P${this.state.currentPageIndex} dispatched and workers idle. Completing.`);
        this.completeScraping(); // MODIFICATION: All jobs on page done, complete.
    }
  },

  processSingleJob: async function(jobUrl) { /* ... (same as v5.1, it's self-contained for one job) ... */
    if (!this.state.active) {
      console.log(`[bg] Worker for ${jobUrl.substring(0,70)}... aborting: scraping inactive (start).`);
      throw new Error("Scraping stopped");
    }
    let tempJobTabId = null;
    const jobUrlShort = jobUrl.substring(0,70) + "...";
    this.sendStatus(`Worker: Opening ${jobUrlShort}`, "info");
    try {
      const tab = await chrome.tabs.create({ url: jobUrl, active: false });
      tempJobTabId = tab.id; this.state.openJobTabIds.add(tempJobTabId);
      console.log(`[bg] Worker opened tab ${tempJobTabId} for ${jobUrlShort}`);
      if (!this.state.active) throw new Error("Scraping stopped after tab create");
      let tabExists = await chrome.tabs.get(tempJobTabId).catch(() => null);
      if (!tabExists) throw new Error(`Tab ${tempJobTabId} gone after creation for ${jobUrlShort}.`);
      await new Promise((resolve, reject) => {
        const listener = (tId, cInfo, uTab) => {
          if (!this.state.active) { chrome.tabs.onUpdated.removeListener(listener); reject(new Error("Scraping stopped during tab load wait")); return; }
          if (tId === tempJobTabId && cInfo.status === 'complete') {
            chrome.tabs.onUpdated.removeListener(listener);
            chrome.tabs.get(tempJobTabId)
                .then(() => { console.log(`[bg] Worker: Tab ${tempJobTabId} 'complete'. URL: ${uTab?.url}`); resolve(); })
                .catch(err => reject(new Error(`Tab ${tempJobTabId} gone: ${err.message}`)));
          }
        };
        chrome.tabs.onUpdated.addListener(listener);
        setTimeout(() => {
          if (!this.state.active) { reject(new Error("Scraping stopped during tab load timeout check")); return; }
          chrome.tabs.onUpdated.removeListener(listener);
          console.warn(`[bg] Worker: Timeout tab ${tempJobTabId} 'complete' for ${jobUrlShort}.`);
          chrome.tabs.get(tempJobTabId).then(resolve).catch(err => reject(new Error(`Tab ${tempJobTabId} gone after timeout: ${err.message}`)));
        }, 20000);
      });
      if (!this.state.active) throw new Error("Scraping stopped after tab load");
      tabExists = await chrome.tabs.get(tempJobTabId).catch(() => null);
      if (!tabExists) throw new Error(`Tab ${tempJobTabId} gone before CS inject for ${jobUrlShort}.`);
      console.log(`[bg] Worker: Injecting CS into tab ${tempJobTabId}.`);
      await chrome.scripting.executeScript({target:{tabId:tempJobTabId}, files:['content.js']});
      if (!this.state.active) throw new Error("Scraping stopped after CS inject");
      await new Promise(r => setTimeout(r, 500));
      if (!this.state.active) throw new Error("Scraping stopped before data extraction");
      tabExists = await chrome.tabs.get(tempJobTabId).catch(() => null);
      if (!tabExists) throw new Error(`Tab ${tempJobTabId} gone before data extraction for ${jobUrlShort}.`);
      console.log(`[bg] Worker: Extracting data from tab ${tempJobTabId}.`);
      const result = await chrome.scripting.executeScript({ target:{tabId:tempJobTabId}, func: () => window.gastrojobsScraper?.extractData() });
      if (!this.state.active && result?.[0]?.result?.error !== "Scraping stopped") { /* Handled by throw */ }
      const data = result?.[0]?.result;
      if (this.state.active) {
        if (data && data.email && data.email !== 'N/A' && data.email !== 'Error') {
          this.state.data.push(data); this.sendStatus(`Worker: Data from ${jobUrlShort} collected.`, "info");
        } else { this.sendStatus(`Worker: No email from ${jobUrlShort}.`, "info"); }
      }
    } catch (e) {
      console.error(`[bg] Worker for ${jobUrlShort} process error:`, e.message);
      if (this.state.active || e.message !== "Scraping stopped") {
          this.sendStatus(`Worker: Fail ${jobUrlShort.substring(0,20)}: ${e.message?.substring(0,30)}`, "error");
      }
      throw e;
    } finally {
      if (tempJobTabId) {
        this.state.openJobTabIds.delete(tempJobTabId);
        const finalTabCheck = await chrome.tabs.get(tempJobTabId).catch(() => null);
        if (finalTabCheck) {
            try { await chrome.tabs.remove(tempJobTabId); console.log(`[bg] Worker closed tab ${tempJobTabId}.`); }
            catch (removeError) { console.warn(`[bg] Worker: Fail close tab ${tempJobTabId}: ${removeError.message}`); }
        } else { console.log(`[bg] Worker: Tab ${tempJobTabId} already gone (finally).`); }
      }
    }
  },

  attemptPagination: async function(tabId) {
    // This function will now effectively do nothing or just complete scraping
    // as per the user's request to not go to the next page.
    console.log("[bg] attemptPagination called, but pagination is disabled. Completing scraping.");
    this.state.isPaginating = false; // Ensure this is set
    this.completeScraping();
  },

  stopScrapingProcess: async function() { /* ... (same as v5.1) ... */
    if (!this.state.active && this.state.activeWorkerCount === 0) {
      this.sendStatus("No active scraping to stop.", "info"); return;
    }
    console.log("[bg] Stopping scraping process (v5.2)...");
    const wasActive = this.state.active;
    this.state.active = false; this.state.isPaginating = false;
    if (wasActive) { this.sendStatus("Stopping... please wait for active jobs to finish or be closed.", "warning");}
    const closePromises = []; const tabsToClose = new Set(this.state.openJobTabIds);
    for (const tabId of tabsToClose) {
        console.log(`[bg] Attempting to close worker tab ${tabId} due to stop request.`);
        closePromises.push( chrome.tabs.remove(tabId).then(() => this.state.openJobTabIds.delete(tabId)).catch(e => console.warn(`[bg] Error closing tab ${tabId} on stop: ${e.message}`)) );
    }
    try { await Promise.allSettled(closePromises); } catch (e) { console.warn("[bg] Error during Promise.allSettled for tab closing:", e); }
    this.state.openJobTabIds.clear(); this.state.activeWorkerCount = 0;
    setTimeout(() => {
        if (this.state.currentStatus !== "Scraping stopped by user." && !this.state.currentStatus.startsWith("Finished.")) {
            this.sendStatus("Scraping stopped by user.", "warning"); this.completeScraping(false);
        }
    }, 1500);
  },

  completeScraping: function(openDisplay = true) { /* ... (same as v5.1) ... */
    const wasActiveOrWorkers = this.state.active || this.state.activeWorkerCount > 0;
    this.state.active = false; this.state.isPaginating = false;
    this.state.activeWorkerCount = 0; this.state.openJobTabIds.clear();
    const meaningfullyStarted = wasActiveOrWorkers || this.state.data.length > 0 || this.state.currentPageIndex > 0 || this.state.jobsProcessedOnCurrentPage > 0; // currentPageIndex > 0 is always true if started
    if (!meaningfullyStarted && !openDisplay) {
      console.log("[bg] Scraping stopped very early or did not collect data.");
      if (!this.state.currentStatus.startsWith("Finished") && !this.state.currentStatus.includes("stopped by user")) { this.sendStatus("Scraping process ended.", "info"); }
    } else {
      const count = this.state.data.length;
      // currentPageIndex will remain 1 if pagination is disabled
      const msg = `Finished. Collected ${count} entries (email) from page ${this.state.currentPageIndex}.`;
      console.log(`[bg] ${msg}`);
      if (!this.state.currentStatus.includes("stopped by user")) { this.sendStatus(msg, "success"); }
    }
    chrome.storage.local.set({scrapedData: this.state.data}, () => {
      if (chrome.runtime.lastError) { console.error("[bg] Data save failed:", chrome.runtime.lastError); this.sendStatus("Data save failed", "error"); }
      else console.log("[bg] Data saved.");
      if (openDisplay && this.state.data.length > 0) this.openDataDisplayPage();
      else if (openDisplay && this.state.data.length === 0 && meaningfullyStarted) {
          if (!this.state.currentStatus.includes("stopped by user")) { this.sendStatus("Finished. No data with email collected from this page.", "info"); }
      }
    });
  },

  openDataDisplayPage: function() { /* ... (same as v5.1) ... */
    const url = chrome.runtime.getURL('data_display.html');
    chrome.tabs.query({url}, (tabs) => {
      if (tabs.length > 0) { chrome.tabs.update(tabs[0].id, {active:true}); console.log(`[bg] Focused display tab ${tabs[0].id}`);}
      else { chrome.tabs.create({url}).then(t=>console.log(`[bg] Opened display tab ${t.id}`)).catch(e=>console.error("[bg] Fail open display:",e));}
    });
  },

  sendStatus: function(status, type = 'default') { /* ... (same as v4.5 - fixed) ... */
    this.state.currentStatus = status; this.state.statusType = type;
    chrome.runtime.sendMessage({action:"updateStatus", status: status, statusType: type }).catch(e=>{/*popup not open*/});
  }
};

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => { /* ... (same as v5.1, including deleteData) ... */
  console.log("[bg] Received message:", message?.action);
  try {
    switch (message?.action) {
      case "startScraping": scrapingManager.startScraping(); break;
      case "stopScraping": scrapingManager.stopScrapingProcess(); sendResponse({status:"Stopping..."}); return true;
      case "openDataPage": scrapingManager.openDataDisplayPage(); break;
      case "deleteData":
        scrapingManager.state.data = [];
        chrome.storage.local.remove('scrapedData', () => {
            if (chrome.runtime.lastError) {
                console.error("[bg] Error deleting data from storage:", chrome.runtime.lastError);
                sendResponse({status: `Error deleting data: ${chrome.runtime.lastError.message}`, statusType: "error"});
            } else {
                console.log("[bg] Scraped data deleted from storage.");
                scrapingManager.sendStatus("All scraped data deleted.", "success");
                sendResponse({status: "All scraped data deleted.", statusType: "success"});
            }
        });
        return true;
      case "getScraperState":
        sendResponse({ isScraping: scrapingManager.state.active || scrapingManager.state.activeWorkerCount > 0, currentStatus: scrapingManager.state.currentStatus, statusType: scrapingManager.state.statusType });
        return true;
      default: console.warn("[bg] Unknown action:", message?.action);
    }
  } catch (e) { console.error("[bg] Message handler error:", e); scrapingManager.sendStatus(`Error: ${e.message}`, "error");}
  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => { /* ... (same as v5.1) ... */
  if (scrapingManager.state.openJobTabIds.has(tabId)) {
      console.log(`[bg] Tracked worker tab ${tabId} was removed.`);
      scrapingManager.state.openJobTabIds.delete(tabId);
  }
  if (!scrapingManager.state.active && scrapingManager.state.activeWorkerCount === 0) return;
  if (tabId === scrapingManager.state.originalTabId) {
    console.log("[bg] Original tab closed. Stopping.");
    scrapingManager.stopScrapingProcess(); scrapingManager.state.originalTabId = null;
  }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => { /* ... (same as v5.1) ... */
  if (!scrapingManager.state.active || !scrapingManager.state.originalTabId || tabId !== scrapingManager.state.originalTabId) return;
  if (changeInfo.status === 'loading' || changeInfo.url) {
    const newUrl = changeInfo.url || tab.url;
    if (newUrl && newUrl !== scrapingManager.state.currentPageUrl && !scrapingManager.state.isPaginating) { // isPaginating will be false here
        if (!newUrl.startsWith("https://www.gastrojobs.de/jobs")) {
            console.warn(`[bg] Original tab ${tabId} navigated completely away from gastrojobs search to ${newUrl}. Stopping scraping.`);
            scrapingManager.stopScrapingProcess();
        } else if (newUrl.split('?')[0] !== scrapingManager.state.currentPageUrl.split('?')[0] && !newUrl.includes("page=")) {
            // If base path changed and it's not clearly a pagination URL from the site itself
            console.warn(`[bg] Original tab ${tabId} URL base path changed unexpectedly to ${newUrl} (was ${scrapingManager.state.currentPageUrl}). Stopping.`);
            scrapingManager.stopScrapingProcess();
        }
    }
  }
});
console.log("[background.js] Gastrojobs background script loaded (v5.2 - pagination disabled).");
