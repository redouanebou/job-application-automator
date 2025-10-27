function createRedouaneAusbildungDrafts() {
  const anshreibenFileName = "Anschreiben_Redouane.pdf";
  const lebenslaufFileName = "Lebenslauf_Redouane.pdf";
  const zeugnisseFileName = "Zeugnisse_Redouane.pdf"; 
  const sheetFileName = "scraped_data";

  const anshreibenFiles = DriveApp.getFilesByName(anshreibenFileName);
  const lebenslaufFiles = DriveApp.getFilesByName(lebenslaufFileName);
  const zeugnisseFiles = DriveApp.getFilesByName(zeugnisseFileName);
  const sheetFiles = DriveApp.getFilesByName(sheetFileName);

  if (!anshreibenFiles.hasNext() || !lebenslaufFiles.hasNext() || !zeugnisseFiles.hasNext()) {
    Logger.log("A pdf of Redouane is wrong! please check the names again: Anschreiben_Redouane.pdf, Lebenslauf_Redouane.pdf, Zeugnisse_Redouane.pdf");
    return;
  }
  if (!sheetFiles.hasNext()) {
    Logger.log("Google Sheet '" + sheetFileName + "' isn't there!");
    return;
  }

  const anshreibenBlob = anshreibenFiles.next().getBlob();
  const lebenslaufBlob = lebenslaufFiles.next().getBlob();
  const zeugnisseBlob = zeugnisseFiles.next().getBlob();
  const attachments = [anshreibenBlob, lebenslaufBlob, zeugnisseBlob];

  const sheetFile = sheetFiles.next();
  const sheet = SpreadsheetApp.open(sheetFile).getSheets()[0];
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const companyName = data[i][0]; 
    const contactName = data[i][1]; 
    let email = data[i][2];         

    if (!email) {
      Logger.log(`Email is missing in the line ${i + 1}`);
      continue;
    }
    
    email = email.trim();
    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email)) {
        Logger.log(`Email in the line ${i + 1} is wrong: ${email}`);
        continue;
    }

    Logger.log(`work on the  ${i + 1} line: ${companyName}`);

    let salutation;
    if (contactName && contactName.trim() !== "" && contactName.trim().toLowerCase() !== "n/a") {
      if (contactName.toLowerCase().includes("frau")) {
        salutation = `Sehr geehrte ${contactName}`;
      } else if (contactName.toLowerCase().includes("herr")) {
        salutation = `Sehr geehrter ${contactName}`;
      } else {
        salutation = `Guten Tag ${contactName}`;
      }
    } else if (companyName && companyName.trim() !== "" && companyName.trim().toLowerCase() !== "n/a") {
      salutation = `Sehr geehrte Damen und Herren im ${companyName}-Team`;
    } else {
      salutation = `Sehr geehrte Damen und Herren`;
    }

    const subject = `Bewerbung Ausbildung Gastronomie | Motivierter Kandidat mit Praxiserfahrung & Flexibilität`;
    
    const body = `${salutation},\n\n` +
      `mein Name ist Redouane Boundra und ich bringe genau die richtige Mischung aus Theorie und Praxis für Ihr Team mit.\n\n` +
      `Während andere Bewerber entweder nur praktische Erfahrung oder nur ein Studium vorweisen, biete ich Ihnen beides: Ein abgeschlossenes Wirtschaftsstudium, das mir ein tiefes Verständnis für betriebliche Abläufe gibt, kombiniert mit direkter Praxiserfahrung aus der Gastronomie, wo ich meine Leidenschaft für exzellenten Service entdeckt habe. Ich verstehe nicht nur, wie man einen Gast glücklich macht, sondern auch, wie das Geschäft dahinter funktioniert.\n\n` +
      `Ich bin hochmotiviert, spreche Deutsch auf B1-Niveau und stehe bereit, nach Vertragsunterzeichnung umgehend den Visumsprozess einzuleiten. Hinsichtlich des Starttermins bin ich sehr flexibel und offen für einen Ausbildungsbeginn zu einem für Sie passenden Zeitpunkt im Jahr 2026. Meine vollständigen Unterlagen finden Sie im Anhang.\n\n` +
      `Ich freue mich darauf, Sie in einem Gespräch persönlich zu überzeugen.\n\n` +
      `Mit freundlichen Grüßen\nRedouane Boundra`;

    GmailApp.createDraft(email, subject, body, {
      attachments: attachments,
      name: "Redouane Boundra"
    });
  }

  Logger.log("The end of the work (or Google stopped it).");
}
