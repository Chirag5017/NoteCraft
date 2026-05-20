'use strict';

const { canonicalizeEmail } = require('../../src/utils/email');

describe('canonicalizeEmail', () => {
  it('normalizes Gmail dots, tags, and googlemail domain', () => {
    expect(canonicalizeEmail('Chirag.Bhatia.14567+test@googlemail.com'))
      .toBe('chiragbhatia14567@gmail.com');
  });

  it('does not remove dots for non-Gmail addresses', () => {
    expect(canonicalizeEmail('First.Last@Example.com')).toBe('first.last@example.com');
  });
});
