(function () {
  'use strict';

  const statusIcon = `
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20V20ZM11.003 16L6.76 11.757L8.174 10.343L11.003 13.172L16.659 7.515L18.074 8.929L11.003 16Z" fill="currentColor"></path>
    </svg>`;

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function statusClass(status) {
    if (status === 'rejected') return 'is-rejected';
    if (status === 'pending') return 'is-pending';
    return '';
  }

  function statusLabel(status) {
    if (!status) return 'Unknown';
    return status.charAt(0).toUpperCase() + status.slice(1);
  }

  async function api(path, options) {
    const res = await fetch(path, {
      headers: { Accept: 'application/json', ...(options && options.headers) },
      ...options,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const err = new Error(data.error || res.statusText);
      err.code = data.code;
      throw err;
    }
    return data;
  }

  function renderRows(messages) {
    const root = document.getElementById('message-rows');
    if (!messages.length) {
      root.innerHTML = '<div class="cs-empty">No encrypted message records match this query.</div>';
      return;
    }

    root.innerHTML = messages
      .map((msg) => {
        const ref = escapeHtml(msg.ref);
        const hash = escapeHtml(msg.hash);
        const protocol = escapeHtml(msg.protocol);
        const status = escapeHtml(statusLabel(msg.status));
        const klass = statusClass(msg.status);
        return `
          <div class="f-career-row-wrapper">
            <div class="w-layout-grid f-career-row">
              <div>
                <div class="f-paragraph-regular cs-hash">
                  <a href="#" class="cs-ref-link" data-ref="${ref}">${ref}</a>
                </div>
                <div class="f-paragraph-small f-text-color-gray-500">Hash: ${hash}</div>
              </div>
              <div>
                <div class="f-paragraph-regular f-text-color-gray-500">${protocol}</div>
              </div>
              <div>
                <div class="f-alert-small">
                  <div class="f-alert-wrapper">
                    <div class="f-alert-success ${klass}">
                      <div class="f-alert-icon w-embed">${statusIcon}</div>
                    </div>
                    <div class="f-paragraph-small">${status}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>`;
      })
      .join('');
  }

  function renderStats(stats) {
    document.getElementById('stat-at-fee').textContent = `AT Fee: $ ${stats.atFeeUsd}`;
    document.getElementById('stat-unconfirmed').innerHTML =
      `Unconfirmed TXS:<br>${stats.unconfirmedTxs.toLocaleString()} (${stats.unconfirmedSizeMb} MB)`;
    document.getElementById('stat-tx-counts').innerHTML =
      `tx Counts: ${stats.txCounts}<br>(${stats.tps} TPS)`;

    const toggle = document.getElementById('server-toggle');
    const label = document.getElementById('server-label');
    if (stats.serverActive) {
      toggle.classList.remove('is-offline');
      label.textContent = 'Server Active';
    } else {
      toggle.classList.add('is-offline');
      label.textContent = 'Server Offline';
    }

    document.getElementById('panel-network').innerHTML = `
      <div class="f-dropdown-stat f-paragraph-small">Chain: <strong>X11</strong></div>
      <div class="f-dropdown-stat f-paragraph-small">Status: ${escapeHtml(stats.networkStatus)}</div>
      <div class="f-dropdown-stat f-paragraph-small">Pending pool: ${stats.pending}</div>
      <div class="f-dropdown-stat f-paragraph-small">Confirmed: ${stats.confirmed}</div>`;

    document.getElementById('panel-24h').innerHTML = `
      <div class="f-dropdown-stat f-paragraph-small">Messages: ${stats.status24h.messages}</div>
      <div class="f-dropdown-stat f-paragraph-small">Confirmed: ${stats.status24h.confirmed}</div>
      <div class="f-dropdown-stat f-paragraph-small">Pending: ${stats.status24h.pending}</div>
      <div class="f-dropdown-stat f-paragraph-small">Rejected: ${stats.status24h.rejected}</div>`;

    document.getElementById('panel-value').innerHTML = `
      <div class="f-dropdown-stat f-paragraph-small">Value / TX: ${escapeHtml(stats.valuePerTx)}</div>
      <div class="f-dropdown-stat f-paragraph-small">Contents: not viewable (E2EE)</div>
      <div class="f-dropdown-stat f-paragraph-small">Record format: {HASH}/{ID}</div>`;
  }

  function showDetail(record) {
    const panel = document.getElementById('detail-panel');
    panel.classList.add('is-open');
    panel.innerHTML = `
      <div class="f-heading-detail-small">Message record</div>
      <dl>
        <dt>Ref</dt><dd class="cs-hash">${escapeHtml(record.ref)}</dd>
        <dt>Hash</dt><dd class="cs-hash">${escapeHtml(record.hash)}</dd>
        <dt>ID</dt><dd>${escapeHtml(record.id)}</dd>
        <dt>Protocol</dt><dd>${escapeHtml(record.protocol)}</dd>
        <dt>Status</dt><dd>${escapeHtml(statusLabel(record.status))}</dd>
        <dt>Chain</dt><dd>${escapeHtml(record.chain)}</dd>
        <dt>Block height</dt><dd>${record.blockHeight == null ? '—' : escapeHtml(record.blockHeight)}</dd>
        <dt>Timestamp</dt><dd>${escapeHtml(record.timestamp)}</dd>
        <dt>Size</dt><dd>${escapeHtml(record.sizeBytes)} bytes</dd>
        <dt>Content</dt><dd>${escapeHtml(record.contentNote)}</dd>
      </dl>`;
  }

  async function loadMessages(query) {
    if (query && query.includes('/')) {
      const record = await api(`/api/messages/${encodeURIComponent(query)}`);
      renderRows([record]);
      showDetail(record);
      return;
    }
    if (query && /^[a-f0-9]{64}$/i.test(query)) {
      const result = await api(`/api/messages/${encodeURIComponent(query.toLowerCase())}`);
      const rows = result.records || [];
      renderRows(rows);
      document.getElementById('detail-panel').classList.remove('is-open');
      return;
    }
    const data = await api('/api/messages?limit=50');
    renderRows(data.messages);
    document.getElementById('detail-panel').classList.remove('is-open');
  }

  async function refresh() {
    const stats = await api('/api/stats');
    renderStats(stats);
    const q = document.getElementById('search-input').value.trim();
    await loadMessages(q);
  }

  function initDropdowns() {
    document.querySelectorAll('[data-cs-dropdown]').forEach((dropdown) => {
      const toggle = dropdown.querySelector('.w-dropdown-toggle');
      const list = dropdown.querySelector('.w-dropdown-list');
      if (!toggle || !list) return;

      const close = () => {
        list.classList.remove('w--open');
        toggle.classList.remove('w--open');
        toggle.setAttribute('aria-expanded', 'false');
      };

      const open = () => {
        document.querySelectorAll('.w-dropdown-list.w--open').forEach((el) => el.classList.remove('w--open'));
        document.querySelectorAll('.w-dropdown-toggle.w--open').forEach((el) => {
          el.classList.remove('w--open');
          el.setAttribute('aria-expanded', 'false');
        });
        list.classList.add('w--open');
        toggle.classList.add('w--open');
        toggle.setAttribute('aria-expanded', 'true');
      };

      toggle.addEventListener('click', (event) => {
        event.preventDefault();
        if (list.classList.contains('w--open')) close();
        else open();
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('[data-cs-dropdown]')) {
        document.querySelectorAll('.w-dropdown-list.w--open').forEach((el) => el.classList.remove('w--open'));
        document.querySelectorAll('.w-dropdown-toggle.w--open').forEach((el) => {
          el.classList.remove('w--open');
          el.setAttribute('aria-expanded', 'false');
        });
      }
    });
  }

  function init() {
    initDropdowns();

    document.getElementById('refresh-btn').addEventListener('click', (event) => {
      event.preventDefault();
      refresh().catch((err) => {
        document.getElementById('message-rows').innerHTML =
          `<div class="cs-empty">${escapeHtml(err.message)}</div>`;
      });
    });

    let searchTimer;
    document.getElementById('search-input').addEventListener('input', (event) => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        loadMessages(event.target.value.trim()).catch((err) => {
          document.getElementById('message-rows').innerHTML =
            `<div class="cs-empty">${escapeHtml(err.message)}</div>`;
        });
      }, 250);
    });

    document.getElementById('message-rows').addEventListener('click', async (event) => {
      const link = event.target.closest('[data-ref]');
      if (!link) return;
      event.preventDefault();
      try {
        const record = await api(`/api/messages/${encodeURIComponent(link.getAttribute('data-ref'))}`);
        showDetail(record);
      } catch (err) {
        document.getElementById('detail-panel').classList.add('is-open');
        document.getElementById('detail-panel').textContent = err.message;
      }
    });

    document.getElementById('ingest-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const errorEl = document.getElementById('ingest-error');
      errorEl.hidden = true;
      const hash = document.getElementById('ingest-hash').value.trim().toLowerCase();
      const protocol = document.getElementById('ingest-protocol').value;
      try {
        const record = await api('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ hash, protocol }),
        });
        document.getElementById('ingest-hash').value = '';
        document.getElementById('search-input').value = record.ref;
        await refresh();
        showDetail(record);
      } catch (err) {
        errorEl.hidden = false;
        errorEl.textContent = err.message;
      }
    });

    refresh().catch((err) => {
      document.getElementById('message-rows').innerHTML =
        `<div class="cs-empty">${escapeHtml(err.message)}</div>`;
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
