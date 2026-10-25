/* ---------------------------------------------------------------------------
   Sync transport, account edition.

   Version 1.0 authenticated with nothing but an eight-character code: whoever
   held it had the lot. This version authenticates the person — every call carries
   their JWT, and the database decides what they may see from their membership of
   the tracker rather than from a shared secret.

   The app's own mergeStates() is untouched, and so is the compare-and-swap
   contract: save() returning ok:false hands back the server's copy to merge.
   --------------------------------------------------------------------------- */
"use strict";
(function(){

const LS_TRACKER = 'scaffold-tracker-id';
const LS_ROLE    = 'scaffold-tracker-role';
const url = () => (window.SUPABASE_URL||'').replace(/\/+$/,'');
const key = () => window.SUPABASE_ANON_KEY||'';

function err(code, message){ const e = new Error(message||code); e.code = code; return e; }

/* Every database call goes through here: fetch a live token, attach it, and map
   the handful of exceptions the schema raises onto codes the app already knows. */
async function rpc(fn, body){
  if(!url() || !key()) throw err('not_configured','No server configured');
  if(!window.Auth)     throw err('signed_out','Signed out');

  const token = await Auth.token();          /* throws signed_out / offline */

  let r;
  try{
    r = await fetch(url()+'/rest/v1/rpc/'+fn, {
      method:'POST',
      headers:{ 'apikey':key(), 'Authorization':'Bearer '+token,
                'Content-Type':'application/json', 'Accept':'application/json' },
      body: JSON.stringify(body||{})
    });
  }catch(e){ throw err('offline','No signal'); }

  if(r.status === 401 || r.status === 403) throw err('signed_out','Signed out');
  if(r.status === 413) throw err('too_large','Too big to save');
  if(r.status === 429) throw err('rate_limited','Too many saves');

  if(!r.ok){
    let detail = '';
    try{ detail = (await r.json()).message || ''; }catch(e){}
    if(/no_such_tracker/.test(detail))   throw err('no_such_tracker','That code does not match a tracker');
    if(/already_claimed/.test(detail))   throw err('already_claimed','Somebody has already claimed that tracker');
    if(/no_access/.test(detail))         throw err('no_access','You are not on that tracker');
    if(/read_only/.test(detail))         throw err('read_only','You can look but not change anything here');
    if(/owner_only/.test(detail))        throw err('owner_only','Only the owner can do that');
    if(/cannot_remove_owner/.test(detail)) throw err('owner_only','You cannot remove the owner');
    if(/bad_email/.test(detail))         throw err('bad_email','That does not look like an email address');
    if(/too_large/.test(detail))         throw err('too_large','Too big to save');
    if(/not_signed_in/.test(detail))     throw err('signed_out','Signed out');
    if(r.status >= 500)                  throw err('server','The server is having trouble');
    throw err('http_'+r.status, detail || ('Request failed ('+r.status+')'));
  }
  return r.json();
}

const one = rows => Array.isArray(rows) ? rows[0] : rows;

const Backend = {
  configured: () => !!(url() && key()),
  signedIn:   () => !!(window.Auth && Auth.signedIn()),

  /* which tracker this phone is looking at */
  trackerId(){ try{ return localStorage.getItem(LS_TRACKER)||''; }catch(e){ return ''; } },
  setTracker(id, role){
    try{
      if(id){ localStorage.setItem(LS_TRACKER,id); if(role) localStorage.setItem(LS_ROLE,role); }
      else  { localStorage.removeItem(LS_TRACKER); localStorage.removeItem(LS_ROLE); }
    }catch(e){}
  },
  role(){ try{ return localStorage.getItem(LS_ROLE)||''; }catch(e){ return ''; } },
  canEdit(){ const r = Backend.role(); return r === 'owner' || r === 'editor'; },
  joined(){ return !!(Backend.configured() && Backend.signedIn() && Backend.trackerId()); },

  /* Pending invitations addressed to this person's email become memberships.
     Called right after sign-in; cheap and idempotent. */
  async acceptInvites(){
    try{ return Number(await rpc('acct_accept_invites', {})) || 0; }catch(e){ return 0; }
  },

  /* Every tracker this person can see, newest first. */
  async list(){
    const rows = await rpc('acct_tracker_list', {});
    return (Array.isArray(rows)? rows : []).map(r => ({
      id: r.tracker_id, company: r.company, role: r.role, rev: Number(r.rev), updatedAt: r.updated_at
    }));
  },

  async create(company){
    const row = one(await rpc('acct_tracker_create', { p_company: company||'' }));
    if(!row || !row.tracker_id) throw err('server','Could not start a tracker');
    Backend.setTracker(row.tracker_id, 'owner');
    return { id: row.tracker_id, code: row.join_code };
  },

  /* The 1.0 bridge: take over a tracker that was created with a join code. */
  async claim(code){
    const c = String(code||'').trim().toUpperCase();
    if(!c) throw err('no_such_tracker','Enter a code');
    const row = one(await rpc('acct_tracker_claim', { p_code: c }));
    if(!row) throw err('no_such_tracker','That code does not match a tracker');
    Backend.setTracker(row.tracker_id, 'owner');
    return { id: row.tracker_id, company: row.company };
  },

  select(id, role){ Backend.setTracker(id, role); },
  leave(){ Backend.setTracker(''); },

  /* -> {state, rev} — state may be null for a tracker nobody has written yet. */
  async load(){
    const row = one(await rpc('acct_tracker_get', { p_tracker: Backend.trackerId() }));
    if(!row) throw err('no_access','You are not on that tracker');
    if(row.role) Backend.setTracker(Backend.trackerId(), row.role);
    return { state: row.state, rev: Number(row.rev), role: row.role };
  },

  /* Cheap "has anything changed?" — one number, not the document with its photos. */
  async rev(){
    const v = await rpc('acct_tracker_rev', { p_tracker: Backend.trackerId() });
    return Number(Array.isArray(v) ? v[0] : v);
  },

  async save(state, rev){
    const row = one(await rpc('acct_tracker_put', {
      p_tracker: Backend.trackerId(), p_state: state, p_rev: rev
    }));
    if(!row) throw err('server','Save went nowhere');
    return { ok: !!row.ok, state: row.state, rev: Number(row.rev) };
  },

  /* ---- who is on it -------------------------------------------------------- */
  async people(){
    const rows = await rpc('acct_people', { p_tracker: Backend.trackerId() });
    return (Array.isArray(rows)? rows : []).map(r => ({
      userId: r.user_id, email: r.email, role: r.role, pending: !!r.pending
    }));
  },

  async invite(email, role){
    const row = one(await rpc('acct_invite', {
      p_tracker: Backend.trackerId(), p_email: email, p_role: role || 'editor'
    }));
    /* r_ prefixes: an OUT parameter called "email" collided with the column of the
       same name inside the function, so the names carry a prefix on the way out. */
    return { email: row.r_email, role: row.r_role, pending: !!row.r_pending };
  },

  async revoke(email){
    await rpc('acct_revoke', { p_tracker: Backend.trackerId(), p_email: email });
    return true;
  }
};

window.Backend = Backend;
})();
