import * as https from 'node:https';
import * as dotenv from 'dotenv';
import * as path from 'node:path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const {
  STRAVA_CLIENT_ID,
  STRAVA_CLIENT_SECRET,
  STRAVA_WEBHOOK_VERIFY_TOKEN,
  NEXT_PUBLIC_APP_URL,
} = process.env;

type ApiResponse = Record<string, unknown>;

function makeRequest(options: https.RequestOptions, postData?: string): Promise<ApiResponse> {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });
      res.on('end', () => {
        try {
          if (data) {
            resolve(JSON.parse(data));
          } else {
            resolve({ statusCode: res.statusCode });
          }
        } catch {
          reject(new Error(`Failed to parse response (Status ${res.statusCode}): ${data}`));
        }
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (postData) {
      req.write(postData);
    }
    req.end();
  });
}

async function listSubscriptions() {
  console.log('Listing active Strava subscriptions...');
  
  const options: https.RequestOptions = {
    method: 'GET',
    hostname: 'www.strava.com',
    path: `/api/v3/push_subscriptions?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`,
  };

  try {
    const subs = await makeRequest(options);
    console.log('Active Subscriptions:', JSON.stringify(subs, null, 2));
  } catch (error) {
    console.error('Error listing subscriptions:', error);
  }
}

async function createSubscription() {
  if (!STRAVA_WEBHOOK_VERIFY_TOKEN) {
    console.error('Error: STRAVA_WEBHOOK_VERIFY_TOKEN is not defined in .env.local');
    return;
  }

  const callbackUrl = `${NEXT_PUBLIC_APP_URL}/api/v2/strava/webhook`;
  console.log(`Creating subscription for ${callbackUrl}...`);

  // IMPORTANT: Strava requires form-data/urlencoded for creation, NOT JSON
  const params = new URLSearchParams();
  params.append('client_id', STRAVA_CLIENT_ID!);
  params.append('client_secret', STRAVA_CLIENT_SECRET!);
  params.append('callback_url', callbackUrl);
  params.append('verify_token', STRAVA_WEBHOOK_VERIFY_TOKEN);

  const postData = params.toString();

  const options: https.RequestOptions = {
    method: 'POST',
    hostname: 'www.strava.com',
    path: '/api/v3/push_subscriptions',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Content-Length': Buffer.byteLength(postData),
    },
  };

  try {
    const result = await makeRequest(options, postData);
    console.log('Create Result:', JSON.stringify(result, null, 2));
    if (result.id) {
      console.log(`\nSUCCESS! Add this to your .env.local and Supabase secrets:\nSTRAVA_SUBSCRIPTION_ID=${result.id}`);
    } else if (result.errors) {
      console.error('\nStrava validation errors:', JSON.stringify(result.errors, null, 2));
    }
  } catch (error) {
    console.error('Error creating subscription:', error);
  }
}

async function deleteSubscription(id: string) {
  console.log(`Deleting subscription ${id}...`);
  
  const path = `/api/v3/push_subscriptions/${id}?client_id=${STRAVA_CLIENT_ID}&client_secret=${STRAVA_CLIENT_SECRET}`;
  
  const options: https.RequestOptions = {
    method: 'DELETE',
    hostname: 'www.strava.com',
    path: path,
  };

  try {
    const result = await makeRequest(options);
    console.log('Delete Result:', result);
  } catch (error) {
    console.error('Error deleting subscription:', error);
  }
}

const command = process.argv[2];
const arg = process.argv[3];

async function main() {
  if (!STRAVA_CLIENT_ID || !STRAVA_CLIENT_SECRET) {
    console.error('Error: STRAVA_CLIENT_ID or STRAVA_CLIENT_SECRET not defined in .env.local');
    return;
  }

  switch (command) {
    case 'list':
      await listSubscriptions();
      break;
    case 'create':
      await createSubscription();
      break;
    case 'delete':
      if (!arg) {
        console.error('Error: Please provide a subscription ID to delete.');
      } else {
        await deleteSubscription(arg);
      }
      break;
    default:
      console.log('Usage: npx tsx scripts/strava-manage-webhook.ts [list|create|delete] [id]');
  }
}

main();
