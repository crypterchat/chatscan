(function () {
  'use strict';

  const API = '/api';

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  function formatTime(ts) {
    return new Date(ts).toLocaleString();
  }

  function statusLabel(status) {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      rejected: 'Rejected'
    };
    return labels[status] || status;
  }

  function truncateHash(hash) {
    if (hash.length <= 20) return hash;
    return hash.slice(0, 12) + '…' + hash.slice(-8);
  }

  function renderMessageRow(message) {
    const row = document.createElement('div');
    row.className = 'f-career-row-wrapper';

    const grid = document.createElement('div');
    grid.className = 'w-layout-grid f-career-row';

    const col1 = document.createElement('div');
    const link = document.createElement('a');
    link.href = '/' + message.hash + '/' + message.id;
    link.className = 'f-paragraph-regular f-text-weight-medium';
    link.style.cssText = 'text-decoration:none;color:#160042;';
    link.textContent = message.hash + '/' + message.id;

    const meta = document.createElement('div');
    meta.className = 'f-paragraph-small f-text-color-gray-500';
    meta.style.marginTop = '4px';
    meta.textContent = 'Hash: ' + truncateHash(message.hash) + ' · ' + formatTime(message.timestamp);

    col1.appendChild(link);
    col1.appendChild(meta);

    const col2 = document.createElement('div');
    const protocol = document.createElement('div');
    protocol.className = 'f-paragraph-regular f-text-color-gray-500';
    protocol.textContent = message.protocol;
    col2.appendChild(protocol);

    const col3 = document.createElement('div');
    const alert = document.createElement('div');
    alert.className = 'f-alert-small';
    const statusText = document.createElement('div');
    statusText.className = 'f-paragraph-small';
    statusText.textContent = statusLabel(message.status);
    alert.appendChild(statusText);
    col3.appendChild(alert);

    grid.appendChild(col1);
    grid.appendChild(col2);
    grid.appendChild(col3);
    row.appendChild(grid);
    return row;
  }

  async function loadStats() {
    try {
      const res = await fetch(API + '/stats');
      const stats = await res.json();

      setText('stat-at-fee', '$ ' + stats.atFee.toFixed(3));
      setText('stat-unconfirmed', stats.unconfirmedCount.toLocaleString() + ' (' + stats.unconfirmedMb + ' MB)');
      setText('stat-tx-count', stats.totalMessages.toLocaleString() + ' (' + stats.tps + ' TPS)');
      setText('stat-network-status', stats.totalMessages.toLocaleString() + ' messages');
      setText('stat-24h-status', stats.messages24h.toLocaleString() + ' messages');
      setText('stat-value-tx', stats.atFee.toFixed(3) + ' AT');
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }

  async function loadMessages() {
    const container = document.getElementById('message-list');
    if (!container) return;

    try {
      const res = await fetch(API + '/messages?limit=50');
      const data = await res.json();
      container.innerHTML = '';

      if (data.messages.length === 0) {
        container.innerHTML = '<div class="f-paragraph-regular f-text-color-gray-500">No messages recorded yet.</div>';
        return;
      }

      data.messages.forEach((msg) => {
        container.appendChild(renderMessageRow(msg));
      });
    } catch (err) {
      container.innerHTML = '<div class="f-paragraph-regular f-text-color-gray-500">Unable to load messages.</div>';
      console.error('Failed to load messages:', err);
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  function init() {
    loadStats();
    loadMessages();
    setInterval(loadStats, 30000);
    setInterval(loadMessages, 15000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
