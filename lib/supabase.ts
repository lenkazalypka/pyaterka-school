import { createServerClient } from "@supabase/ssr"; import { cookies } from "next/headers";
export function configured(){return !!(process.env.NEXT_PUBLIC_SUPABASE_URL&&process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)}
export async function supabase(){const c=await cookies();const url=process.env.NEXT_PUBLIC_SUPABASE_URL,key=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;if(!url||!key)throw new Error("Supabase not configured");return createServerClient(url,key,{cookies:{getAll:()=>c.getAll(),setAll:(all)=>{try{all.forEach(x=>c.set(x.name,x.value,x.options))}catch{}}}})}
