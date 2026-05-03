import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

interface StravaWebhookPayload {
  subscription_id?: number | string;
  object_type?: string;
  object_id?: number;
  aspect_type?: string;
  owner_id?: number;
  updates?: Record<string, unknown>;
}

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

  if (mode === 'subscribe' && token === verifyToken && challenge) {
    return NextResponse.json({ 'hub.challenge': challenge });
  }

  console.warn('Strava webhook handshake rejected');
  return new NextResponse('Forbidden', { status: 403 });
}

export async function POST(req: NextRequest) {
  const start = Date.now();
  
  try {
    const payload = (await req.json()) as StravaWebhookPayload;

    if (!payload || typeof payload !== 'object') {
      return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }
    
    // 1. Validate subscription_id if configured
    const expectedSubId = process.env.STRAVA_SUBSCRIPTION_ID;
    const incomingSubId = payload.subscription_id?.toString();
    if (expectedSubId && incomingSubId !== expectedSubId) {
      console.warn('Incoming webhook rejected due to unexpected subscription_id');
      return NextResponse.json({ error: 'Invalid subscription ID' }, { status: 401 });
    }

    const supabase = createServiceRoleClient();

    // 2. Log the incoming webhook to webhook_logs
    await supabase.from('webhook_logs').insert({
      source: 'strava',
      payload: payload,
    });

    // 3. Trigger asynchronous processing via Supabase Edge Function
    // We AWAIT this call to ensure the connection is established and the function is triggered
    // in serverless environments. Fire-and-forget can lead to ECONNRESET if the runtime
    // terminates before the TLS handshake completes.
    console.log('Triggering process-strava-activity');
    
    try {
      const { data: funcData, error: funcError } = await supabase.functions.invoke('process-strava-activity', {
        body: payload,
        headers: {
          'X-Webhook-Secret': process.env.SUPABASE_SECRET_KEY || '',
        },
      });

        if (funcError) {
          console.error('Edge Function invocation error:', funcError);
        } else {
          console.log('Edge Function triggered successfully', { ok: !!funcData });
        }
    } catch (fetchErr) {
      console.error('Network error triggering Edge Function:', fetchErr);
    }

    console.log(`Strava webhook event processed in ${Date.now() - start}ms`);
    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Strava webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
