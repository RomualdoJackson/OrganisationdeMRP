/* SPA logic without reload
   - Stores data in localStorage so test data persists between reloads
   - Replace storage/fetch code by fetch() to your PHP endpoints later
*/

const state = {
  members: JSON.parse(localStorage.getItem('gd_members') || '[]'),
  transactions: JSON.parse(localStorage.getItem('gd_transactions') || '[]'),
  vehicles: JSON.parse(localStorage.getItem('gd_vehicles') || '[]'),
  arsenal: JSON.parse(localStorage.getItem('gd_arsenal') || '[]'),
  territories: JSON.parse(localStorage.getItem('gd_territories') || '[]'),
  missions: JSON.parse(localStorage.getItem('gd_missions') || '[]')
};

// init sample data if empty
if (!state.members.length) {
  state.members = [
  ];
}
if (!state.transactions.length) {
  state.transactions = [
  ];
}

saveState();

const pages = {
  dashboard: renderDashboard,
  members: renderMembers,
  transactions: renderTransactions,
  vehicles: renderVehicles,
  arsenal: renderArsenal,
  territories: renderTerritories,
  missions: renderMissions,
  finances: renderFinances,
  settings: renderSettings
};

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('year').textContent = new Date().getFullYear();
  // nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> {
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      navigate(btn.dataset.page);
    });
  });
  // default page
  navigate('dashboard');
});

// navigation
function navigate(page) {
  const title = {
    dashboard:'Tableau de bord',
    members:'Point Illégaux',
    transactions:'Transactions',
    vehicles:'Armes',
    arsenal:'Arsenal',
    territories:'Territoires',
    missions:'Missions',
    finances:'Finances',
    settings:'Paramètres'
  }[page] || page;
  document.getElementById('page-title').textContent = title;
  const content = document.getElementById('content');
  content.innerHTML = '';
  pages[page](content);
}

/* ----------- RENDERERS (each renders into container) ----------- */

function renderDashboard(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="grid cols-2" style="grid-template-columns:1fr 320px">
      <div class="panel">
        <h2 style="margin-bottom:8px">Activités récentes</h2>
        <div class="kv">Journal des actions, saisies et opérations du gang.</div>
        <hr style="margin:12px 0;border:none;border-top:1px solid rgba(255,255,255,0.03)" />
        <div id="recent-list"></div>
      </div>

      <div>
        <div class="panel stat">
          <div class="kv">Coffre</div>
          <div class="value">${getBalance().toLocaleString('fr-FR')} €</div>
        </div>
        <div class="panel stat" style="margin-top:12px">
          <div class="kv">Territoires contrôlés</div>
          <div class="value">${state.territories.length} / 6</div>
        </div>
      </div>
    </div>
  `;
  container.appendChild(wrapper);
  // recent = latest transactions + missions
  const recent = [...state.transactions].slice(0,6).map(t=>`${t.date} — ${t.desc} (${formatAmount(t.amount)})`);
  const recentList = document.getElementById('recent-list');
  if (!recent.length) recentList.textContent = 'Aucune activité récente';
  else {
    const ul = document.createElement('ul');
    ul.style.listStyle = 'none';
    ul.style.padding = '0';
    recent.forEach(r=>{
      const li = document.createElement('li');
      li.style.padding = '8px 0';
      li.style.borderTop = '1px solid rgba(255,255,255,0.03)';
      li.textContent = r;
      ul.appendChild(li);
    });
    recentList.appendChild(ul);
  }
}

function renderMembers(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel">
      <h2>Point Illégaux</h2>
      <form id="member-form" class="form-row" style="margin-top:12px">
        <input class="input" name="name" placeholder="Description du point" required />
        <input class="input" name="role" placeholder="coordonnées" required />
        <button class="btn btn-primary" type="submit">Ajouter</button>
      </form>
    </div>
    <div class="panel">
      <table class="table" id="members-table">
        <thead><tr><th>ID</th><th>Description du point</th><th>coordonnées</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `;
  container.appendChild(wrapper);
  populateMembersTable();

  document.getElementById('member-form').addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const name = fd.get('name').trim(), role = fd.get('role').trim();
    if (!name || !role) return alert('Remplis tous les champs');
    const item = { id: Date.now(), name, role };
    state.members.unshift(item);
    saveState();
    populateMembersTable();
    e.target.reset();
    showToast('Point ajouté');
  });

  function populateMembersTable(){
    const tbody = document.querySelector('#members-table tbody');
    tbody.innerHTML = '';
    state.members.forEach(m=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${m.id}</td><td>${escapeHtml(m.name)}</td><td>${escapeHtml(m.role)}</td>
        <td><button class="btn" data-id="${m.id}">Supprimer</button></td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=> {
        const id = +b.dataset.id;
        if (!confirm('Supprimer ce point ?')) return;
        state.members = state.members.filter(x=>x.id!==id);
        saveState();
        populateMembersTable();
      });
    });
  }
}

