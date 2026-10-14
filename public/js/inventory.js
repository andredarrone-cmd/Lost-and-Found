let selectedClaimItem = null;
let selectedFoundReportItem = null;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>\"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
}

async function loadCategories() {
  const res = await fetch('/api/items/categories'); const data = await res.json();
  const select = document.getElementById('category');
  if (!select) return;
  data.categories.forEach(c => { const option=document.createElement('option'); option.value=c; option.textContent=c; select.appendChild(option); });
}

async function loadItems() {
  const params = new URLSearchParams({ keyword:document.getElementById('keyword').value, category:document.getElementById('category').value, status:document.getElementById('status').value });
  const res = await fetch(`/api/items?${params.toString()}`); const data = await res.json(); const grid=document.getElementById('itemsGrid');
  if (!res.ok) { grid.innerHTML = `<div class="card error">${escapeHtml(data.message)}</div>`; return; }
  document.getElementById('resultCount').textContent = `${data.items.length} items`;
  if (!data.items.length) { grid.innerHTML='<div class="empty card">No items match your search.</div>'; return; }
  grid.innerHTML = data.items.map(item => {
    const locationLabel = item.status === 'unfound' ? 'Lost in' : 'Found at';
    return `<article class="item-card">
    <div class="item-image">${item.image_path ? `<img class="inventory-item-photo" src="${escapeHtml(item.image_path)}" alt="${escapeHtml(item.item_name)}" loading="lazy" />` : '<span>NO IMAGE</span>'}</div>
    <div class="item-body"><div class="item-top"><span class="pill">${escapeHtml(item.category)}</span><span class="status ${item.status}">${escapeHtml(item.status)}</span></div>
    <h3>${escapeHtml(item.item_name)}</h3><p>${escapeHtml(item.description)}</p><dl><div><dt>${locationLabel}</dt><dd>${escapeHtml(item.location_found)}</dd></div><div><dt>Date</dt><dd>${new Date(item.date_found).toLocaleDateString()}</dd></div></dl>
    ${item.status === 'found' ? `<button class="btn primary full claim-btn" data-id="${item.id}" data-name="${escapeHtml(item.item_name)}">Claim this item</button>` : ''}
    ${item.status === 'unfound' ? `<button class="btn primary full found-report-btn" data-id="${item.id}" data-name="${escapeHtml(item.item_name)}">I found this item</button>` : ''}</div></article>`;
  }).join('');
}

async function openClaim(id, name) {
  const me = await fetch('/api/auth/me');
  if (!me.ok) { location.href='/login'; return; }
  selectedClaimItem=id; document.getElementById('claimTitle').textContent=`Claim: ${name}`; document.getElementById('claimMessage').value=''; document.getElementById('claimProofImage').value=''; document.getElementById('claimProofPreview').innerHTML=''; document.getElementById('claimProofPreview').classList.add('hidden'); document.getElementById('claimMsg').textContent=''; document.getElementById('claimModal').classList.remove('hidden');
}

async function submitClaim() {
  const msg = document.getElementById('claimMsg');
  const message = document.getElementById('claimMessage').value.trim();
  const imageInput = document.getElementById('claimProofImage');
  if (!message || message.length < 10) { msg.textContent='Please provide at least 10 characters describing proof of ownership.'; msg.className='form-msg error'; return; }
  if (!imageInput.files.length) { msg.textContent='Please upload a proof image.'; msg.className='form-msg error'; return; }
  const formData = new FormData();
  formData.append('message', message);
  formData.append('proof_image', imageInput.files[0]);
  try {
    const res = await fetch(`/api/items/${selectedClaimItem}/claim`, {method:'POST', body:formData});
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not submit claim.');
    msg.textContent=data.message; msg.className='form-msg success';
    document.getElementById('claimProofImage').value='';
    document.getElementById('claimProofPreview').innerHTML='';
    document.getElementById('claimProofPreview').classList.add('hidden');
    setTimeout(()=>document.getElementById('claimModal').classList.add('hidden'), 900);
  } catch(e){ msg.textContent=e.message; msg.className='form-msg error'; }
}

