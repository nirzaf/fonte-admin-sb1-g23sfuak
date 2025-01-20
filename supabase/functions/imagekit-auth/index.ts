import { serve } from "https://deno.fresh.dev/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AuthParams {
  token: string;
  expire: number;
  signature: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const privateKey = Deno.env.get('IMAGEKIT_PRIVATE_KEY');
    const publicKey = Deno.env.get('IMAGEKIT_PUBLIC_KEY');
    
    if (!privateKey || !publicKey) {
      throw new Error('ImageKit credentials not configured');
    }

    // Generate timestamp for token expiry (1 hour from now)
    const expire = Math.floor(Date.now() / 1000) + 3600;
    
    // Create the signature string
    const signatureString = `${expire}`;
    
    // Create signature using HMAC SHA1
    const key = new TextEncoder().encode(privateKey);
    const message = new TextEncoder().encode(signatureString);
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      key,
      { name: 'HMAC', hash: 'SHA-1' },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'HMAC',
      cryptoKey,
      message
    );
    
    // Convert signature to base64
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));

    const authParams: AuthParams = {
      token: publicKey,
      expire,
      signature: signatureBase64,
    };

    return new Response(
      JSON.stringify(authParams),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      },
    );
  }
});
