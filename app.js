const $=id=>document.getElementById(id);
let socket;
function toast(msg){const t=$("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2600)}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function render(list){
 const active=list.filter(x=>x.status==="connected").length, waiting=list.filter(x=>x.status==="waiting").length;
 $("activeCount").textContent=active;$("waitingCount").textContent=waiting;$("totalCount").textContent=list.length;
 $("sessionRows").innerHTML=list.length?list.map(s=>`<tr><td>#${esc(s.id)}</td><td>${esc(s.device?.platform||"Awaiting device")}<br><span style="color:#8191ad">${esc(s.device?.userAgent||"No browser details yet")}</span></td><td><span class="status ${esc(s.status)}">${esc(s.status)}</span></td><td>${s.lastSeen?new Date(s.lastSeen).toLocaleTimeString():"—"}</td><td><button class="rowbtn" data-revoke="${esc(s.token)}">Revoke</button></td></tr>`).join(""):'<tr><td colspan="5" class="empty">No sessions yet. Generate a pairing link to begin.</td></tr>';
 document.querySelectorAll("[data-revoke]").forEach(b=>b.onclick=()=>revoke(b.dataset.revoke));
}
async function refresh(){const r=await fetch("/api/sessions");render(await r.json())}
function connectAdmin(){
 const proto=location.protocol==="https:"?"wss":"ws";socket=new WebSocket(`${proto}://${location.host}/admin`);
 socket.onmessage=e=>{const m=JSON.parse(e.data);if(m.type==="sessions")render(m.sessions)};
 socket.onclose=()=>setTimeout(connectAdmin,1800);
}
$("generate").onclick=async()=>{
 const r=await fetch("/api/link",{method:"POST"}),d=await r.json();
 const full=`${location.origin}${d.url}`;$("linkText").textContent=full;$("linkPanel").classList.remove("hidden");
 $("copyLink").onclick=async()=>{await navigator.clipboard.writeText(full);toast("Pairing link copied")};
 refresh();toast("Temporary pairing link created");
};
async function revoke(token){await fetch("/api/revoke",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token})});toast("Session revoked");refresh()}
$("refresh").onclick=refresh;
$("cameraTest").onclick=async()=>{
 try{const stream=await navigator.mediaDevices.getUserMedia({video:true});const v=$("cameraPreview");v.srcObject=stream;v.classList.remove("hidden");toast("Camera permission granted locally");}
 catch(e){toast("Camera unavailable or permission denied")}
};
$("micTest").onclick=async()=>{
 try{const stream=await navigator.mediaDevices.getUserMedia({audio:true});stream.getTracks().forEach(t=>t.stop());$("micResult").textContent="Microphone permission granted. Test complete; no audio was recorded.";toast("Microphone test complete")}
 catch(e){$("micResult").textContent="Microphone unavailable or permission denied."}
};
const c=navigator.connection||navigator.mozConnection||navigator.webkitConnection;
$("networkInfo").textContent=c?`Connection type: ${c.effectiveType||"unknown"} · Downlink estimate: ${c.downlink||"unknown"} Mbps`:"Connection details are not exposed by this browser.";
refresh();connectAdmin();