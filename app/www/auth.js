/* ---------------------------------------------------------------------------
   Accounts.

   Talks to Supabase Auth over plain REST — no SDK, no bundler, same as the rest
   of this project. Email and password only: a man on a scaffold with one bar of
   signal should not have to go and find an email to get back into the app.

   The session is kept in localStorage so the app opens signed-in with no
   round-trip. The access token lasts about an hour; the refresh token is what
   actually keeps someone logged in, and is spent lazily — only when a call is
   about to need a token that has expired.
   --------------------------------------------------------------------------- */
"use strict";
(function(){

const LS_SESSION = 'scaffold-tracker-session';
const url = () => (window.SUPABASE_URL||'').replace(/\/+$/,'');
const key = () => window.SUPABASE_ANON_KEY||'';

function err(code, message){ const e = new Error(message||code); e.code = code; return e; }

let session = null;      /* {access_token, refresh_token, expires_at, user:{id,email}} */
let refreshing = null;   /* in-flight refresh, so parallel calls share one */

function load(){
  try{ session = JSON.parse(localStorage.getItem(LS_SESSION)||'null'); }catch(e){ session = null; }
  return session;
}
function store(s){
  session = s;
  try{
    if(s) localStorage.setItem(LS_SESSION, JSON.stringify(s));
    else  localStorage.removeItem(LS_SESSION);
  }catch(e){}
}

/* Supabase returns expires_in (seconds). Turn it into a wall-clock moment, and
   treat a token as expired a minute early so a call never races the clock. */
function shape(raw){
  if(!raw || !raw.access_token) return null;
  return {
    access_token:  raw.access_token,
    refresh_token: raw.refresh_token,
    expires_at:    Date.now() + ((raw.expires_in || 3600) * 1000),
    user: { id: (raw.user||{}).id, email: (raw.user||{}).email }
  };
}
const expired = s => !s || Date.now() > (s.expires_at - 60000);

async function post(path, body, extraHeaders){
  let r;
  try{
    r = await fetch(url()+'/auth/v1/'+path, {
      method:'POST',
      headers: Object.assign({ 'apikey':key(), 'Content-Type':'application/json' }, extraHeaders||{}),
      body: JSON.stringify(body||{})
    });
  }catch(e){ throw err('offline','No signal'); }

  let data = null;
  try{ data = await r.json(); }catch(e){}

  if(!r.ok){
    const msg = (data && (data.error_description || data.msg || data.message || data.error)) || '';
    if(/already registered|already been registered/i.test(msg)) throw err('email_taken','That email already has an account');
    if(/invalid login credentials/i.test(msg))                  throw err('bad_login','That email and password do not match');
    if(/email not confirmed/i.test(msg))                        throw err('unconfirmed','Check your email and confirm the address first');
    if(/password should be at least|weak/i.test(msg))           throw err('weak_password','Use at least six characters');
    if(/rate limit|too many/i.test(msg))                        throw err('rate_limited','Too many tries — wait a minute');
    if(r.status >= 500)                                         throw err('server','The server is having trouble');
    throw err('auth_'+r.status, msg || ('Sign-in failed ('+r.status+')'));
  }
  return data;
}

const Auth = {
  configured: () => !!(url() && key()),
  session:    () => session,
  user:       () => session && session.user,
  email:      () => (session && session.user && session.user.email) || '',
  signedIn:   () => !!session,

  init(){ return load(); },

  async signUp(email, password){
    const d = await post('signup', {email: String(email||'').trim().toLowerCase(), password});
    /* With email confirmation switched on Supabase returns a user but no token.
       Say so plainly rather than pretending they are in. */
    const s = shape(d);
    if(!s) return { confirmNeeded:true };
    store(s);
    return { confirmNeeded:false };
  },

  async signIn(email, password){
    const d = await post('token?grant_type=password',
      {email: String(email||'').trim().toLowerCase(), password});
    const s = shape(d);
    if(!s) throw err('bad_login','That email and password do not match');
    store(s);
    return s;
  },

  async sendReset(email){
    await post('recover', {email: String(email||'').trim().toLowerCase()});
    return true;
  },

  async signOut(){
    const s = session;
    store(null);
    if(s) { try{ await post('logout', {}, {Authorization:'Bearer '+s.access_token}); }catch(e){} }
  },

  /* The one everything else goes through. Returns a usable access token, refreshing
     if need be. Throws 'signed_out' when there is nothing left to refresh with, so
     callers can put the sign-in screen up. */
  async token(){
    if(!session) throw err('signed_out','Signed out');
    if(!expired(session)) return session.access_token;
    if(!session.refresh_token){ store(null); throw err('signed_out','Signed out'); }

    if(!refreshing){
      refreshing = (async () => {
        try{
          const d = await post('token?grant_type=refresh_token', {refresh_token: session.refresh_token});
          const s = shape(d);
          if(!s) throw err('signed_out','Signed out');
          store(s);
          return s.access_token;
        }catch(e){
          /* A refused refresh means the session is genuinely finished. A dead network
             does not — keep the session so it still works when the signal returns. */
          if(e && e.code !== 'offline' && e.code !== 'server') store(null);
          throw (e && e.code === 'offline') ? e : err('signed_out','Signed out');
        }finally{ refreshing = null; }
      })();
    }
    return refreshing;
  }
};

Auth.init();
window.Auth = Auth;
})();
