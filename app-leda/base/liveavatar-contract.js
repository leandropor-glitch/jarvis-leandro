/* Stage-only adapter: historical workflow may return provider envelope code/data.
   Authentication remains in n8n. This only unwraps the successful response. */
(function(root){
  'use strict';
  function normalizar(raw,httpOk){
    if(!httpOk||!raw||typeof raw!=='object')return {ok:false};
    const providerSuccess=raw.code===1000&&raw.data&&typeof raw.data==='object';
    if(raw.ok!==true&&!providerSuccess)return {ok:false};
    const value=providerSuccess?raw.data:raw;
    if(!value.livekit_url||!value.livekit_client_token||!value.ws_url)return {ok:false};
    return {
      ok:true,
      livekit_url:value.livekit_url,
      livekit_client_token:value.livekit_client_token,
      ws_url:value.ws_url,
      session_id:value.session_id||raw.session_id,
      session_token:value.session_token||raw.session_token
    };
  }
  if(typeof module==='object'&&module.exports)module.exports={normalizar};
  if(root)root.VinciLiveAvatarContrato={normalizar};
})(typeof window==='object'?window:null);