function renderTransactions(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel">
      <h2>Ajouter transaction</h2>
      <form id="tx-form" class="form-row" style="margin-top:12px">
        <input class="input" name="date" type="date" required />
        <input class="input" name="desc" placeholder="Description" required />
        <input class="input" name="amount" placeholder="Montant (ex: 1200 ou -250)" required />
        <button class="btn btn-primary" type="submit">Ajouter transaction</button>
      </form>
    </div>
    <div class="panel">
      <h3>Historique</h3>
      <table class="table" id="tx-table">
        <thead><tr><th>Date</th><th>Description</th><th>Montant (€)</th><th></th></tr></thead>
        <tbody></tbody>
      </table>
    </div>
  `;
  container.appendChild(wrapper);
  populateTxTable();

  document.getElementById('tx-form').addEventListener('submit', e=>{
    e.preventDefault();
    const fd = new FormData(e.target);
    const date = fd.get('date'), desc = fd.get('desc').trim(), amount = parseFloat(fd.get('amount'));
    if (!date || !desc || isNaN(amount)) return alert('Remplis correctement les champs');
    const tx = { id: Date.now(), date, desc, amount };
    state.transactions.unshift(tx);
    saveState();
    populateTxTable();
    e.target.reset();
    showToast('Transaction ajoutée');
  });

  function populateTxTable(){
    const tbody = document.querySelector('#tx-table tbody');
    tbody.innerHTML = '';
    state.transactions.forEach(t=>{
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${t.date}</td><td>${escapeHtml(t.desc)}</td><td>${formatAmount(t.amount)}</td>
        <td><button class="btn" data-id="${t.id}">Suppr</button></td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = +b.dataset.id;
        if (!confirm('Supprimer cette transaction ?')) return;
        state.transactions = state.transactions.filter(x=>x.id !== id);
        saveState();
        populateTxTable();
      });
    });
  }
}

function renderVehicles(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel">
      <h2>Armes</h2>
      <form id="veh-form" class="form-row" style="margin-top:12px">
        <input class="input" name="model" placeholder="Modèle" required />
        <button class="btn btn-primary">Armes Ajouté</button>
      </form>
    </div>
    <div class="panel">
      <ul id="veh-list" style="list-style:none;padding:0"></ul>
    </div>
  `;
  container.appendChild(wrapper);
  populateVeh();

  document.getElementById('veh-form').addEventListener('submit', e=>{
    e.preventDefault();
    const model = e.target.model.value.trim();
    if (!model) return;
    state.vehicles.unshift({id:Date.now(), model, state:'Ajouté'});
    saveState(); populateVeh(); e.target.reset(); showToast('Armes ajouté');
  });

  function populateVeh(){
    const ul = document.getElementById('veh-list');
    ul.innerHTML = '';
    state.vehicles.forEach(v=>{
      const li = document.createElement('li');
      li.className = 'panel';
      li.style.marginBottom = '8px';
      li.innerHTML = `<strong>${escapeHtml(v.model)}</strong><div class="kv">Etat: ${escapeHtml(v.state)}</div>
        <div style="margin-top:8px"><button class="btn" data-id="${v.id}">Suppr</button></div>`;
      ul.appendChild(li);
    });
    ul.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=> {
        const id = +b.dataset.id;
        if (!confirm('Supprimer cette arme ?')) return;
        state.vehicles = state.vehicles.filter(x=>x.id !== id);
        saveState(); populateVeh();
      });
    });
  }
}

