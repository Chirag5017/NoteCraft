'use strict';

function canonicalizeEmail(email) {
  if (!email) return email;

  const normalized = email.trim().toLowerCase();
  const [rawLocal, rawDomain] = normalized.split('@');
  if (!rawLocal || !rawDomain) return normalized;

  const domain = rawDomain === 'googlemail.com' ? 'gmail.com' : rawDomain;
  if (domain !== 'gmail.com') return `${rawLocal}@${domain}`;

  const localWithoutTag = rawLocal.split('+')[0];
  const localWithoutDots = localWithoutTag.replace(/\./g, '');
  return `${localWithoutDots}@${domain}`;
}

module.exports = { canonicalizeEmail };
