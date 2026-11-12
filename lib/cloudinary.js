import crypto from 'crypto';

export function cldConfig() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

export function signParams(params, secret) {
  const str = Object.keys(params)
    .sort()
    .map((k) => k + '=' + params[k])
    .join('&');
  return crypto.createHash('sha1').update(str + secret).digest('hex');
}

export function thumb(url, w) {
  return String(url).replace('/upload/', '/upload/f_auto,q_auto,w_' + w + '/');
}

export async function destroyImage(publicId) {
  const c = cldConfig();
  if (!c || !publicId) return false;
  try {
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = signParams({ public_id: publicId, timestamp }, c.apiSecret);
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: c.apiKey,
      signature,
    });
    const r = await fetch('https://api.cloudinary.com/v1_1/' + c.cloudName + '/image/destroy', {
      method: 'POST',
      body,
    });
    return r.ok;
  } catch (e) {
    return false;
  }
}
