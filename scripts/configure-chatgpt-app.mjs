import fs from 'node:fs';
const id=process.argv[2];
if(!id||!/^plugin_asdk_app[_A-Za-z0-9-]*$/.test(id)){
  console.error('Usage: node scripts/configure-chatgpt-app.mjs plugin_asdk_app_...');
  process.exit(1);
}
fs.writeFileSync('.app.json', JSON.stringify({apps:{siteproof:{id}}}, null, 2)+'\n');
const p='.codex-plugin/plugin.json';
const manifest=JSON.parse(fs.readFileSync(p,'utf8'));
manifest.apps='./.app.json';
fs.writeFileSync(p,JSON.stringify(manifest,null,2)+'\n');
console.log(`Configured SiteProof ChatGPT app mapping: ${id}`);
