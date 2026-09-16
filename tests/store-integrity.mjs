import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import ts from 'typescript';
import {readFileSync,readdirSync} from 'node:fs';
const sql=new DatabaseSync(':memory:');
for(const f of readdirSync('drizzle').filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+f,'utf8'));
let user=null;
function prepare(query){let args=[];return{bind(...values){args=values;return this},async first(){return sql.prepare(query).get(...args)||null},async all(){return{results:sql.prepare(query).all(...args)}},async run(){const st=sql.prepare(query);const rows=st.columns().length?st.all(...args):[];const result=st.columns().length?{changes:sql.prepare('SELECT changes() as n').get().n}:st.run(...args);return{results:rows,meta:{changes:Number(result.changes)}}}}}
const database={prepare,async batch(statements){sql.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());sql.exec('COMMIT');return results}catch(e){sql.exec('ROLLBACK');throw e}}};
globalThis.__storeTest={env:{DB:database,OWNER_EMAIL:'owner@example.invalid'},getUser:async()=>user};
function moduleUrl(text){return 'data:text/javascript;base64,'+Buffer.from(text).toString('base64')}
const dependency=moduleUrl('export const env=globalThis.__storeTest.env;export const getChatGPTUser=()=>globalThis.__storeTest.getUser();');
let helper=ts.transpileModule(readFileSync('lib/store-server.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll('"cloudflare:workers"',JSON.stringify(dependency)).replaceAll("'cloudflare:workers'",JSON.stringify(dependency)).replaceAll("'@/app/chatgpt-auth'",JSON.stringify(dependency)).replaceAll('"@/app/chatgpt-auth"',JSON.stringify(dependency));
const helperUrl=moduleUrl(helper);
const handler=ts.transpileModule(readFileSync('app/api/store/route.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll("'@/lib/store-server'",JSON.stringify(helperUrl)).replaceAll('"@/lib/store-server"',JSON.stringify(helperUrl));
const {GET,POST}=await import(moduleUrl(handler));
const uploadSource=ts.transpileModule(readFileSync('app/api/upload/route.ts','utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ESNext}}).outputText.replaceAll("'@/lib/store-server'",JSON.stringify(helperUrl)).replaceAll('"@/lib/store-server"',JSON.stringify(helperUrl));
const {POST:upload}=await import(moduleUrl(uploadSource));
const cookie='mmh_guest=11111111-1111-4111-8111-111111111111';
async function request(body,origin='https://shop.test'){const response=await POST(new Request('https://shop.test/api/store',{method:'POST',headers:{origin,'content-type':'application/json',cookie},body:JSON.stringify(body)}));return{status:response.status,...await response.json()};}
async function state(){return (await GET(new Request('https://shop.test/api/store',{headers:{cookie}}))).json()}
// Exercise every privileged endpoint for both anonymous and signed-in customers.
for(const visitor of [null,{email:'customer@example.test',userId:'customer',displayName:'Customer'}]){
 user=visitor;
 const data=await state();assert.equal(data.admin,false);assert.equal(!!data.user,!!visitor);
 for(const action of ['product','settings','status'])assert.equal((await request({action})).status,403);
 assert.equal((await upload(new Request('https://shop.test/api/upload',{method:'POST',headers:{origin:'https://shop.test'}}))).status,403);
 assert.equal((await request({action:'cart',items:[]})).status,200);
 assert.equal((await request({action:'profile',profile:{name:'Customer',email:'owner@example.invalid',admin:true,role:'admin'}})).status,200);
 assert.equal((await state()).admin,false,'Editable profile data must not grant admin access');
}
user={email:'owner@example.invalid',userId:'owner',displayName:'Owner'};
assert.equal((await state()).admin,true);
user=null;
assert.equal((await request({action:'settings',settings:{}})).status,403);
assert.equal((await request({action:'cart',items:[]},'https://attacker.test')).status,403);
user={email:'other@example.test',userId:'other',displayName:'Other'};
assert.equal((await request({action:'product',product:{}})).status,403);
user={email:'owner@example.invalid',userId:'owner',displayName:'Owner'};
assert.equal((await request({action:'settings',settings:{open:true}})).status,400);
let result=await request({action:'product',product:{id:'test-product',name:'Test Case',category:'Cases',compatibility:'Test model',color:'Black',price:10000,stock:2,active:1,image:'/media/11111111-1111-4111-8111-111111111111.jpg'}});assert.equal(result.status,200);
result=await request({action:'settings',settings:{open:true,phone:'919876543210',address:'Test address',delivery:'Test delivery',returns:'Test returns',privacy:'Test privacy',fee:5000,freeAbove:0,pincodes:'600001'}});assert.equal(result.status,200);
const staleProduct=(await state()).products[0];user=null;
// Draft inventory and another customer's orders must remain private.
sql.prepare('INSERT INTO products SELECT ?,name,category,compatibility,color,description,price,stock,0,image,updated FROM products WHERE id=?').run('private-draft','test-product');
for(const visitor of [null,{email:'customer@example.test',userId:'customer',displayName:'Customer'}]){user=visitor;assert.equal((await state()).products.some(p=>p.id==='private-draft'),false);}
user={email:'owner@example.invalid',userId:'owner',displayName:'Owner'};assert.equal((await state()).products.some(p=>p.id==='private-draft'),true);
sql.prepare('DELETE FROM products WHERE id=?').run('private-draft');user=null;
const contact={name:'Test Customer',phone:'9876543210',address:'123 Test Street',city:'Chennai',state:'Tamil Nadu',pincode:'600001'};
assert.equal((await request({action:'cart',items:[{id:'test-product',qty:-1}]})).status,400);
await request({action:'cart',items:[{id:'test-product',qty:1}]});let current=await state();
assert.equal(current.admin,false);assert.equal(current.orders.length,0);
const body={action:'checkout',revision:current.cart.revision,contact,accept:true,total:15000};
assert.equal((await request({...body,total:1})).status,409);
assert.equal((await request({...body,contact:{...contact,pincode:'600002'}})).status,400);
let placed=await request(body);assert.equal(placed.status,200);assert.equal(placed.order.payment,'Not collected');assert.equal(sql.prepare('SELECT stock FROM products').get().stock,1);
user={email:'customer@example.test',userId:'customer',displayName:'Customer'};assert.equal((await state()).orders.length,0);user=null;
const duplicate=await request(body);assert.equal(duplicate.order.id,placed.order.id);assert.equal(sql.prepare('SELECT stock FROM products').get().stock,1);assert.equal(sql.prepare('SELECT count(*) n FROM orders').get().n,1);
assert.equal((await request({action:'track',id:placed.order.id,token:'a'.repeat(32)})).status,404);
let tracked=await request({action:'track',id:placed.order.id,token:placed.order.token});assert.equal(tracked.status,200);assert.equal(tracked.order.contact,undefined);assert.equal(tracked.order.token,undefined);
assert.equal((await request({action:'status',id:placed.order.id,status:'Delivered'})).status,403);
user={email:'owner@example.invalid',userId:'owner',displayName:'Owner'};
assert.equal((await request({action:'product',product:{...staleProduct,name:'Stale edit'}})).status,409);
assert.equal((await request({action:'status',id:placed.order.id,status:'Delivered'})).status,400);
assert.equal((await request({action:'status',id:placed.order.id,status:'Cancelled',payment:'Not collected'})).status,200);assert.equal(sql.prepare('SELECT stock FROM products').get().stock,2);
assert.equal((await request({action:'status',id:placed.order.id,status:'Cancelled',payment:'Not collected'})).status,200);assert.equal(sql.prepare('SELECT stock FROM products').get().stock,2);
user=null;await request({action:'cart',items:[{id:'test-product',qty:3}]});current=await state();assert.equal((await request({...body,revision:current.cart.revision,total:35000})).status,409);
// A failed stock constraint must roll back the entire multi-item transaction.
const before=sql.prepare('SELECT stock FROM products').get().stock;
try{await database.batch([prepare('UPDATE products SET stock=stock-1 WHERE id=?').bind('test-product'),prepare('UPDATE products SET stock=stock-10 WHERE id=?').bind('test-product')]);assert.fail('Expected constraint failure')}catch(e){assert.match(e.message,/CHECK constraint/)}
assert.equal(sql.prepare('SELECT stock FROM products').get().stock,before);
console.log('PASS: owner access, cross-origin protection, launch gates, validation, authoritative pricing, private tracking, idempotent ordering, stale inventory edits, status transitions, cancellation restock and transaction rollback.');

