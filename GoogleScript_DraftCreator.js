/**
 * Professional Email Draft Generator for Job Applications
 * Generates personalized Gmail drafts with attachments from Google Drive data
 * @redouane.boudra Advanced Implementation
 * @version 2.0
 */

class EmailDraftGenerator {
  constructor() {
    this.config = {
      files: {
        cv: "Lebenslauf_redouane.pdf",
        letter: "Anschreiben_redouane.pdf",
        sheet: "info1"
      },
      subject: "Bewerbung als Pflegehelferin (Quereinstieg) - Redouane Boundra",
      senderName: "Redouane Boundra",
      emailRegex: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
    };
    
    this.contactInfo = {
      name: "Redouane Boundra",
      address: "Hilde-Coppi-Straße x",
      city: "07552 xxxx",
      phone: "+xx xxx xxxx xxxx"
    };
  }


  execute() {
    try {
      const attachments = this.loadAttachments();
      const recipients = this.loadRecipients();
      
      this.generateDrafts(recipients, attachments);
      
      Logger.log(`✅ Successfully generated ${recipients.length} draft(s)`);
    } catch (error) {
      Logger.log(`❌ Fatal error: ${error.message}`);
      throw error;
    }
  }


  loadAttachments() {
    const cvBlob = this.getFileBlob(this.config.files.cv, "CV");
    const letterBlob = this.getFileBlob(this.config.files.letter, "Cover Letter");
    
    return [letterBlob, cvBlob];
  }


  getFileBlob(fileName, fileType) {
    const files = DriveApp.getFilesByName(fileName);
    
    if (!files.hasNext()) {
      throw new Error(`${fileType} file '${fileName}' not found in Drive`);
    }
    
    return files.next().getBlob();
  }


  loadRecipients() {
    const sheetFiles = DriveApp.getFilesByName(this.config.files.sheet);
    
    if (!sheetFiles.hasNext()) {
      throw new Error(`Spreadsheet '${this.config.files.sheet}' not found in Drive`);
    }
    
    const sheet = SpreadsheetApp.open(sheetFiles.next()).getSheets()[0];
    const data = sheet.getDataRange().getValues();
    
    return this.parseRecipientData(data);
  }


  parseRecipientData(data) {
    const recipients = [];
    
    for (let i = 1; i < data.length; i++) {
      const [companyName, contactName, rawEmail] = data[i];
      
      if (!rawEmail) {
        Logger.log(`⚠️ Row ${i + 1}: Missing email address, skipping`);
        continue;
      }
      
      const email = this.normalizeEmail(rawEmail);
      
      if (!this.isValidEmail(email)) {
        Logger.log(`❌ Row ${i + 1}: Invalid email format: ${email}`);
        continue;
      }
      
      recipients.push({
        email,
        companyName: companyName || null,
        contactName: contactName || null,
        rowNumber: i + 1
      });
    }
    
    return recipients;
  }


  normalizeEmail(email) {
    return email.toString().trim().replace(/\s/g, '');
  }


  isValidEmail(email) {
    return this.config.emailRegex.test(email);
  }


  generateDrafts(recipients, attachments) {
    recipients.forEach(recipient => {
      try {
        const salutation = this.generateSalutation(recipient);
        const body = this.generateEmailBody(salutation);
        
        GmailApp.createDraft(
          recipient.email,
          this.config.subject,
          body,
          {
            attachments: attachments,
            name: this.config.senderName
          }
        );
        
        Logger.log(`✅ Draft created for: ${recipient.email}`);
      } catch (error) {
        Logger.log(`❌ Failed to create draft for ${recipient.email}: ${error.message}`);
      }
    });
  }

  
  generateSalutation(recipient) {
    const { contactName, companyName } = recipient;
    
    if (this.isValidContactName(contactName)) {
      return this.getSalutationByGender(contactName);
    }
    
    if (this.isValidCompanyName(companyName)) {
      return `Sehr geehrte Damen und Herren des ${companyName}-Teams`;
    }
    
    return "Sehr geehrte Damen und Herren";
  }


  isValidContactName(contactName) {
    return contactName && 
           contactName !== "N/A" && 
           contactName.trim() !== "";
  }


  isValidCompanyName(companyName) {
    return companyName && 
           companyName !== "N/A" && 
           companyName.trim() !== "";
  }


  getSalutationByGender(contactName) {
    const lowerName = contactName.toLowerCase();
    
    if (lowerName.includes("frau")) {
      return `Sehr geehrte ${contactName}`;
    }
    
    if (lowerName.includes("herr")) {
      return `Sehr geehrter ${contactName}`;
    }
    
    return `Guten Tag ${contactName}`;
  }


  generateEmailBody(salutation) {
    return `${salutation},

mit diesem Schreiben bewerbe ich mich bei Ihnen als Pflegehelferin. Als zuverlässige und engagierte EU-Bürgerin (Italien) mit Wohnsitz in Gera möchte ich meinen beruflichen Weg nun in der Pflege fortsetzen.

Warum ich? In meiner bisherigen Arbeit als Servicekraft habe ich gelernt, auch in stressigen Momenten ruhig zu bleiben, Verantwortung zu übernehmen und stets freundlich auf Menschen zuzugehen. Diese "Service-Mentalität" – gepaart mit meiner körperlichen Belastbarkeit und Empathie – bringe ich nun in die Betreuung Ihrer Bewohner ein.

Ich verfüge über Deutschkenntnisse auf B1-Niveau und spreche zudem fließend Italienisch, Arabisch und Französisch, was in einem multikulturellen Team von großem Vorteil ist. Da ich bereits in Deutschland lebe, bin ich flexibel und kurzfristig einsatzbereit.

Meine vollständigen Bewerbungsunterlagen (Lebenslauf & Zeugnisse) finden Sie im Anhang. Gerne überzeuge ich Sie bei einem Probearbeitstag von meiner Motivation.

Ich freue mich auf Ihre Rückmeldung.

Mit freundlichen Grüßen,

${this.contactInfo.name}
${this.contactInfo.address}
${this.contactInfo.city}
Tel.: ${this.contactInfo.phone}`;
  }
}


function createRedouanePflegeDrafts() {
  const generator = new EmailDraftGenerator();
  generator.execute();
}
