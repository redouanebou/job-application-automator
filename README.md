<div align="center">

# 🤖 Ausbildung Application Automator
### End-to-End Recruitment Outreach System

![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B-yellow?style=for-the-badge&logo=javascript&logoColor=white)
![Chrome Extension](https://img.shields.io/badge/Chrome_Ext-Manifest_V3-4285F4?style=for-the-badge&logo=google-chrome&logoColor=white)
![Google Apps Script](https://img.shields.io/badge/Google_Apps_Script-Automation-34A853?style=for-the-badge&logo=google&logoColor=white)

<p align="center">
  <em>A full-stack automation suite designed to streamline the apprenticeship application process in Germany, converting a 40-hour/week manual grind into a 10-minute workflow.</em>
</p>

</div>

---

## 📉 The Problem: The "Application Grind"

Finding an 'Ausbildung' (apprenticeship) in Germany is a numbers game. Candidates often face:
* **Inefficiency:** Manually copying emails from hundreds of listings takes hours.
* **Low Response Rate:** Generic "Copy-Paste" applications are ignored.
* **Volume Limits:** Platforms make it physically impossible to apply to 50+ companies/day manually.

> **Impact:** My peers were spending weeks sending applications with zero replies. The process needed **Scale** and **Personalization**.

---

## 🛠️ The Solution: Automated Outreach Pipeline

I engineered a two-stage system: a **Chrome Extension** for data harvesting and a **Google Apps Script** engine for personalized, anti-spam email dispatch.

### 🔄 System Architecture

```mermaid
graph LR
    subgraph Data Acquisition
        A[Job Board URL] -->|Chrome Extension| B(DOM Scraper)
        B -->|Extract Contacts| C[Clean CSV Export]
    end
    
    subgraph Execution Engine
        C -->|Import| D{Google Sheet}
        E[Google Drive] -->|Fetch CV/Docs| F(Draft Creator Script)
        D --> F
        F -->|Generate| G[Gmail Drafts Queue]
        G -->|Throttle 1/min| H[Anti-Spam Sender]
    end
