import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
const Schema=z.object({missionId:z.number().int().min(1).max(4),status:z.enum(['scheduled','live','forced_open','closed','emergency_locked'])});
export async function POST(req:Request){try{const input=Schema.parse(await req.json());const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();if(!user)return NextResponse.json({error:'Authentication required.'},{status:401});const {data:profile}=await supabase.from('profiles').select('role').eq('id',user.id).single();if(profile?.role!=='admin')return NextResponse.json({error:'Admin role required.'},{status:403});const {error}=await supabase.from('missions').update({status:input.status}).eq('id',input.missionId);if(error)throw error;return NextResponse.json({ok:true});}catch(e){return NextResponse.json({error:e instanceof Error?e.message:'Unable to update mission.'},{status:400});}}
