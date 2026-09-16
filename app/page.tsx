import Storefront from './storefront';
import {db,settings} from '@/lib/store-server';
export const dynamic='force-dynamic';
export default async function Page(){
 let initialData=null;
 try {const [products,s]=await Promise.all([db().prepare('SELECT * FROM products WHERE active=1 ORDER BY updated DESC LIMIT 500').all(),settings()]);initialData={products:products.results,settings:s,cart:{items:[],revision:''},profile:{saved:[]},orders:[],admin:false,user:null};}catch(e){console.error('Catalogue temporarily unavailable');}
 return <Storefront initialData={initialData}/>;
}
