function esc(v){return String(v ?? '').replace(/[&<>\"]/g,s=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[s]));}

async function loadDashboard(){
  const me=await fetch('/api/auth/me');
  if(!me.ok){location.href='/login';return false;}
  const meData=await me.json();
  if(!['admin','staff'].includes(meData.user.role)){location.href='/';return false;}
  document.getElementById('staffName').textContent=`Signed in as ${meData.user.full_name} (${meData.user.role})`;
  if(meData.user.role==='admin') document.getElementById('usersLink')?.classList.remove('hidden');
  const stats=await fetch('/api/admin/stats').then(r=>r.json());
  document.getElementById('totalItems').textContent=stats.items?.total_items||0;
  document.getElementById('foundItems').textContent=stats.items?.found_items||0;
  document.getElementById('claimedItems').textContent=stats.items?.claimed_items||0;
  const unfoundItems=document.getElementById('unfoundItems');
  if(unfoundItems) unfoundItems.textContent=stats.items?.unfound_items||0;
  document.getElementById('pendingClaims').textContent=stats.claims?.pending_claims||0;
  await Promise.all([loadClaims(),loadItems(),loadLostReports()]);
  return true;
}

async function loadLostReports(){
  const wrap=document.getElementById('lostReportsTable');
  const res=await fetch('/api/admin/lost-reports?status=open'); const data=await res.json();
  if(!res.ok){wrap.innerHTML=`<p class="error">${esc(data.message)}</p>`;return;}
  if(!data.reports.length){wrap.innerHTML='<p class="muted">No pending lost reports.</p>';return;}
  wrap.innerHTML=`<table><thead><tr><th>Photo</th><th>Item</th><th>Reporter</th><th>Last seen</th><th>Date lost</th><th>Status</th><th>Action</th></tr></thead><tbody>${data.reports.map(r=>`<tr><td>${r.image_path?`<img class="table-thumb" src="${esc(r.image_path)}" alt="${esc(r.item_name)}" />`:'<span class="muted">No photo</span>'}</td><td><strong>${esc(r.item_name)}</strong><br><span class="muted">${esc(r.category)}</span><br><small>${esc(r.description)}</small></td><td>${esc(r.reporter_name)}<br><small>${esc(r.reporter_email)}</small><br><small>${esc(r.contact_info)}</small></td><td>${esc(r.last_seen_location)}</td><td>${new Date(r.date_lost).toLocaleDateString()}</td><td><span class="status ${esc(r.status)}">Pending</span></td><td><button class="btn small approve" data-lost-review="${r.id}" data-status="approved">Approve & Post</button> <button class="btn small" data-lost-review="${r.id}" data-status="rejected">Reject</button></td></tr>`).join('')}</tbody></table>`;
}

async function reviewLostReport(id,status){
  const action=status==='approved'?'approve and post this lost report to Manage Items':'reject and delete this lost report';
  if(!confirm(`Are you sure you want to ${action}?`)) return;
  const res=await fetch(`/api/admin/lost-reports/${id}/review`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
  const data=await res.json();
  alert(data.message || 'Updated.');
  if(res.ok) await loadDashboard();
}

async function loadClaims(){
  const res=await fetch('/api/admin/claims?status=pending'); const data=await res.json(); const wrap=document.getElementById('claimsTable');
  if(!res.ok){wrap.innerHTML=`<p class="error">${esc(data.message)}</p>`;return;}
  if(!data.claims.length){wrap.innerHTML='<p class="muted">No pending claims.</p>';return;}
  wrap.innerHTML=`<table><thead><tr><th>Item</th><th>Claimant</th><th>Proof image</th><th>Proof / message</th><th>Action</th></tr></thead><tbody>${data.claims.map(c=>`<tr><td><strong>${esc(c.item_name)}</strong><br><span class="muted">${esc(c.category)}</span></td><td>${esc(c.claimant_name)}<br><small>${esc(c.claimant_email)}</small></td><td>${c.proof_image_path?`<a href="${esc(c.proof_image_path)}" target="_blank" rel="noopener"><img class="claim-proof-thumb" src="${esc(c.proof_image_path)}" alt="Claim proof" /></a>`:'<span class="muted">No image</span>'}</td><td>${esc(c.message)}</td><td><button class="btn small approve" data-claim="${c.id}" data-status="approved">Approve</button> <button class="btn small" data-claim="${c.id}" data-status="rejected">Reject</button></td></tr>`).join('')}</tbody></table>`;
}

async function openEditItem(id){
  const res=await fetch(`/api/items/${id}`); const data=await res.json();
  if(!res.ok){alert(data.message||'Could not load item');return;}
  const item=data.item, form=document.getElementById('editForm');
  Object.keys(item).forEach(k=>{ const el=form.elements[k]; if(el && k!=='image') el.value=item[k] ?? ''; });
  form.elements.id.value=item.id; document.getElementById('editMsg').textContent=''; document.getElementById('editModal').classList.remove('hidden');
}

async function reviewClaim(id,status){
  const res=await fetch(`/api/admin/claims/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
  const data=await res.json(); alert(data.message || 'Updated.'); if(res.ok) loadDashboard();
}

async function loadItems(){
  const res=await fetch('/api/items?status=all'); const data=await res.json(); const wrap=document.getElementById('adminItems');
  if(!res.ok){wrap.innerHTML=`<p class="error">${esc(data.message)}</p>`;return;}
  wrap.innerHTML=data.items.length?`<table><thead><tr><th>Photo</th><th>Item</th><th>Category</th><th>Location</th><th>Date</th><th>Status</th><th>Action</th></tr></thead><tbody>${data.items.map(i=>`<tr><td>${i.image_path?`<img class="table-thumb" src="${esc(i.image_path)}" alt="${esc(i.item_name)}" />`:'<span class="muted">No photo</span>'}</td><td><strong>${esc(i.item_name)}</strong><br><small>${esc(i.description)}</small></td><td>${esc(i.category)}</td><td>${esc(i.location_found)}</td><td>${new Date(i.date_found).toLocaleDateString()}</td><td><span class="status ${i.status}">${esc(i.status)}</span></td><td><select class="status-select" data-status-item="${i.id}"><option value="found" ${i.status==='found'?'selected':''} ${i.status==='claimed'?'disabled':''}>Found</option><option value="claimed" ${i.status==='claimed'?'selected':''}>Claimed</option><option value="unfound" ${i.status==='unfound'?'selected':''} ${i.status==='claimed'?'disabled':''}>Unfound</option></select> ${i.status==='unfound'?`<button class="btn small approve" data-mark-found="${i.id}">Mark as Found</button>`:''} <button class="btn small" data-edit="${i.id}">Edit</button> <button class="btn small" data-delete="${i.id}">Delete</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted">No items yet. Approve a student lost report to post an item here.</p>';
}

document.addEventListener('DOMContentLoaded', async()=>{
  const ready=await loadDashboard();
  if(!ready)return;

  document.getElementById('refreshClaims').onclick=loadClaims;
  document.getElementById('refreshItems').onclick=loadItems;
  document.getElementById('refreshLostReports').onclick=loadLostReports;

  document.getElementById('lostReportsTable').addEventListener('click',e=>{
    if(e.target.dataset.lostReview) reviewLostReport(e.target.dataset.lostReview,e.target.dataset.status);
  });
  document.getElementById('claimsTable').addEventListener('click',e=>{
    if(e.target.dataset.claim) reviewClaim(e.target.dataset.claim,e.target.dataset.status);
  });
  document.getElementById('adminItems').addEventListener('click',async e=>{
    if(e.target.dataset.markFound){
      if(!confirm('Mark this lost item as found?')) return;
      const r=await fetch(`/api/admin/items/${e.target.dataset.markFound}/mark-found`,{method:'PATCH'});
      const d=await r.json();
      alert(d.message || (r.ok?'Item marked as found.':'Could not mark item as found.'));
      if(r.ok) await loadDashboard();
      return;
    }
    if(e.target.dataset.edit){openEditItem(e.target.dataset.edit);return;}
    if(e.target.dataset.delete){if(!confirm('Delete this item?'))return;const r=await fetch(`/api/admin/items/${e.target.dataset.delete}`,{method:'DELETE'});const d=await r.json();alert(d.message||'Deleted');loadDashboard();}
  });

  document.getElementById('adminItems').addEventListener('change',async e=>{
    if(!e.target.dataset.statusItem) return;
    const id=e.target.dataset.statusItem;
    const status=e.target.value;
    if(status==='found'){
      const before=await fetch(`/api/items/${id}`).then(r=>r.json());
      if(before.item?.status==='claimed'){ alert('Claimed items cannot be changed back to found.'); await loadItems(); return; }
    }
    const r=await fetch(`/api/admin/items/${id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    const d=await r.json();
    if(!r.ok){alert(d.message || 'Could not update status.'); await loadItems(); return;}
    await loadDashboard();
  });

  document.getElementById('closeEdit').onclick=()=>document.getElementById('editModal').classList.add('hidden');
  document.getElementById('editForm').addEventListener('submit',async e=>{
    e.preventDefault();
    const form=e.currentTarget,id=form.elements.id.value; const msg=document.getElementById('editMsg');
    const r=await fetch(`/api/admin/items/${id}`,{method:'PUT',body:new FormData(form)}); const d=await r.json();
    msg.textContent=d.message||(r.ok?'Updated.':'Failed'); msg.className='form-msg '+(r.ok?'success':'error');
    if(r.ok){setTimeout(()=>document.getElementById('editModal').classList.add('hidden'),500);loadDashboard();}
  });
});
