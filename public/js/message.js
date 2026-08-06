(function () {
  'use strict';

  const API = '/api';

  function getPathParts() {
    const parts = window.location.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      return { hash: parts[0], id: parts[1] };
    }
    return null;
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

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  async function loadMessage() {
    const path = getPathParts();
    if (!path) {
      window.location.href = '/';
      return;
    }

    const { hash, id } = path;

    try {
      const res = await fetch(API + '/messages/' + hash + '/' + id);
      if (!res.ok) {
        document.getElementById('message-detail').innerHTML =
          '<div class="f-paragraph-regular">Message not found.</div>';
        return;
      }

      const message = await res.json();

      document.title = message.explorerId + ' | ChatScan';
      setText('detail-explorer-id', message.explorerId);
      setText('detail-hash', message.hash);
      setText('detail-id', String(message.id));
      setText('detail-protocol', message.protocol);
      setText('detail-status', statusLabel(message.status));
      setText('detail-timestamp', formatTime(message.timestamp));
      setText('detail-size', formatBytes(message.sizeBytes));
      setText('detail-encrypted', 'End-to-end encrypted — content not viewable');
      setText('breadcrumb-id', message.hash.slice(0, 12) + '…/' + message.id);
    } catch (err) {
      console.error('Failed to load message:', err);
    }
  }

  function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadMessage);
  } else {
    loadMessage();
  }
})();
