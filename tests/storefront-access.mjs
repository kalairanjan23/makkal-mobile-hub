// Run with Playwright installed, or set PLAYWRIGHT_MODULE to its package directory.
// This mounts the real storefront and UI components, mocking only API responses.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createServer} from 'node:http';
import {resolve} from 'node:path';
import {mkdirSync,writeFileSync} from 'node:fs';
import {build} from 'vite';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
mkdirSync('.sites-runtime',{recursive:true});
writeFileSync('.sites-runtime/browser-entry.tsx',`import React from 'react';import {createRoot} from 'react-dom/client';import Storefront from '../app/storefront';createRoot(document.getElementById('root')).render(<Storefront initialData={null}/>);`);
const result=await build({configFile:false,logLevel:'error',resolve:{alias:{'@':resolve('.')}},define:{'process.env.NODE_ENV':'"production"'},build:{write:false,lib:{entry:resolve('.sites-runtime/browser-entry.tsx'),name:'StorefrontTest',formats:['iife']}}});
const bundle=(Array.isArray(result)?result[0]:result).output.find(x=>x.type==='chunk'&&x.isEntry).code;
const server=createServer((req,res)=>{
 if(req.url==='/app.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle);}
 else{res.setHeader('Content-Type','text/html');res.end('<!doctype html><html><body><div id="root"></div><script src="/app.js"></script></body></html>');}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
const product={id:'case',name:'Phone case',category:'Cases',compatibility:'Test phone',color:'Black',description:'Case',price:10000,stock:5,active:1,image:''};
const fixture=(kind)=>({settings:{open:false,instagram:'https://example.test'},products:[product],cart:{items:[],revision:''},profile:{saved:[]},orders:[],admin:kind==='admin',user:kind==='guest'?null:{name:kind==='admin'?'Owner':'Customer'}});
let checks=0;
try{
 for(const kind of ['guest','customer','admin']){
  const page=await browser.newPage();let data=fixture(kind);let fail=false;let pending=false;let release;
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/api/store',async route=>{
   if(pending)await new Promise(r=>{release=r;});
   if(route.request().method()==='POST'){
    const body=route.request().postDataJSON();if(body.action==='cart')data.cart={items:body.items,revision:'updated'};
    return route.fulfill({json:{ok:true}});
   }
   return route.fulfill({status:fail?503:200,json:fail?{error:'Account unavailable'}:data});
  });
  await page.goto(base+'/#admin');
  if(kind==='admin'){
   await page.getByRole('heading',{name:'Your store, at a glance.'}).waitFor();
   assert.equal(await page.locator('footer a[href="#admin"]').count(),1);
   for(const tab of ['Products','Orders','Customers','Reports','Settings']){
    await page.getByRole('tab',{name:tab,exact:true}).click();
    assert.equal(await page.getByRole('tab',{name:tab,exact:true}).getAttribute('aria-selected'),'true');
   }
   await page.getByRole('tab',{name:'Products',exact:true}).click();
   await page.getByRole('button',{name:'Add product',exact:true}).click();
   await page.getByRole('dialog').waitFor();
   data=fixture('customer');await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await page.waitForURL('**/#home');assert.equal(await page.getByRole('dialog').count(),0);
  }else{
   await page.waitForURL('**/#home');
   assert.equal(await page.locator('a[href="#admin"]').count(),0);
   assert.equal(await page.locator('.admin-section').count(),0);
   await page.evaluate(()=>{location.hash='account';});
   await page.getByRole('heading',{name:'Saved delivery details'}).waitFor();
   assert.equal(await page.locator('a[href="#admin"]').count(),0);
   // Guest and customer shopping still works.
   await page.evaluate(()=>{location.hash='shop';});
   await page.getByRole('button',{name:'Add Phone case to bag'}).click();
   await page.getByRole('link',{name:'Shopping bag, 1 items'}).waitFor();
  }
  assert.equal(await page.locator('a[href="#admin"]').count(),0);
  // Pending authorization never exposes even a previously privileged account.
  data=fixture('admin');pending=true;
  await page.evaluate(()=>{location.hash='admin';window.dispatchEvent(new Event('focus'));});
  await page.waitForFunction(()=>!document.querySelector('.admin-section'));
  assert.equal(await page.locator('a[href="#admin"]').count(),0);
  pending=false;while(!release)await new Promise(r=>setTimeout(r,10));release();
  await page.locator('footer a[href="#admin"]').waitFor();
  fail=true;await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await page.getByRole('alert').waitFor();
  assert.equal(await page.locator('a[href="#admin"],.admin-section,[role="dialog"]').count(),0);
  assert.deepEqual(errors,[]);checks++;await page.close();
 }
 console.log(`PASS: ${checks} account cases; direct admin hashes, navigation, dashboard tabs, editor revocation, pending/failed authorization and customer baskets.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