function renderArsenal(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel">
      <h2>Arsenal</h2>
      <div class="kv">Gestion des armes et munitions</div>
      <ul id="arsenal-list" style="list-style:none;padding:0;margin-top:12px"></ul>
    </div>
  `;
  container.appendChild(wrapper);
  populateArsenal();

  function populateArsenal(){
    const ul = document.getElementById('arsenal-list');
    ul.innerHTML = '';
    state.arsenal.forEach(a=>{
      const li = document.createElement('li');
      li.className = 'panel';
      li.style.marginBottom = '8px';
      li.innerHTML = `<strong>${escapeHtml(a.name)}</strong> — <span class="kv">${a.qty} unités</span>
        <div style="margin-top:8px"><button class="btn" data-id="${a.id}">Suppr</button></div>`;
      ul.appendChild(li);
    });
    ul.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = +b.dataset.id;
        if (!confirm('Supprimer cet item ?')) return;
        state.arsenal = state.arsenal.filter(x=>x.id !== id);
        saveState(); populateArsenal();
      });
    });
  }
}

function renderTerritories(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel">
      <h2>Territoires</h2>
      <form id="zone-form" class="form-row" style="margin-top:12px">
        <input class="input" name="name" placeholder="Nom du territoire" required />
        <button class="btn btn-primary">Ajouter</button>
      </form>
    </div>
    <div class="panel">
      <ul id="zone-list" style="list-style:none;padding:0"></ul>
    </div>
  `;
  container.appendChild(wrapper);
  populateZones();

  document.getElementById('zone-form').addEventListener('submit', e=>{
    e.preventDefault();
    const name = e.target.name.value.trim();
    if (!name) return;
    state.territories.unshift({id:Date.now(), name, status:'Controlled'});
    saveState(); populateZones(); e.target.reset(); showToast('Territoire ajouté');
  });

  function populateZones(){
    const ul = document.getElementById('zone-list');
    ul.innerHTML = '';
    state.territories.forEach(z=>{
      const li = document.createElement('li');
      li.className = 'panel';
      li.style.marginBottom = '8px';
      li.innerHTML = `<strong>${escapeHtml(z.name)}</strong> — <span class="kv">${escapeHtml(z.status)}</span>
        <div style="margin-top:8px"><button class="btn" data-id="${z.id}">Suppr</button></div>`;
      ul.appendChild(li);
    });
    ul.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = +b.dataset.id;
        if (!confirm('Supprimer ce territoire ?')) return;
        state.territories = state.territories.filter(x=>x.id !== id);
        saveState(); populateZones();
      });
    });
  }
}

