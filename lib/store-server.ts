import {env} from 'cloudflare:workers';
import {getChatGPTUser} from '@/app/chatgpt-auth';
export function db(){const d=(env as any).DB as D1Database;if(!d)throw new Error('Store unavailable');return d;}
export function bucket(){return (env as any).BUCKET as R2Bucket;}
export async function owner(){const u=await getChatGPTUser();return !!u && !!(env as any).OWNER_EMAIL && u.email.toLowerCase()===String((env as any).OWNER_EMAIL).toLowerCase();}
export function fail(message:string,status=400):never{throw Object.assign(new Error(message),{status});}
export function field(v:unknown,max=500){return typeof v==='string'?v.trim().slice(0,max):'';}
export const defaults={open:false,phone:'',address:'',delivery:'',returns:'',privacy:'',fee:0,freeAbove:0,pincodes:'',announcement:'',instagram:'https://www.instagram.com/makkalmobilehub63/'};
export async function settings(){const r=await db().prepare('SELECT data FROM settings WHERE id=?').bind('store').first<any>();return {...defaults,...(r?JSON.parse(r.data):{})};}
export function originCheck(r:Request){const o=r.headers.get('origin');if(!o||o!==new URL(r.url).origin)fail('Please refresh and try again.',403);}
export async function identity(r:Request){const user=await getChatGPTUser();const match=r.headers.get('cookie')?.match(/(?:^|; )mmh_guest=([a-f0-9-]{36})(?:;|$)/);const guest=match?.[1]||crypto.randomUUID();return {key:user?'user:'+user.userId:'guest:'+guest,user,guest,fresh:!match};}
export function reply(data:any,i?:any,status=200){const h:Record<string,string>={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};if(i?.fresh)h['Set-Cookie']=`mmh_guest=${i.guest}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`;return Response.json(data,{status,headers:h});}
export function error(e:any){console.error('Store operation failed',e?.message);return reply({error:e.status?e.message:'Unable to complete this request. Please retry. No confirmation means your order has not been accepted.'},undefined,e.status||503);}
export async function cart(key:string){const c=await db().prepare('SELECT * FROM carts WHERE id=?').bind(key).first<any>();return c?{items:JSON.parse(c.data),revision:c.revision}:{items:[],revision:''};}
export function publicOrder(o:any,privateData=false){const d=JSON.parse(o.data);return {id:o.id,total:o.total,status:o.status,payment:o.payment,courier:o.courier,tracking:o.tracking,created:o.created,history:JSON.parse(o.history),items:d.items,fee:d.fee,...(privateData?{contact:d.contact,token:o.token}: {})};}
