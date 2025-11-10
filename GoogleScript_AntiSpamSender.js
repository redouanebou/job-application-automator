function initEmailSender() {
  const PROP = PropertiesService.getScriptProperties();
  const drafts = GmailApp.getDrafts().slice(0, 500);
  if (drafts.length === 0) {
    Logger.log('❌ No drafts.'); 
    return;
  }
  const queue = drafts.map(d => d.getId());
  PROP.setProperty('draftQueue', JSON.stringify(queue));
  
  let now = new Date(),
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 7, 0, 0);  //make sure to adjuste the time zone at settings of your project , like setting gmt+1 berlin centre or something like that to achieve good results using theyr working business hour 
  if (start <= now) start.setDate(start.getDate() + 1);
  
  ScriptApp.newTrigger('startMinuteLoop')
    .timeBased()
    .at(start)
    .create();
  
  Logger.log(`✅ Start is scheduled at: ${start}`);
}

function startMinuteLoop() {
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'startMinuteLoop')
    .forEach(t => ScriptApp.deleteTrigger(t));
  
  ScriptApp.newTrigger('sendOneDraft')
    .timeBased()
    .everyMinutes(1)
    .create();
  
  Logger.log('⏱️ Sending started every minute.');
}

function sendOneDraft() {
  const PROP = PropertiesService.getScriptProperties();
  let queue = JSON.parse(PROP.getProperty('draftQueue') || 'null');
  if (!Array.isArray(queue) || queue.length === 0) {
    Logger.log('🎉 The queue is over.');
    PROP.deleteProperty('draftQueue');
    ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === 'sendOneDraft')
      .forEach(t => ScriptApp.deleteTrigger(t));
    return;
  }
  
  const draftId = queue.shift();
  try {
    GmailApp.getDraft(draftId).send();
    Logger.log(`📤 Sent: ${draftId}`);
  } catch (e) {
    Logger.log(`⚠️ Sending failed (may have already been deleted) ${draftId}`);
  }
  
  PROP.setProperty('draftQueue', JSON.stringify(queue));
  Logger.log(`✉️ Remaining: ${queue.length}`);
}
