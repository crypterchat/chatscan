/**
 * X11 Blockchain adapter (under development).
 * Records encrypted message metadata only — never message content.
 */

const storage = require('./storage');

const X11_PROTOCOLS = [
  'X11 Protocol C7',
  'X11 Protocol',
  'X11 Protocol ETH Bridge'
];

function validateSubmission(body) {
  const { hash, encryptedPayload, protocol, sizeBytes } = body;

  if (!hash && !encryptedPayload) {
    return { valid: false, error: 'hash or encryptedPayload is required' };
  }

  let messageHash = hash;
  if (!messageHash && encryptedPayload) {
    messageHash = storage.generateHash(encryptedPayload);
  }

  return {
    valid: true,
    hash: messageHash,
    protocol: protocol || 'X11 Protocol',
    sizeBytes: sizeBytes || (encryptedPayload ? Buffer.byteLength(encryptedPayload, 'utf8') : 0)
  };
}

function submitMessage(body) {
  const validation = validateSubmission(body);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  const message = storage.addMessage({
    hash: validation.hash,
    protocol: validation.protocol,
    sizeBytes: validation.sizeBytes
  });

  return {
    success: true,
    message,
    explorerPath: `/${message.hash}/${message.id}`
  };
}

function confirmMessage(hash, id) {
  const message = storage.updateMessageStatus(hash, id, 'confirmed');
  if (!message) return { success: false, error: 'Message not found' };
  return { success: true, message };
}

function rejectMessage(hash, id) {
  const message = storage.updateMessageStatus(hash, id, 'rejected');
  if (!message) return { success: false, error: 'Message not found' };
  return { success: true, message };
}

module.exports = {
  X11_PROTOCOLS,
  submitMessage,
  confirmMessage,
  rejectMessage
};
