import dns from 'node:dns/promises';
import net from 'node:net';
import { config } from './config.js';

function isPrivateV4(ip:string):boolean {
  const [a,b] = ip.split('.').map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127) || (a >= 224);
}
function isPrivateV6(ip:string):boolean {
  const v = ip.toLowerCase();
  return v === '::1' || v === '::' || v.startsWith('fc') || v.startsWith('fd') || v.startsWith('fe8') || v.startsWith('fe9') || v.startsWith('fea') || v.startsWith('feb') || v.startsWith('::ffff:127.') || v.startsWith('::ffff:10.') || v.startsWith('::ffff:192.168.');
}
export function isPrivateIp(ip:string):boolean {
  const family = net.isIP(ip);
  return family === 4 ? isPrivateV4(ip) : family === 6 ? isPrivateV6(ip) : true;
}
export async function assertSafeUrl(input:string):Promise<URL> {
  const url = new URL(input);
  if (!['http:','https:'].includes(url.protocol)) throw new Error('Only http:// and https:// targets are allowed.');
  if (url.username || url.password) throw new Error('Credentials in target URLs are not allowed.');
  if (config.allowPrivateTargets) return url;
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local')) throw new Error('Local/private targets are blocked.');
  const records = await dns.lookup(host, { all:true, verbatim:true });
  if (!records.length) throw new Error(`Could not resolve target host: ${host}`);
  if (records.some(r => isPrivateIp(r.address))) throw new Error('Private, loopback, link-local and reserved network targets are blocked.');
  return url;
}
