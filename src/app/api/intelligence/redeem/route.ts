import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
const Schema=z.object({code:z.string().min(3).max(80)});
export async function POST(req:Request){
  try{
    const {code}=Schema.parse(await req.json());
    const supabase=await createClient();
    const {data:{user}}=await supabase.auth.getUser(); if(!user) return NextResponse.json({error:'Sign in required.'},{status:401});
    const {data,error}=await supabase.rpc('redeem_bonus_code',{p_code:code.trim()}); if(error) throw error;
    return NextResponse.json({result:Array.isArray(data)?data[0]:data});
  }catch(err){ return NextResponse.json({error:err instanceof Error?err.message:'Unable to verify code.'},{status:400}); }
}
