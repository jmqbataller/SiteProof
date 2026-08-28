import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveDnsDomain, normalizeRequestedSubdomains, scoreQuickCheck, type QuickCheckArea } from '../src/quickcheck.js';

test('QuickCheck derives the DNS domain from apex and www URLs',()=>{
  assert.equal(deriveDnsDomain('example.com'),'example.com');
  assert.equal(deriveDnsDomain('www.Example.com.'),'example.com');
});

test('QuickCheck normalizes only in-domain requested subdomains',()=>{
  assert.deepEqual(normalizeRequestedSubdomains(['catering','offers.example.com','https://mail.example.com/login'],'example.com'),['catering.example.com','offers.example.com','mail.example.com']);
  assert.throws(()=>normalizeRequestedSubdomains(['other.example.net'],'example.com'),/must belong/);
});

test('QuickCheck score excludes access-only and not-applicable checks',()=>{
  const areas:QuickCheckArea[]=[{number:1,key:'dns',name:'Domain & DNS',status:'Needs Attention',summary:'fixture',checks:[
    {name:'pass',status:'Pass',severity:'Info',evidence:'ok',action:'none',owner:'team'},
    {name:'attention',status:'Needs Attention',severity:'Low',evidence:'review',action:'review',owner:'team'},
    {name:'access',status:'Needs Access',severity:'Info',evidence:'private',action:'verify',owner:'owner'},
    {name:'n/a',status:'Not Applicable',severity:'Info',evidence:'none',action:'none',owner:'owner'}
  ]}];
  assert.deepEqual(scoreQuickCheck(areas),{score:75,excluded:2});
});
