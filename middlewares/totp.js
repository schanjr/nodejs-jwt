const { authenticator } = require('otplib');
const pool = require('../transport/pool');
const qrcode = require('qrcode');

function generateMfaSecret() {
  return authenticator.generateSecret();
}

async function generateMfaQr(username, secret) {
  const otpauthURL = `otpauth://totp/${username}?secret=${secret}`;
  const qrCode = await qrcode.toDataURL(otpauthURL);

  return qrCode.replace(/^data:image\/png;base64,/, '');
}

module.exports = { generateMfaQr, generateMfaSecret};