async function openFoundReport(id, name) {
  const me = await fetch('/api/auth/me');
  if (!me.ok) { location.href = '/login'; return; }
  selectedFoundReportItem = id;
  document.getElementById('foundReportTitle').textContent = `Report: ${name}`;
  document.getElementById('reportFoundLocation').value = '';
  const dateInput = document.getElementById('reportFoundDate');
  dateInput.value = new Date().toISOString().slice(0, 10);
  document.getElementById('foundReportMsg').textContent = '';
  document.getElementById('foundReportMsg').className = 'form-msg';
  document.getElementById('foundReportModal').classList.remove('hidden');
}

async function submitFoundReport() {
  const msg = document.getElementById('foundReportMsg');
  const locationFound = document.getElementById('reportFoundLocation').value.trim();
  const dateFound = document.getElementById('reportFoundDate').value;

  if (!locationFound || !dateFound) {
    msg.textContent = 'Please provide where and when you found the item.';
    msg.className = 'form-msg error';
    return;
  }

  try {
    const res = await fetch(`/api/items/${selectedFoundReportItem}/report-found`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location_found: locationFound, date_found: dateFound })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Could not report the item as found.');
    msg.textContent = data.message;
    msg.className = 'form-msg success';
    setTimeout(async () => {
      document.getElementById('foundReportModal').classList.add('hidden');
      await loadItems();
      await loadAccountPanel();
    }, 700);
  } catch (e) {
    msg.textContent = e.message;
    msg.className = 'form-msg error';
  }
}

async function loadAccountPanel() {
  const me = await fetch('/api/auth/me'); if (!me.ok) return;
  const data = await me.json();
  document.getElementById('accountPanel')?.classList.remove('hidden');
  const reportsRes=await fetch('/api/items/lost-reports'); const reports=await reportsRes.json();
  document.getElementById('lostReports').innerHTML = reports.reports.length ? reports.reports.map(r=>`<div class="mini-row lost-report-row">${r.image_path ? `<img class="lost-report-thumb" src="${escapeHtml(r.image_path)}" alt="${escapeHtml(r.item_name)}" />` : ''}<div><strong>${escapeHtml(r.item_name)}</strong><span>${escapeHtml(r.status)}</span><small>${new Date(r.created_at).toLocaleString()}</small></div></div>`).join('') : '<p class="muted">No lost reports yet.</p>';
  const notifRes=await fetch('/api/items/notifications'); const notifs=await notifRes.json();
  document.getElementById('notifications').innerHTML = notifs.notifications.length ? notifs.notifications.map(n=>`<div class="mini-row"><strong>${escapeHtml(n.title)}</strong><span>${escapeHtml(n.message)}</span><small>${new Date(n.created_at).toLocaleString()}</small></div>`).join('') : '<p class="muted">No notifications yet.</p>';
}

document.addEventListener('DOMContentLoaded', async () => {
  if (!document.getElementById('itemsGrid')) return;
  await loadCategories(); await loadItems(); await loadAccountPanel();
  document.getElementById('searchBtn').addEventListener('click', loadItems);
  document.getElementById('keyword').addEventListener('keydown', e=>{if(e.key==='Enter')loadItems();});
  document.getElementById('itemsGrid').addEventListener('click', e=>{
    if(e.target.matches('.claim-btn')) openClaim(e.target.dataset.id, e.target.dataset.name);
    if(e.target.matches('.found-report-btn')) openFoundReport(e.target.dataset.id, e.target.dataset.name);
  });
  document.getElementById('closeClaim').addEventListener('click', ()=>document.getElementById('claimModal').classList.add('hidden'));
  document.getElementById('closeFoundReport').addEventListener('click', ()=>document.getElementById('foundReportModal').classList.add('hidden'));
  document.getElementById('submitFoundReport').addEventListener('click', submitFoundReport);
  document.getElementById('submitClaim').addEventListener('click', submitClaim);
  document.getElementById('claimProofImage').addEventListener('change', (e)=>{
    const file=e.target.files[0]; const preview=document.getElementById('claimProofPreview');
    if(!file){preview.innerHTML='';preview.classList.add('hidden');return;}
    if(file.size>5*1024*1024){e.target.value='';preview.innerHTML='';preview.classList.add('hidden');document.getElementById('claimMsg').textContent='Proof image must be 5 MB or smaller.';document.getElementById('claimMsg').className='form-msg error';return;}
    const reader=new FileReader(); reader.onload=()=>{preview.innerHTML=`<img src="${reader.result}" alt="Proof preview" />`;preview.classList.remove('hidden');}; reader.readAsDataURL(file);
  });
});
