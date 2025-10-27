# 🤖 "Ausbildung" Job Application Automator

I built this end-to-end system to help my friends who were struggling to find an 'Ausbildung' (apprenticeship) in Germany. The manual process was slow and resulted in no replies.

**This system automated the entire process and landed 3 of them contracts in under 2 weeks.**

It works in two parts:

---

## Part 1: The Scraper (Chrome Extension)

A Chrome Extension built with JavaScript (Manifest V3) that scrapes job listing sites.

* It navigates pages, opens job details in new tabs (`background.js`), and extracts key data: **Company Name**, **Contact Person**, and **Email** (`content.js`).
* It saves this data to a clean CSV file (handled by the extension's data page).
* The code included is for `gastrojobs.de`. I built similar modules for other sites like `aubi-plus` and `ausbildungsheld`.

## Part 2: The Mailer (Google Apps Script)

This is the "smart" part of the system.Firstely, Upload The CSV file from the scraper upload it to your Gmail Google Sheet.

#### `GoogleScript_DraftCreator.js`
* This script reads the Google Sheet (company, contact, email).
* It fetches attachments (like CVs and Cover Letters) from Google Drive.
* It creates **personalized drafts** in Gmail. It checks if a `contactName` exists and writes a professional greeting (`Sehr geehrte [Name]...` or `Sehr geehrte Damen und Herren...`).

#### `GoogleScript_AntiSpamSender.js`
* To avoid being flagged as spam, this script runs on a time-based trigger.
* It sends **one email per minute** from the draft queue.
* This simulates human behavior and ensures high deliverability.

This project demonstrates my ability to analyze a real-world problem and build a full-stack, creative, and *smooth*  solution from front-to-back.
