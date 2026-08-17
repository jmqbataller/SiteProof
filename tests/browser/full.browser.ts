import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

process.env.ALLOW_PRIVATE_TARGETS='true';
process.env.BROWSER_ENABLED='true';
process.env.REQUEST_TIMEOUT_MS='10000';

const html='<!doctype html><html lang="en"><head><title>Rendered Fixture</title><meta name="description" content="Browser audit fixture"></head><body><main><h1>Rendered Fixture</h1><button id="show">Open dialog</button><div role="dialog" aria-label="Offer">Audit offer</div><img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" alt="pixel"></main></body></html>';

test('full browser audit runs axe and captures screenshot evidence',async()=>{
  const server=http.createServer((_req,res)=>{res.setHeader('content-type','text/html');res.end(html);});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const addr=server.address(); if(!addr||typeof addr==='string')throw new Error('No fixture address');
  const evidenceDir=await fs.mkdtemp(path.join(os.tmpdir(),'siteproof-evidence-'));
  try{
    const { auditPage }=await import('../../src/page-audit.js');
    const out=await auditPage(`http://127.0.0.1:${addr.port}`,{mode:'full',evidenceDir,capture:true,captureMobile:true});
    assert.equal(out.title,'Rendered Fixture');
    assert.equal(out.accessibility?.ran,true);
    assert.equal(out.popupDetected,true);
    assert.equal(out.screenshots.length,2);
    for(const shot of out.screenshots) await fs.access(shot.path);
  } finally {
    await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));
    await fs.rm(evidenceDir,{recursive:true,force:true});
  }
});
