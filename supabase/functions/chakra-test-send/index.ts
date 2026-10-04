import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

// One-off server-side test: send a WhatsApp authentication template via ChakraHQ.
// No UI, no public endpoint usage — invoked once manually, then removed.

const PLUGIN_ID = '176a71cc-6f86-4e29-b2cf-ec39b75c9dff'
const RECIPIENT = '201154696239'
const WHATSAPP_PHONE_NUMBER_ID = '972655752602773'
const TEMPLATE_NAME = 'analyst_verification'
const TEST_CODE = '123456'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const token = Deno.env.get('CHAKRA_ACCESS_TOKEN')
  if (!token) {
    return new Response(JSON.stringify({ ok: false, error: 'CHAKRA_ACCESS_TOKEN is not configured' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const url = `https://api.chakrahq.com/v1/ext/plugin/whatsapp/${PLUGIN_ID}/phoneNumber/${RECIPIENT}/send-template-message`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        whatsappPhoneNumberId: WHATSAPP_PHONE_NUMBER_ID,
        templateName: TEMPLATE_NAME,
        languageCode: 'en',
        mapping: [{ schemaPropertyName: '1', schemaPropertyValue: TEST_CODE }],
      }),
    })

    const bodyText = await response.text()
    let parsed: unknown = null
    try {
      parsed = JSON.parse(bodyText)
    } catch {
      parsed = null
    }

    // Sanitized result: never include the token or full upstream headers.
    const data = (parsed as { _data?: Record<string, unknown> } | null)?._data
    const result = {
      ok: response.ok,
      status: response.status,
      messageId: data?.id ?? null,
      externalId: data?.externalId ?? null,
      deliveryStatus: data?.deliveryStatus ?? null,
      rawBody: response.ok ? undefined : bodyText.slice(0, 2000),
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
