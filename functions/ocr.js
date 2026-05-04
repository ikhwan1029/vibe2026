// Cloudflare Pages Function — Naver Clova OCR 프록시
// 환경 변수: CLOVA_OCR_URL, CLOVA_OCR_SECRET

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function onRequestOptions() {
  return new Response(null, { headers: CORS });
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.CLOVA_OCR_URL || !env.CLOVA_OCR_SECRET) {
    return Response.json(
      { error: 'OCR_NOT_CONFIGURED' },
      { status: 503, headers: CORS }
    );
  }

  let image, format;
  try {
    ({ image, format = 'jpg' } = await request.json());
  } catch {
    return Response.json({ error: 'INVALID_JSON' }, { status: 400, headers: CORS });
  }

  if (!image) {
    return Response.json({ error: 'NO_IMAGE' }, { status: 400, headers: CORS });
  }

  const clovaRes = await fetch(env.CLOVA_OCR_URL, {
    method: 'POST',
    headers: {
      'X-OCR-SECRET': env.CLOVA_OCR_SECRET,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      version: 'V2',
      requestId: crypto.randomUUID(),
      timestamp: Date.now(),
      images: [{ format, name: 'label', data: image }],
    }),
  });

  if (!clovaRes.ok) {
    const detail = await clovaRes.text();
    return Response.json(
      { error: 'CLOVA_ERROR', detail },
      { status: 502, headers: CORS }
    );
  }

  const result = await clovaRes.json();
  const fields = result.images?.[0]?.fields ?? [];

  // lineBreak 속성을 이용해 줄 구조 복원
  let text = '';
  fields.forEach((f, i) => {
    text += f.inferText;
    if (f.lineBreak) {
      text += '\n';
    } else if (i < fields.length - 1) {
      text += ' ';
    }
  });

  return Response.json(
    { text: text.trim(), engine: 'clova', fieldCount: fields.length },
    { headers: { ...CORS, 'Content-Type': 'application/json' } }
  );
}
