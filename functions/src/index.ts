import { onRequest } from "firebase-functions/v2/https";
import * as ImageKit from 'imagekit';

const imagekit = new ImageKit({
    publicKey: process.env.IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT || ''
});

export const imagekitAuth = onRequest({ cors: true }, async (request, response) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        response.json(authenticationParameters);
    } catch (err) {
        console.error('ImageKit auth error:', err);
        response.status(500).json({ error: 'Failed to generate authentication parameters' });
    }
});
