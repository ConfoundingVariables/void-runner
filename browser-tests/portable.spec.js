import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
const portable=pathToFileURL(path.resolve('downloads/voidrunner.html')).href;
test('single file runs solo offline without fetching assets',async({browser})=>{
 const context=await browser.newContext({offline:true});const page=await context.newPage();const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(!r.url().startsWith('file:'))requests.push(r.url())});
 try{await page.goto(portable);await page.locator('#start').click();await expect(page.locator('#overlay')).toBeHidden();await page.keyboard.down('Space');await page.waitForTimeout(150);await page.keyboard.up('Space');expect(requests).toEqual([]);expect(errors).toEqual([])}finally{await context.close()}
});
for(const fileHost of [true,false])test(`portable ${fileHost?'hosts':'joins'} a browser peer match`,async({browser})=>{
 const pages=[],errors=[];try{for(let i=0;i<2;i++){const p=await browser.newPage();pages.push(p);await p.addInitScript(()=>{window.VOIDRUNNER_ICE_SERVERS=[]});p.on('pageerror',e=>errors.push(e.message));const fromFile=i===0?fileHost:!fileHost;await p.goto(fromFile?portable+'?server=http://127.0.0.1:3000':'http://127.0.0.1:3000/');await p.locator('#online').click();await p.locator('#hostmode').selectOption('peer');}
 await pages[0].locator('#createRoom').click();await expect(pages[0].locator('#netbar')).toBeVisible();const code=await pages[0].locator('#netbar b').innerText();await pages[1].locator('#roomcode').fill(code);await pages[1].locator('#joinRoom').click();await expect(pages[0].locator('.pilotcard')).toHaveCount(2);await pages[0].locator('#startSquad').click();for(const p of pages)await expect.poll(()=>p.evaluate(()=>window.netDiagnostics().phase)).toBe('play');expect(errors).toEqual([]);
 }finally{for(const p of pages)await p.close()}
});
