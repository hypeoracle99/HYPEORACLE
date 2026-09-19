/**
 * HypeOracle X (Twitter) API v2 Client with Server-Side OAuth 1.0a Signing
 * 
 * Supports:
 * - Single Tweet publishing
 * - Multi-tweet Thread publishing (chained via reply.in_reply_to_tweet_id)
 * - Contextual replies/comments to mentions
 * - Account verification & rate limit inspection
 * - Graceful zero-credential Sandbox mode
 */

import crypto from 'crypto';
import { XApiCredentials } from '@/lib/x-manager-types';

export function getXCredentials(): XApiCredentials {
  const apiKey = process.env.X_API_KEY || process.env.TWITTER_API_KEY || '';
  const apiSecret = process.env.X_API_SECRET || process.env.TWITTER_API_SECRET || '';
  const accessToken = process.env.X_ACCESS_TOKEN || process.env.TWITTER_ACCESS_TOKEN || '';
  const accessTokenSecret = process.env.X_ACCESS_SECRET || process.env.TWITTER_ACCESS_SECRET || '';
  const bearerToken = process.env.X_BEARER_TOKEN || process.env.TWITTER_BEARER_TOKEN || '';

  const isConfigured = Boolean(apiKey && apiSecret && accessToken && accessTokenSecret);

  return {
    apiKey,
    apiSecret,
    accessToken,
    accessTokenSecret,
    bearerToken,
    isConfigured
  };
}

/**
 * Generates an RFC 5849 OAuth 1.0a Authorization header with HMAC-SHA1 signature
 */
function generateOAuth1Header(
  method: string,
  url: string,
  creds: XApiCredentials,
  extraParams: Record<string, string> = {}
): string {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken!,
    oauth_version: '1.0',
    ...extraParams
  };

  // Sort and encode all parameters
  const encodedParams = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(oauthParams[k])}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url.split('?')[0]),
    encodeURIComponent(encodedParams)
  ].join('&');

  const signingKey = `${encodeURIComponent(creds.apiSecret!)}&${encodeURIComponent(creds.accessTokenSecret!)}`;
  const signature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

  oauthParams.oauth_signature = signature;

  const headerComponents = Object.keys(oauthParams)
    .sort()
    .map((k) => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`);

  return `OAuth ${headerComponents.join(', ')}`;
}

export interface PublishResult {
  success: boolean;
  xTweetId?: string;
  threadTweetIds?: string[];
  mode: 'live' | 'sandbox';
  message: string;
}

/**
 * Publishes a single tweet or multi-tweet thread to X via official API v2
 */
export async function publishToX(
  primaryText: string,
  threadItems: string[] = [],
  inReplyToTweetId?: string
): Promise<PublishResult> {
  const creds = getXCredentials();

  // Graceful Sandbox Mode if credentials are not configured
  if (!creds.isConfigured) {
    const mockId = `mock_tweet_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
    const mockThreadIds = threadItems.map((_, i) => `${mockId}_t${i + 1}`);
    return {
      success: true,
      xTweetId: mockId,
      threadTweetIds: mockThreadIds,
      mode: 'sandbox',
      message: 'Published in Sandbox Mode (X API credentials not populated in server environment).'
    };
  }

  try {
    const url = 'https://api.twitter.com/2/tweets';

    // 1. Post Primary Tweet
    const firstPayload: any = { text: primaryText };
    if (inReplyToTweetId) {
      firstPayload.reply = { in_reply_to_tweet_id: inReplyToTweetId };
    }

    const authHeader = generateOAuth1Header('POST', url, creds);

    const firstRes = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader
      },
      body: JSON.stringify(firstPayload)
    });

    const firstData = await firstRes.json();

    if (!firstRes.ok) {
      const errDetail = firstData?.errors?.[0]?.message || firstData?.detail || firstRes.statusText;
      throw new Error(`X API Error (${firstRes.status}): ${errDetail}`);
    }

    const firstTweetId = firstData?.data?.id;
    let lastTweetId = firstTweetId;
    const threadTweetIds: string[] = [];

    // 2. Post thread items sequentially if present
    for (const itemText of threadItems) {
      if (!itemText.trim()) continue;

      const threadPayload = {
        text: itemText,
        reply: { in_reply_to_tweet_id: lastTweetId }
      };

      const threadAuth = generateOAuth1Header('POST', url, creds);
      const threadRes = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: threadAuth
        },
        body: JSON.stringify(threadPayload)
      });

      const threadData = await threadRes.json();
      if (threadRes.ok && threadData?.data?.id) {
        lastTweetId = threadData.data.id;
        threadTweetIds.push(lastTweetId);
      }
    }

    return {
      success: true,
      xTweetId: firstTweetId,
      threadTweetIds,
      mode: 'live',
      message: 'Successfully broadcasted to official X timeline.'
    };
  } catch (err: any) {
    console.error('[XApiClient] Publish failed:', err.message);
    throw err;
  }
}

/**
 * Tests live connection with X API v2
 */
export async function testXConnection(): Promise<{
  connected: boolean;
  username?: string;
  mode: 'live' | 'sandbox';
  message: string;
}> {
  const creds = getXCredentials();
  if (!creds.isConfigured) {
    return {
      connected: true,
      username: 'HypeOracle',
      mode: 'sandbox',
      message: 'Sandbox Mode Active: Add X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET in .env.local to enable live broadcasting.'
    };
  }

  try {
    const url = 'https://api.twitter.com/2/users/me';
    const authHeader = generateOAuth1Header('GET', url, creds);

    const res = await fetch(url, {
      method: 'GET',
      headers: { Authorization: authHeader }
    });

    const data = await res.json();
    if (res.ok && data?.data?.username) {
      return {
        connected: true,
        username: data.data.username,
        mode: 'live',
        message: `Connected live to @${data.data.username} via X API v2.`
      };
    }

    throw new Error(data?.detail || res.statusText);
  } catch (err: any) {
    return {
      connected: false,
      mode: 'live',
      message: `X API Connection Error: ${err.message}`
    };
  }
}
