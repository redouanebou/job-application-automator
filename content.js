// content.js for gastrojobs.de

if (typeof window.gastrojobsScraper === 'undefined') {
  window.gastrojobsScraper = {
    baseUrl: "https://www.gastrojobs.de",

    listingItemSelector: "#Results_list > ul > li[data-js-class='listing_item']",
    jobLinkSelector: "a.job[data-js-action='open_link']",

    companyNameSelectors: [
        'a.ycg_company_name span', 'a.ycg_company_name',
        '.job_header_logo_wrapper .font-size-l.ycg_company_name span',
        '.company_name_internal a', '.company_name_internal',
        '.job-company-name', 'div.company_info em'
    ],
    emailSelectors: [
        '.job_description_content_col_left a[href^="mailto:"]',
        '#job_description_content a[href^="mailto:"]',
        '.job_description_text a[href^="mailto:"]',
        '#contact_container a[href^="mailto:"]', '.kontakt a[href^="mailto:"]',
        'a.mail[href^="mailto:"]', '#contact_container > p > a[href^="mailto:"]'
    ],
    contactTextSelectors: [
        '.job_description_content_col_left', '#job_description_content',
        '.job_description_text', '#contact_container', '.kontakt',
        '.contact-details', 'article.job_description'
    ],

    getJobUrls: function() {
      console.log("[content.js] getJobUrls called.");
      const jobUrls = [];
      try {
        const listingItems = document.querySelectorAll(this.listingItemSelector);
        console.log(`[content.js] Found ${listingItems.length} listing items using: "${this.listingItemSelector}"`);
        listingItems.forEach((item, index) => {
          const linkElement = item.querySelector(this.jobLinkSelector);
          if (linkElement && linkElement.getAttribute('href')) {
            let relativeUrl = linkElement.getAttribute('href');
            if (relativeUrl && (relativeUrl.startsWith('/jobs/') || relativeUrl.includes('gastrojobs.de/jobs/'))) {
              let absoluteUrl = relativeUrl.startsWith('http') ? relativeUrl : (relativeUrl.startsWith('/') ? `${this.baseUrl}${relativeUrl}` : `${this.baseUrl}/${relativeUrl}`);
              absoluteUrl = absoluteUrl.split('?')[0];
              if (!jobUrls.includes(absoluteUrl)) jobUrls.push(absoluteUrl);
            } else {
               console.warn(`[content.js] Item ${index + 1} link skipped (not a job link): ${relativeUrl}`);
            }
          } else {
            console.warn(`[content.js] Item ${index + 1}: No job link found with: "${this.jobLinkSelector}"`);
          }
        });
        console.log(`[content.js] Extracted ${jobUrls.length} unique job URLs.`);
      } catch (error) {
        console.error("[content.js] getJobUrls failed:", error);
      }
      return jobUrls;
    },

    extractData: function() {
      console.log("[content.js] extractData called on:", window.location.href);
      let companyName = "N/A", personName = "N/A", email = "N/A", errorMsg = null;
      try {
        for (const selector of this.companyNameSelectors) {
            const el = document.querySelector(selector);
            if (el && el.textContent) { companyName = el.textContent.trim(); if (companyName && companyName !== "N/A" && companyName.length > 1) break; }
        }
        if (companyName === "N/A" || companyName.length <= 1) {
            const h1 = document.querySelector('h1.font-size-xl');
            if (h1 && h1.nextElementSibling && h1.nextElementSibling.matches('a[href*="/jobs/"], span')) {
                const compEl = h1.nextElementSibling.querySelector('a[href*="/jobs/"]') || h1.nextElementSibling;
                if(compEl && compEl.textContent) companyName = compEl.textContent.trim();
            }
        }
        for (const selector of this.emailSelectors) {
            const el = document.querySelector(selector);
            if (el && el.getAttribute('href') && el.getAttribute('href').toLowerCase().startsWith('mailto:')) {
                email = el.getAttribute('href').substring(7).split('?')[0].trim(); if (email && email !== "N/A" && email.includes('@')) break;
            } else if (el && el.textContent && el.textContent.includes('@')) {
                const found = el.textContent.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
                if (found) { email = found[0]; if (email && email !== "N/A") break; }
            }
        }
        if (email === "N/A" || !email.includes('@')) {
            for (const sel of this.contactTextSelectors) {
                const block = document.querySelector(sel);
                if (block) {
                    const matches = (block.innerText || block.textContent).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
                    if (matches) { email = matches.find(e => !/^(info@|jobs@|karriere@|bewerbung@|no-reply@|noreply@)/i.test(e) && e.length > 5) || matches[0]; if (email && email !== "N/A" && email.includes('@')) break; }
                }
            }
        }
        for (const sel of this.contactTextSelectors) {
            if (personName !== "N/A" && personName.length > 3) break;
            const block = document.querySelector(sel);
            if (block) {
                const lines = (block.innerText || block.textContent).split('\n');
                let pNames = [];
                for (const line of lines) {
                    const trimmed = line.trim(); if (trimmed.length < 3 || trimmed.length > 70) continue;
                    const cMatch = trimmed.match(/(?:Ansprechpartner(?:in)?|Kontaktperson|Ihr Ansprechpartner|Kontakt):\s*(Herrn?|Frau)?\s*([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß.-]+){1,3})/i);
                    if (cMatch && cMatch[2]) { let p = (cMatch[1]?cMatch[1]+" ":"")+cMatch[2]; p=p.replace(/\s+/g,' ').trim(); if(p.split(' ').length>=2) pNames.push(p); }
                    const dMatch = trimmed.match(/^(Herrn?|Frau)\s+([A-ZÄÖÜ][a-zäöüß]+(?:\s+[A-ZÄÖÜ][a-zäöüß.-]+){1,3})/i);
                    if (dMatch && dMatch[2]) { let c = (dMatch[1]+" "+dMatch[2]).replace(/\s+/g,' ').trim(); if(c.split(' ').length>=2 && !c.toLowerCase().includes('team')&&!c.toLowerCase().includes('abteilung')) pNames.push(c); }
                }
                if (pNames.length > 0) { personName = pNames.sort((a,b)=>b.length-a.length)[0]; if (personName !== "N/A" && personName.length > 3) break; }
            }
        }
        if (companyName === "N/A" && personName === "N/A" && email === "N/A") errorMsg = "Data not found.";
        console.log(`[content.js] Extracted: C='${companyName}', P='${personName}', E='${email}'`);
      } catch (e) {
        console.error("[content.js] extractData failed:", e); errorMsg = `Extraction error: ${e.message}`;
        companyName = (companyName==="N/A"||companyName.length<=1)?"Error":companyName;
        personName = (personName==="N/A"||personName.length<=1)?"Error":personName;
        email = (email==="N/A"||!email.includes('@'))?"Error":email;
      }
      return { companyName, personName, email, error: errorMsg, url: window.location.href, timestamp: new Date().toISOString() };
    },

    clickNextPageButton: function() {
      console.log("[content.js] Attempting to click 'next page' button.");
      try {
        const nextPageButton = document.querySelector("#Results_list > div.sortieren.clearfix.jobsearch-resultlist-footer > ul > li.seite > a.weiter");
        if (nextPageButton) {
          console.log(`[content.js] Found 'next page' button. Href: "${nextPageButton.getAttribute('href')}". Clicking...`);
          nextPageButton.click();
          return true;
        } else {
          console.log("[content.js] 'Next page' button (user-specified selector) not found. Trying generic 'a.weiter'.");
          const genericButton = document.querySelector("a.weiter");
          if (genericButton) {
            console.log(`[content.js] Found generic 'a.weiter'. Href: "${genericButton.getAttribute('href')}". Clicking...`);
            genericButton.click();
            return true;
          }
          console.log("[content.js] No 'weiter' button found.");
          return false;
        }
      } catch (error) {
        console.error("[content.js] clickNextPageButton error:", error);
        return false;
      }
    }
  };
  console.log("[content.js] Gastrojobs content script loaded (v4.2 - CSP debug).");
} else {
  console.log("[content.js] Gastrojobs content script already loaded.");
}
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => { return true; });
