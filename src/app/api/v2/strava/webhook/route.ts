import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

/**
 * Strava Webhook Handler (SAN-26)
 * - GET: Handshake validation with hub.verify_token
 * - POST: Log event and trigger async processing via Edge Function
 */

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.STRAVA_WEBHOOK_VERIFY_TOKEN;

  console.log(`Webhook Handshake: mode=${mode}, token=${token}, expected=${verifyToken}`);

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('Handshake successful, echoing challenge');
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  console.warn(`Handshake failed: Invalid mode or token. Expected: ${verifyToken}, Received: ${token}`);
  return new NextResponse(`Forbidden: Invalid verify token. Expected: ${verifyToken}`, { status: 403 });
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  
  try {
    const payload = await req.json();
    
    // 1. Validate subscription_id if configured
    const expectedSubId = process.env.STRAVA_SUBSCRIPTION_ID;
    if (expectedSubId && payload.subscription_id && payload.subscription_id.toString() !== expectedSubId) {
      console.warn(`Incoming webhook has unexpected subscription_id: ${payload.subscription_id}`);
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // 2. Log the incoming webhook to webhook_logs
    await supabase.from('webhook_logs').insert({
      source: 'strava',
      payload: payload,
    });

    // 3. Trigger asynchronous processing via Supabase Edge Function
    const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/process-strava-activity`;
    
    // Fire-and-forget call to Supabase Edge Function with the full payload
    fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY}`,
      },
      body: JSON.stringify(payload),
    }).catch(err => console.error('Failed to trigger process-strava-activity:', err));

    console.log(`Strava webhook event logged and processing triggered in ${Date.now() - start}ms`);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Strava webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
