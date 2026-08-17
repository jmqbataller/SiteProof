import assert from 'node:assert/strict';
import test from 'node:test';
import { ctaType, normalizeUrl, stripTrackingParams } from '../src/utils.js';

test('normalizeUrl adds https and normalizes trailing slash',()=>{
  assert.equal(normalizeUrl('example.com'),'https://example.com/');
});

test('normalizeUrl rejects non-http schemes',()=>{
  assert.throws(()=>normalizeUrl('ftp://example.com'),/only audits http/);
});

test('stripTrackingParams removes common marketing parameters',()=>{
  const out=stripTrackingParams('https://example.com/a?utm_source=x&id=2&fbclid=abc');
  assert.equal(out,'https://example.com/a?id=2');
});

test('CTA classifier detects common lead actions',()=>{
  assert.equal(ctaType('Book an appointment','/book'),'booking');
  assert.equal(ctaType('Call us','tel:+15551212'),'phone');
  assert.equal(ctaType('Email','mailto:test@example.com'),'email');
});
