import { test, expect } from '@playwright/test';
for(const hostmode of ['peer','server'])test(`${hostmode}: four browsers, immediate movement, synchronized positions`,async({browser})=>{
 const pages=[],errors=[];
 for(let i=0;i<4;i++){const page=await browser.newPage();pages.push(page);await page.addInitScript(()=>{window.VOIDRUNNER_ICE_SERVERS=[]});page.on('pageerror',e=>errors.push(e.message));if(hostmode==='peer')await page.addInitScript(()=>{const original=RTCDataChannel.prototype.send;RTCDataChannel.prototype.send=function(data){let m;try{m=JSON.parse(data)}catch{}if(m?.type==='frames'||m?.type==='state'){const channel=this;setTimeout(()=>{if(channel.readyState==='open')original.call(channel,data)},100)}else original.call(this,data)}});await page.goto('http://127.0.0.1:3000/');await page.locator('#online').click();await page.locator('#hostmode').selectOption(hostmode);await page.locator('#pilotname').fill('Pilot '+i)}
 try{
 await pages[0].locator('#createRoom').click();await expect(pages[0].locator('#netbar')).toBeVisible();const code=await pages[0].locator('#netbar b').innerText();
 for(let i=1;i<4;i++){await pages[i].locator('#roomcode').fill(code);await pages[i].locator('#joinRoom').click();await expect(pages[i].locator('.pilotcard')).toHaveCount(i+1,{timeout:12000})}
 await expect(pages[0].locator('.pilotcard')).toHaveCount(4);await pages[0].locator('#startSquad').click();
 for(const p of pages)await expect.poll(()=>p.evaluate(()=>window.netDiagnostics().phase)).toBe('play');
 const guest=pages[1];const before=await guest.evaluate(()=>window.netDiagnostics());await guest.keyboard.down('ArrowRight');await guest.waitForTimeout(120);const during=await guest.evaluate(()=>window.netDiagnostics());await guest.keyboard.up('ArrowRight');expect(during.predicted.x).toBeGreaterThan(before.predicted.x+10);if(hostmode==='peer'){const authoritative=during.players.find(p=>p.id===during.me);expect(during.predicted.x).toBeGreaterThan(authoritative.x+5);}
 await guest.waitForTimeout(400);const settled=await guest.evaluate(()=>window.netDiagnostics());const host=await pages[0].evaluate(()=>window.netDiagnostics());const guestOnHost=host.players.find(p=>p.id===settled.me);expect(Math.abs(guestOnHost.x-settled.predicted.x)).toBeLessThan(12);
 await guest.keyboard.down('Space');await guest.waitForTimeout(200);await guest.keyboard.up('Space');expect(errors).toEqual([]);
 }catch(error){for(const p of pages)console.log('CLIENT FAILURE',await p.evaluate(()=>({text:document.body.innerText,diagnostics:window.netDiagnostics?.()})));throw error;}finally{for(const p of pages)await p.close()}
});
