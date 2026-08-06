'use strict';

/**
 * ChatScan Block Explorer UI.
 *
 * Renders `{HASH}/{ID}` records from the API. Message contents are
 * end-to-end encrypted and never reach this explorer -- only digests.
 */
(function () {
  var POLL_MS = 5000;
  var records = document.getElementById('records');
  var searchForm = document.getElementById('search-form');
  var searchInput = document.getElementById('search-input');
  var searchClear = document.getElementById('search-clear');
  var searchFeedback = document.getElementById('search-feedback');
  var searching = false;

  var CHECK_ICON =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">' +
    '<path d="M12 22C6.477 22 2 17.523 2 12C2 6.477 6.477 2 12 2C17.523 2 22 6.477 22 12C22 17.523 17.523 22 12 22ZM12 20C14.1217 20 16.1566 19.1571 17.6569 17.6569C19.1571 16.1566 20 14.1217 20 12C20 9.87827 19.1571 7.84344 17.6569 6.34315C16.1566 4.84285 14.1217 4 12 4C9.87827 4 7.84344 4.84285 6.34315 6.34315C4.84285 7.84344 4 9.87827 4 12C4 14.1217 4.84285 16.1566 6.34315 17.6569C7.84344 19.1571 9.87827 20 12 20V20ZM11.003 16L6.76 11.757L8.174 10.343L11.003 13.172L16.659 7.515L18.074 8.929L11.003 16Z" fill="currentColor"></path></svg>';

  function getJson(url) {
    return fetch(url).then(function (res) {
      return res.json().then(function (body) {
        return { ok: res.ok, body: body };
      });
    });
  }

  function setText(id, value) {
    var el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function statusBadge(entry) {
    var wrap = document.createElement('div');
    wrap.className = 'f-alert-small';

    var alertWrapper = document.createElement('div');
    alertWrapper.className = 'f-alert-wrapper';
    var success = document.createElement('div');
    success.className = 'f-alert-success' + (entry.status === 'pending' ? ' chatscan-pending' : '');
    var icon = document.createElement('div');
    icon.className = 'f-alert-icon w-embed';
    icon.innerHTML = CHECK_ICON;
    success.appendChild(icon);
    alertWrapper.appendChild(success);
    wrap.appendChild(alertWrapper);

    var label = document.createElement('div');
    label.className = 'f-paragraph-small';
    label.textContent = entry.status === 'pending' ? 'Pending' : 'Confirmed';
    wrap.appendChild(label);
    return wrap;
  }

  function renderRow(entry) {
    var rowWrapper = document.createElement('div');
    rowWrapper.className = 'f-career-row-wrapper';

    var row = document.createElement('div');
    row.className = 'w-layout-grid f-career-row';

    var hashCell = document.createElement('div');
    var hashText = document.createElement('div');
    hashText.className = 'f-paragraph-regular chatscan-hash';
    hashText.textContent = entry.hash + '/' + entry.id;
    hashCell.appendChild(hashText);
    var meta = document.createElement('div');
    meta.className = 'f-paragraph-small f-text-color-gray-500';
    meta.textContent = 'Recorded ' + new Date(entry.recordedAt).toLocaleString();
    hashCell.appendChild(meta);
    row.appendChild(hashCell);

    var protocolCell = document.createElement('div');
    protocolCell.className = 'chatscan-cell-center';
    var protocol = document.createElement('div');
    protocol.className = 'f-paragraph-regular f-text-color-gray-500';
    protocol.textContent = entry.block ? 'X11 Block #' + entry.block : 'X11 Protocol';
    protocolCell.appendChild(protocol);
    row.appendChild(protocolCell);

    var statusCell = document.createElement('div');
    statusCell.className = 'chatscan-cell-end';
    statusCell.appendChild(statusBadge(entry));
    row.appendChild(statusCell);

    rowWrapper.appendChild(row);
    return rowWrapper;
  }

  function renderRows(entries, emptyMessage) {
    records.textContent = '';
    if (!entries.length) {
      var empty = document.createElement('div');
      empty.className = 'f-career-row-wrapper';
      var p = document.createElement('div');
      p.className = 'f-paragraph-regular f-text-color-gray-500';
      p.textContent = emptyMessage;
      empty.appendChild(p);
      records.appendChild(empty);
      return;
    }
    entries.forEach(function (entry) {
      records.appendChild(renderRow(entry));
    });
  }

  function refresh() {
    if (searching) return;
    getJson('/api/messages?limit=25').then(function (result) {
      if (result.ok) {
        renderRows(result.body.entries, 'No messages recorded yet. Encrypted message hashes will appear here as {HASH}/{ID}.');
      }
    }).catch(function () { /* transient network error; next poll retries */ });

    getJson('/api/stats').then(function (result) {
      if (!result.ok) return;
      var ledger = result.body.ledger;
      var chain = result.body.chain;
      setText('stat-block', 'X11 Block: #' + chain.height);
      setText('stat-pending', 'Unconfirmed TXS: ' + ledger.pending);
      setText('stat-txcount', 'tx Counts: ' + ledger.total + ' (' + ledger.tps + ' TPS)');
      setText('card-network', chain.network + ' (' + chain.mode + ')');
      setText('card-network-detail', chain.note || ('Connected via RPC, block interval ' + chain.blockIntervalMs / 1000 + 's'));
      setText('card-24h', ledger.total + ' records');
      setText('card-24h-detail', chain.lastBlockAt ? 'Last block ' + new Date(chain.lastBlockAt).toLocaleString() : 'No blocks produced yet');
      setText('card-ratio', ledger.confirmed + ' / ' + ledger.pending);
      setText('card-ratio-detail', 'Confirmed vs pending message records');
    }).catch(function () { /* transient network error; next poll retries */ });
  }

  searchForm.addEventListener('submit', function (event) {
    event.preventDefault();
    var query = searchInput.value.trim();
    if (!query) return;
    searching = true;
    getJson('/api/messages/' + encodeURIComponent(query)).then(function (result) {
      if (result.ok) {
        searchFeedback.textContent = 'Found record ' + result.body.record;
        renderRows([result.body.entry], '');
      } else {
        searchFeedback.textContent = result.body.error || 'No record found.';
        renderRows([], 'No record matches that query.');
      }
    }).catch(function () {
      searchFeedback.textContent = 'Search failed. Is the server running?';
    });
  });

  searchClear.addEventListener('click', function () {
    searching = false;
    searchInput.value = '';
    searchFeedback.textContent = '';
    refresh();
  });

  refresh();
  setInterval(refresh, POLL_MS);
})();
