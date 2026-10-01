const $=id=>document.getElementById(id);
const token=new URLSearchParams(location.search).get("token");
let ws,beat;
$("agree").onchange=()=>{$("join").disabled=!$("agree").checked};
$("join").onclick=()=>{
 if(!token){$("joinStatus").textContent="Missing pairing token.";return}
 const proto=location.protocol==="https:"?"wss":"ws";
 ws=new WebSocket(`${proto}://${location.host}/device?token=${encodeURIComponent(token)}`);
 $("join").disabled=true;$("joinStatus").textContent="Connecting…";
 ws.onopen=()=>{
  const device={userAgent:navigator.userAgent,platform:navigator.platform,screen:`${screen.width}×${screen.height}`};
  const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
  ws.send(JSON.stringify({type:"consent",accepted:true,device}));
  const metrics={effectiveType:c?.effectiveType,downlink:c?.downlink};
  ws.send(JSON.stringify({type:"heartbeat",metrics}));
  beat=setInterval(()=>{if(ws.readyState===WebSocket.OPEN)ws.send(JSON.stringify({type:"heartbeat",metrics}))},15000);
  $("joinStatus").textContent="Connected. You may close this page to end the session.";
 };
 ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==="error"||m.type==="revoked"){$("joinStatus").textContent=m.message||"Session revoked.";clearInterval(beat);ws.close()}};
 ws.onerror=()=>{$("joinStatus").textContent="Could not connect. The link may have expired."};
 ws.onclose=()=>{clearInterval(beat);$("joinStatus").textContent="Session ended.";};
};