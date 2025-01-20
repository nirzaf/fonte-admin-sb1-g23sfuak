import ImageKit from 'imagekit';

const imagekit = new ImageKit({
    publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY || '',
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY || '',
    urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT || ''
});

export default function handler(req: any, res: any) {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        res.status(200).json(authenticationParameters);
    } catch (err) {
        console.error('ImageKit auth error:', err);
        res.status(500).json({ error: 'Failed to generate authentication parameters' });
    }
}
