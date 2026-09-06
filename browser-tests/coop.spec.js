import { test, expect } from '@playwright/test';
for(const hostmode of ['peer','server'])test(`${hostmode}: four browsers, immediate movement, synchronized positions`,async({browser})=>{
 const pages=[],errors=[];
 for(let i=0;i<4;i++){const page=await browser.newPage();pages.push(page);page.on('pageerror',e=>errors.push(e.message));await page.goto('http://127.0.0.1:3000/');await page.locator('#online').click();await page.locator('#hostmode').selectOption(hostmode);await page.locator('#pilotname').fill('Pilot '+i)}
 try{
 await pages[0].locator('#createRoom').click();await expect(pages[0].locator('#netbar')).toBeVisible();const code=await pages[0].locator('#netbar b').innerText();
 for(let i=1;i<4;i++){await pages[i].locator('#roomcode').fill(code);await pages[i].locator('#joinRoom').click();await expect(pages[i].locator('.pilotcard')).toHaveCount(i+1)}
 await expect(pages[0].locator('.pilotcard')).toHaveCount(4);await pages[0].locator('#startSquad').click();
 for(const p of pages)await expect.poll(()=>p.evaluate(()=>window.netDiagnostics().phase)).toBe('play');
 const guest=pages[1];const before=await guest.evaluate(()=>window.netDiagnostics());await guest.keyboard.down('ArrowRight');await guest.waitForTimeout(120);const during=await guest.evaluate(()=>window.netDiagnostics());await guest.keyboard.up('ArrowRight');expect(during.predicted.x).toBeGreaterThan(before.predicted.x+10);
 await guest.waitForTimeout(400);const settled=await guest.evaluate(()=>window.netDiagnostics());const host=await pages[0].evaluate(()=>window.netDiagnostics());const guestOnHost=host.players.find(p=>p.id===settled.me);expect(Math.abs(guestOnHost.x-settled.predicted.x)).toBeLessThan(12);
 await guest.keyboard.down('Space');await guest.waitForTimeout(200);await guest.keyboard.up('Space');expect(errors).toEqual([]);
 }finally{for(const p of pages)await p.close()}
});