function renderMissions(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel">
      <h2>Missions</h2>
      <form id="mission-form" class="form-row" style="margin-top:12px">
        <input class="input" name="title" placeholder="Titre mission" required />
        <button class="btn btn-primary">Créer mission</button>
      </form>
    </div>
    <div class="panel">
      <ul id="mission-list" style="list-style:none;padding:0"></ul>
    </div>
  `;
  container.appendChild(wrapper);
  populateMissions();

  document.getElementById('mission-form').addEventListener('submit', e=>{
    e.preventDefault();
    const title = e.target.title.value.trim();
    if (!title) return;
    state.missions.unshift({id:Date.now(), title, status:'Planned'});
    saveState(); populateMissions(); e.target.reset(); showToast('Mission créée');
  });

  function populateMissions(){
    const ul = document.getElementById('mission-list');
    ul.innerHTML = '';
    state.missions.forEach(m=>{
      const li = document.createElement('li');
      li.className = 'panel';
      li.style.marginBottom = '8px';
      li.innerHTML = `<strong>${escapeHtml(m.title)}</strong> — <span class="kv">${escapeHtml(m.status)}</span>
        <div style="margin-top:8px"><button class="btn" data-id="${m.id}">Suppr</button></div>`;
      ul.appendChild(li);
    });
    ul.querySelectorAll('button').forEach(b=>{
      b.addEventListener('click', ()=>{
        const id = +b.dataset.id;
        if (!confirm('Supprimer cette mission ?')) return;
        state.missions = state.missions.filter(x=>x.id !== id);
        saveState(); populateMissions();
      });
    });
  }
}

function renderFinances(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel">
      <h2>Finances</h2>
      <div style="display:flex;gap:12px;flex-wrap:wrap;margin-top:12px">
        <div class="stat" style="min-width:180px">
          <div class="kv">Solde actuel</div>
          <div class="value">${getBalance().toLocaleString('fr-FR')} €</div>
        </div>
        <div class="stat" style="min-width:180px">
          <div class="kv">Revenus totaux</div>
          <div class="value">${getTotals().income.toLocaleString('fr-FR')} €</div>
        </div>
        <div class="stat" style="min-width:180px">
          <div class="kv">Dépenses totales</div>
          <div class="value">-${Math.abs(getTotals().expense).toLocaleString('fr-FR')} €</div>
        </div>
      </div>
    </div>
    <div class="panel">
      <h3>Notes</h3>
      <div class="kv" style="margin-top:8px">Les transactions se gèrent dans l'onglet Transactions. Pour connecter à PHP, remplacez la lecture/écriture du localStorage par vos endpoints (GET/POST).</div>
    </div>
  `;
  container.appendChild(wrapper);
}

function renderSettings(container){
  const wrapper = document.createElement('div');
  wrapper.innerHTML = `
    <div class="panel">
      <h2>Paramètres</h2>
      <div class="kv" style="margin-top:12px">Ici vous pourrez gérer les webhooks FiveM, permissions, et config serveur.</div>
      <div style="margin-top:12px">
        <button id="clear-data" class="btn" style="background:rgba(255,0,0,0.06);border-color:rgba(255,0,0,0.06)">Supprimer toutes les données locales</button>
      </div>
    </div>
  `;
  container.appendChild(wrapper);
  document.getElementById('clear-data').addEventListener('click', ()=>{
    if (!confirm('Tout supprimer (localStorage) ?')) return;
    localStorage.clear();
    location.reload();
  });
}

/* ----------- Helpers ----------- */

function saveState(){
  localStorage.setItem('gd_members', JSON.stringify(state.members));
  localStorage.setItem('gd_transactions', JSON.stringify(state.transactions));
  localStorage.setItem('gd_vehicles', JSON.stringify(state.vehicles));
  localStorage.setItem('gd_arsenal', JSON.stringify(state.arsenal));
  localStorage.setItem('gd_territories', JSON.stringify(state.territories));
  localStorage.setItem('gd_missions', JSON.stringify(state.missions));
}

function formatAmount(a){
  return (a).toLocaleString('fr-FR') + ' €';
}

function getBalance(){
  return state.transactions.reduce((s,t)=>s + (parseFloat(t.amount)||0), 0);
}

function getTotals(){
  let income = 0, expense = 0;
  state.transactions.forEach(t=>{
    if (t.amount >= 0) income += t.amount;
    else expense += t.amount;
  });
  return { income, expense };
}

function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, function(m){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]; });
}

/* tiny toast */
function showToast(text, duration=1600){
  const t = document.createElement('div');
  t.textContent = text;
  Object.assign(t.style,{position:'fixed',right:'20px',bottom:'20px',background:'rgba(0,0,0,0.6)',padding:'10px 14px',borderRadius:'8px',border:'1px solid rgba(255,255,255,0.04)',zIndex:9999});
  document.body.appendChild(t);
  setTimeout(()=> t.remove(), duration);
}
