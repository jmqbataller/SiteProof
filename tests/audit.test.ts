import assert from 'node:assert/strict';
import http from 'node:http';
import test from 'node:test';

process.env.ALLOW_PRIVATE_TARGETS = 'true';
process.env.BROWSER_ENABLED = 'false';
process.env.REQUEST_TIMEOUT_MS = '5000';

const fixture = `<!doctype html>
<html lang="en"><head>
<title>SiteProof Fixture</title>
<meta name="description" content="A fixture page for SiteProof integration tests.">
<link rel="canonical" href="/">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Fixture"}</script>
</head><body>
<main><h1>SiteProof Fixture</h1><h2>Audit test</h2>
<a href="/contact">Contact us</a><a href="tel:+15551234567">Call</a>
<form action="/lead" method="post"><label for="email">Email</label><input id="email" name="email" type="email" required><button>Submit</button></form>
<img src="/hero.png" alt="Fixture hero">
</main></body></html>`;

async function withServer<T>(fn:(origin:string)=>Promise<T>):Promise<T>{
  const server=http.createServer((req,res)=>{
    res.setHeader('content-type','text/html; charset=utf-8');
    res.setHeader('strict-transport-security','max-age=31536000');
    res.setHeader('content-security-policy',"default-src 'self'");
    if(req.url==='/contact'){res.end('<title>Contact</title><h1>Contact</h1>');return;}
    if(req.url==='/lead'){res.statusCode=204;res.end();return;}
    res.end(fixture);
  });
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));
  const address=server.address();
  if(!address || typeof address==='string') throw new Error('No fixture address');
  try{return await fn(`http://127.0.0.1:${address.port}`);}finally{await new Promise<void>((resolve,reject)=>server.close(e=>e?reject(e):resolve()));}
}

test('fast page audit extracts evidence and conversion inventory',async()=>{
  const { auditPage }=await import('../src/page-audit.js');
  await withServer(async origin=>{
    const out=await auditPage(origin,{mode:'fast'});
    assert.equal(out.status,200);
    assert.equal(out.title,'SiteProof Fixture');
    assert.deepEqual(out.h1,['SiteProof Fixture']);
    assert.equal(out.forms.length,1);
    assert.equal(out.forms[0].fields[0].label,'Email');
    assert.ok(out.phoneLinks.some(x=>x.startsWith('tel:')));
    assert.ok(out.ctas.some(x=>x.type==='contact'));
    assert.ok(out.schemas.some(x=>x.valid && x.type.includes('WebSite')));
  });
});
