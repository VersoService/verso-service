(function () {
  'use strict';

  const core = window.VersoCore;
  if (!core) {
    console.error('Verso features: core non disponibile');
    return;
  }

  const syncState = { online: null, syncing: false };
  let searchResults = [];

  function escapeHtml(value) {
    return core.escHtml(String(value ?? ''));
  }

  function normalizeSearch(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('it')
      .trim();
  }

  function openFeatureModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.add('open');
    document.body.classList.add('feature-modal-open');
  }

  function closeFeatureModal(id) {
    const modal = document.getElementById(id);
    if (!modal) return;
    modal.classList.remove('open');
    if (!document.querySelector('.feature-overlay.open')) document.body.classList.remove('feature-modal-open');
  }

  function handleOverlay(event, id) {
    if (event.target?.id === id) closeFeatureModal(id);
  }

  function openQuickActions() {
    openFeatureModal('modalQuickActions');
    setTimeout(() => document.querySelector('#modalQuickActions .quick-action-card')?.focus(), 80);
  }

  function runQuickAction(action) {
    closeFeatureModal('modalQuickActions');
    setTimeout(() => {
      if (action === 'event') core.openModalService();
      if (action === 'item') core.openModalItem();
      if (action === 'expense') core.openModalFinance();
      if (action === 'truck') core.openModalTruck();
      if (action === 'member') core.openModalMember();
      if (action === 'loan') {
        core.switchPage('prestiti');
        requestAnimationFrame(() => {
          document.getElementById('loanPerson')?.focus();
          window.scrollTo({ top: document.getElementById('page-prestiti')?.offsetTop || 0, behavior: 'smooth' });
        });
      }
    }, 80);
  }

  function updateSyncStatus() {
    const pill = document.getElementById('syncStatus');
    const label = document.getElementById('syncStatusText');
    if (!pill || !label) return;

    let className = 'connecting';
    let text = 'Connessione…';
    if (syncState.online === false) {
      className = 'offline';
      text = syncState.syncing ? 'Offline · modifiche in attesa' : 'Offline';
    } else if (syncState.online === true && syncState.syncing) {
      className = 'syncing';
      text = 'Salvataggio…';
    } else if (syncState.online === true) {
      className = 'synced';
      text = 'Sincronizzato';
    }

    pill.className = `sync-status-pill ${className}`;
    pill.title = text;
    label.textContent = text;
  }

  function buildSearchIndex() {
    const { items, services, members, financeEntries, truckLog, loans } = core.getState();
    const index = [];
    const add = (entry) => index.push({
      ...entry,
      haystack: normalizeSearch([entry.title, entry.meta, entry.extra].filter(Boolean).join(' '))
    });

    Object.values(items || {}).forEach(item => add({
      icon: '📦', type: 'Articolo', page: 'magazzino', searchId: 'searchMag',
      title: core.getItemDisplayName(item),
      meta: [item.categoria, item.posizione, item.seriale].filter(Boolean).join(' · '),
      extra: [item.nome, item.brand, item.modello, item.note].filter(Boolean).join(' ')
    }));

    Object.values(services || {}).forEach(service => add({
      icon: '🎪', type: 'Evento', page: 'service', searchId: 'searchSvc',
      title: service.nome || 'Evento',
      meta: [service.luogo, service.cliente, service.dataOut].filter(Boolean).join(' · '),
      extra: service.note || ''
    }));

    Object.values(members || {}).forEach(member => add({
      icon: '👤', type: 'Team', page: 'team',
      title: member.nome || 'Membro team',
      meta: [member.ruolo, member.telefono].filter(Boolean).join(' · '),
      extra: member.note || ''
    }));

    Object.values(loans || {}).forEach(loan => {
      const memberName = members?.[loan.memberId]?.nome || loan.person || 'Persona';
      const itemName = items?.[loan.itemId] ? core.getItemDisplayName(items[loan.itemId]) : (loan.itemName || 'Articolo');
      add({
        icon: '🙋', type: 'Prestito', page: 'prestiti', searchId: 'searchLoans',
        title: `${memberName} · ${itemName}`,
        meta: [loan.startDate || loan.date, loan.endDate, loan.status === 'returned' ? 'Rientrato' : 'Aperto'].filter(Boolean).join(' · '),
        extra: loan.note || ''
      });
    });

    Object.values(financeEntries || {}).filter(entry => entry.type !== 'income').forEach(entry => add({
      icon: '💰', type: 'Spesa', page: 'costi', searchId: 'searchFinance',
      title: entry.description || 'Spesa',
      meta: [entry.date, core.formatMoney(Number(entry.amount) || 0), members?.[entry.paidByMemberId]?.nome].filter(Boolean).join(' · '),
      extra: entry.note || ''
    }));

    Object.values(truckLog || {}).forEach(entry => add({
      icon: '🚚', type: 'Camion', page: 'camion', searchId: 'searchTruck',
      title: entry.person || 'Assegnazione camion',
      meta: [entry.date, entry.note].filter(Boolean).join(' · '),
      extra: ''
    }));

    return index;
  }

  function renderSearchResults(query) {
    const resultsEl = document.getElementById('globalSearchResults');
    if (!resultsEl) return;
    const normalized = normalizeSearch(query);
    if (normalized.length < 2) {
      searchResults = [];
      resultsEl.innerHTML = '<div class="global-search-empty">Scrivi almeno 2 caratteri per iniziare.</div>';
      return;
    }

    const terms = normalized.split(/\s+/).filter(Boolean);
    searchResults = buildSearchIndex()
      .filter(entry => terms.every(term => entry.haystack.includes(term)))
      .slice(0, 40);

    if (!searchResults.length) {
      resultsEl.innerHTML = `<div class="global-search-empty">Nessun risultato per “${escapeHtml(query)}”.</div>`;
      return;
    }

    resultsEl.innerHTML = `
      <div class="global-search-count">${searchResults.length}${searchResults.length === 40 ? '+' : ''} risultati</div>
      ${searchResults.map((entry, index) => `
        <button type="button" class="global-search-result" data-search-result="${index}">
          <span class="global-search-result-icon" aria-hidden="true">${entry.icon}</span>
          <span class="global-search-result-copy">
            <span class="global-search-result-title">${escapeHtml(entry.title)}</span>
            <span class="global-search-result-meta">${escapeHtml(entry.meta || 'Apri nella sezione')}</span>
          </span>
          <span class="global-search-result-type">${escapeHtml(entry.type)}</span>
        </button>`).join('')}`;
  }

  function openGlobalSearch() {
    openFeatureModal('modalGlobalSearch');
    const input = document.getElementById('globalSearchInput');
    if (input) {
      input.value = '';
      renderSearchResults('');
      setTimeout(() => input.focus(), 80);
    }
  }

  function openSearchResult(index) {
    const result = searchResults[index];
    if (!result) return;
    const query = document.getElementById('globalSearchInput')?.value.trim() || result.title;
    closeFeatureModal('modalGlobalSearch');
    core.switchPage(result.page);
    requestAnimationFrame(() => {
      const input = result.searchId ? document.getElementById(result.searchId) : null;
      if (input) {
        input.value = query;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  function getServiceReadiness(service) {
    const entries = core.getServiceItemEntries(service);
    const availabilityIssues = core.getServiceAvailabilityIssues(service);
    const quote = core.getServiceQuoteSummary(service);
    const datesReady = core.isValidYmd(service?.dataOut) && core.isValidYmd(service?.dataIn) && service.dataIn >= service.dataOut;
    const checks = [
      { key: 'details', label: 'Date e luogo', done: datesReady && !!String(service?.luogo || '').trim() },
      { key: 'materials', label: 'Materiali inseriti', done: entries.length > 0 },
      { key: 'availability', label: 'Disponibilità verificata', done: entries.length > 0 && availabilityIssues.length === 0 },
      { key: 'team', label: 'Team assegnato', done: Object.keys(service?.team || {}).length > 0 },
      { key: 'quote', label: 'Preventivo completo', done: quote.lines.length > 0 && quote.missingCount === 0 },
      { key: 'truck', label: 'Camion pronto', done: service?.checklist?.truckReady === true, manual: true }
    ];
    const completed = checks.filter(check => check.done).length;
    return { checks, completed, total: checks.length, ready: completed === checks.length };
  }

  function renderServiceReadinessBadge(service) {
    const readiness = getServiceReadiness(service);
    return `<span class="service-readiness-badge${readiness.ready ? ' ready' : ''}" title="Prontezza evento: ${readiness.completed} controlli su ${readiness.total}">${readiness.ready ? '✓ Pronto' : `${readiness.completed}/${readiness.total} pronto`}</span>`;
  }

  function renderServiceChecklist(service) {
    const readiness = getServiceReadiness(service);
    const serviceId = escapeHtml(service?.id || '');
    return `
      <section class="service-readiness" aria-label="Checklist prontezza evento">
        <div class="service-readiness-head">
          <span>Checklist prontezza</span>
          <span class="service-readiness-progress">${readiness.completed}/${readiness.total}${readiness.ready ? ' · pronto' : ''}</span>
        </div>
        <div class="service-readiness-list">
          ${readiness.checks.map(check => {
            const content = `<span class="service-readiness-check">${check.done ? '✓' : '○'}</span><span>${check.label}</span>`;
            return check.manual
              ? `<button type="button" class="service-readiness-item manual${check.done ? ' done' : ''}" data-service-readiness-toggle="${serviceId}" aria-pressed="${check.done}">${content}</button>`
              : `<div class="service-readiness-item${check.done ? ' done' : ''}">${content}</div>`;
          }).join('')}
        </div>
      </section>`;
  }

  function toggleTruckReady(serviceId) {
    const state = core.getState();
    const service = state.services?.[serviceId];
    const fb = core.getFbOrWarn();
    if (!service || !fb) return;
    const next = service?.checklist?.truckReady !== true;
    const { db, ref, update } = fb;
    core.setSyncing(true);
    update(ref(db, `services/${serviceId}`), {
      'checklist/truckReady': next,
      updatedAt: Date.now()
    })
      .then(() => core.showToast(next ? 'Camion segnato come pronto' : 'Controllo camion riaperto'))
      .catch(error => {
        core.setSyncing(false);
        console.error('toggleTruckReady failed:', error);
        core.showToast('Errore checklist camion', 'danger');
      });
  }

  window.versoFeatures = {
    openQuickActions,
    runQuickAction,
    openGlobalSearch,
    closeFeatureModal,
    handleOverlay,
    getServiceReadiness,
    renderServiceReadinessBadge,
    renderServiceChecklist,
    toggleTruckReady
  };

  window.addEventListener('verso:connection', event => {
    syncState.online = !!event.detail?.online;
    updateSyncStatus();
  });
  window.addEventListener('verso:sync', event => {
    syncState.syncing = !!event.detail?.syncing;
    updateSyncStatus();
  });

  window.addEventListener('online', () => {
    if (syncState.online === null) updateSyncStatus();
  });
  window.addEventListener('offline', () => {
    syncState.online = false;
    updateSyncStatus();
  });

  document.getElementById('globalSearchInput')?.addEventListener('input', event => renderSearchResults(event.target.value));
  document.getElementById('globalSearchResults')?.addEventListener('click', event => {
    const button = event.target.closest('[data-search-result]');
    if (button) openSearchResult(Number(button.dataset.searchResult));
  });

  document.addEventListener('click', event => {
    const toggle = event.target.closest('[data-service-readiness-toggle]');
    if (toggle) toggleTruckReady(toggle.dataset.serviceReadinessToggle);
  });

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLocaleLowerCase() === 'k') {
      event.preventDefault();
      openGlobalSearch();
      return;
    }
    if (event.key === 'Escape') {
      if (document.getElementById('modalGlobalSearch')?.classList.contains('open')) closeFeatureModal('modalGlobalSearch');
      else if (document.getElementById('modalQuickActions')?.classList.contains('open')) closeFeatureModal('modalQuickActions');
    }
    if (event.key === 'Enter' && document.activeElement?.id === 'globalSearchInput' && searchResults.length) openSearchResult(0);
  });

  const connectionDot = document.getElementById('connDot');
  if (connectionDot?.classList.contains('online')) syncState.online = true;
  if (connectionDot?.classList.contains('offline')) syncState.online = false;
  updateSyncStatus();
  core.renderService();
}());
