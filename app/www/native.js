/* ---------------------------------------------------------------------------
   The native shell.

   Everything here is a no-op in an ordinary browser, so one index.html serves the
   web build and both apps. Plugins are reached through Capacitor's global proxy
   (Capacitor.Plugins.X) rather than ESM imports, which keeps the whole project
   free of a bundler and a build step — same as it always was.
   --------------------------------------------------------------------------- */
"use strict";
(function(){

const C = window.Capacitor;
const IS = !!(C && C.isNativePlatform && C.isNativePlatform());
const P = (C && C.Plugins) || {};
const platform = (C && C.getPlatform && C.getPlatform()) || 'web';

const Native = { is: IS, platform };

if(IS) document.body.classList.add('native', 'native-'+platform);

/* ---------- handing a file to the phone ----------------------------------- */
/* WKWebView ignores <a download> and Android's WebView is little better, so a
   generated job sheet has to go out through the system share sheet instead. It
   is written to the cache directory first because Share wants a file URI. */

function toBase64(blobOrText, mime){
  return new Promise((resolve, reject) => {
    const blob = blobOrText instanceof Blob ? blobOrText
               : new Blob([blobOrText], {type: mime || 'text/plain'});
    const r = new FileReader();
    r.onerror = () => reject(new Error('read failed'));
    r.onload  = () => resolve(String(r.result).split(',')[1] || '');
    r.readAsDataURL(blob);
  });
}

Native.saveFile = async function({filename, data, mime, title}){
  if(!IS) return false;
  const { Filesystem, Share } = P;
  if(!Filesystem || !Share) return false;
  const b64 = await toBase64(data, mime);
  const w = await Filesystem.writeFile({
    path: filename, data: b64, directory: 'CACHE'
  });
  await Share.share({
    title: title || filename,
    files: [w.uri],
    dialogTitle: title || 'Send it on'
  });
  return true;
};

/* ---------- where the phone is --------------------------------------------
   The web navigator.geolocation API works inside a webview, but it makes WKWebView
   put up its OWN consent sheet on top of the iOS one — and that sheet names the
   origin, so a scaffolder on a roof gets asked twice and the second one says
   "localhost". Going through the plugin keeps it to a single native prompt
   carrying the wording from Info.plist. */

Native.getPosition = async function(){
  if(!IS || !P.Geolocation) return null;
  let perm = null;
  try{ perm = await P.Geolocation.checkPermissions(); }catch(e){}
  if(!perm || perm.location !== 'granted'){
    try{ perm = await P.Geolocation.requestPermissions(); }catch(e){}
    if(!perm || perm.location !== 'granted'){
      const err = new Error('denied'); err.denied = true; throw err;
    }
  }
  const pos = await P.Geolocation.getCurrentPosition({enableHighAccuracy:true, timeout:12000});
  return { lat:+pos.coords.latitude.toFixed(6), lng:+pos.coords.longitude.toFixed(6) };
};

/* ---------- inspection reminders ------------------------------------------
   The single biggest thing the web version could not do: chase anyone. A scaffold
   that is up gets a notification the morning its inspection falls due. */

const CH = 'inspections';
let notifyReady = null;

Native.notificationsReady = async function(){
  if(!IS || !P.LocalNotifications) return false;
  if(notifyReady !== null) return notifyReady;
  try{
    let s = await P.LocalNotifications.checkPermissions();
    if(s.display !== 'granted') s = await P.LocalNotifications.requestPermissions();
    notifyReady = s.display === 'granted';
    if(notifyReady && platform === 'android' && P.LocalNotifications.createChannel){
      await P.LocalNotifications.createChannel({
        id: CH, name: 'Inspections',
        description: 'When a scaffold that is up falls due for its 7-day inspection',
        importance: 4, visibility: 1
      });
    }
  }catch(e){ notifyReady = false; }
  return notifyReady;
};

/* A notification id has to be a 32-bit int, and it has to be the SAME int every time
   we reschedule the same job, or rescheduling would pile duplicates on the phone. */
function idFor(jobId){
  let h = 0;
  const s = String(jobId);
  for(let i=0;i<s.length;i++){ h = (h*31 + s.charCodeAt(i)) | 0; }
  return Math.abs(h) % 2000000000;
}

/* Called after every save. Clears what we set before and lays down the current set. */
Native.syncInspectionReminders = async function(jobs, opts){
  if(!await Native.notificationsReady()) return;
  const LN = P.LocalNotifications;
  try{
    const pending = await LN.getPending();
    if(pending && pending.notifications && pending.notifications.length){
      await LN.cancel({ notifications: pending.notifications.map(n => ({id: n.id})) });
    }
  }catch(e){}

  if(!opts || !opts.enabled) return;   /* inspections switched off in Settings */

  const now = new Date();
  const list = [];
  (jobs||[]).forEach(j => {
    if(j.status !== 'up') return;              /* down scaffolds are nobody's problem */
    const due = j.inspection && j.inspection.next;
    if(!due) return;
    /* 7am local on the day it falls due */
    const at = new Date(due + 'T07:00:00');
    if(isNaN(at) || at <= now) return;         /* already due — the dashboard shows it */
    const who = j.client || j.ref || 'A scaffold';
    list.push({
      id: idFor(j.id),
      channelId: CH,
      title: 'Inspection due today',
      body: who + (j.site ? ' — ' + j.site : '') + ' needs its 7-day inspection.',
      /* inexact on purpose — see the note in AndroidManifest.xml */
      schedule: { at },
      extra: { jobId: j.id }
    });
  });
  if(!list.length) return;
  try{ await LN.schedule({ notifications: list.slice(0, 60) }); }catch(e){}
};

/* Tapping the notification should open that job. */
if(IS && P.LocalNotifications && P.LocalNotifications.addListener){
  P.LocalNotifications.addListener('localNotificationActionPerformed', ev => {
    const id = ev && ev.notification && ev.notification.extra && ev.notification.extra.jobId;
    if(id && window.openJobById) window.openJobById(id);
  });
}

/* ---------- status bar ----------------------------------------------------- */
Native.paintStatusBar = function(isDark){
  if(!IS || !P.StatusBar) return;
  try{
    /* Capacitor's Style.Dark means LIGHT text for a dark background, and vice versa —
       so the flag reads backwards from how it sounds. This is the right way round. */
    P.StatusBar.setStyle({ style: isDark ? 'DARK' : 'LIGHT' });
    /* Deliberately not overlaying the webview on Android: without a guaranteed
       safe-area-inset-top there the header would slide under the status bar. Let the
       system inset the webview instead — undramatic, and correct on every phone. */
  }catch(e){}
};

/* ---------- Android's back button ------------------------------------------
   Android users expect back to close what is open, not quit the app outright. */
if(IS && P.App && P.App.addListener){
  P.App.addListener('backButton', ({canGoBack}) => {
    if(window.handleBackPress && window.handleBackPress()) return;
    if(canGoBack) history.back(); else P.App.exitApp();
  });
  /* Coming back to the app is the moment to check whether anyone else has saved. */
  P.App.addListener('appStateChange', ({isActive}) => {
    if(isActive && window.onAppResume) window.onAppResume();
  });
}

/* ---------- splash --------------------------------------------------------- */
Native.hideSplash = function(){
  if(IS && P.SplashScreen) { try{ P.SplashScreen.hide(); }catch(e){} }
};

window.Native = Native;
})();
