import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const client=pathToFileURL(path.resolve('downloads/voidrunner.html')).href+'?server=http://127.0.0.1:8787';
for(const mode of ['server','peer'])test(`Cloudflare Durable Object: four local HTML clients in ${mode} mode`,async({browser,request})=>{
 const pages=[],errors=[];try{
 for(let i=0;i<4;i++){const p=await browser.newPage();pages.push(p);await p.addInitScript(()=>{window.VOIDRUNNER_ICE_SERVERS=[]});p.on('pageerror',e=>errors.push(e.message));await p.goto(client);await p.locator('#online').click();await p.locator('#hostmode').selectOption(mode)}
 await pages[0].locator('#createRoom').click();await expect(pages[0].locator('#netbar')).toBeVisible();const code=await pages[0].locator('#netbar b').innerText();
 for(let i=1;i<4;i++){await pages[i].locator('#roomcode').fill(code);await pages[i].locator('#joinRoom').click();await expect(pages[i].locator('.pilotcard')).toHaveCount(i+1,{timeout:12000})}
 await pages[0].locator('#startSquad').click();for(const p of pages)await expect.poll(()=>p.evaluate(()=>window.netDiagnostics().phase)).toBe('play');
 const guest=pages[1],before=await guest.evaluate(()=>window.netDiagnostics());await guest.keyboard.down('ArrowRight');await guest.waitForTimeout(150);await guest.keyboard.up('ArrowRight');await guest.waitForTimeout(300);const after=await guest.evaluate(()=>window.netDiagnostics());expect(after.predicted.x).toBeGreaterThan(before.predicted.x+15);const observed=await pages[0].evaluate(()=>window.netDiagnostics());expect(Math.abs(observed.players.find(p=>p.id===after.me).x-after.predicted.x)).toBeLessThan(12);expect(errors).toEqual([]);
 }finally{for(const p of pages)await p.close()}
 await expect.poll(async()=>{const r=await request.get('http://127.0.0.1:8787/health');const h=await r.json();return h.rooms+h.peerRooms}).toBe(0);
});
