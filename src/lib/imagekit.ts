import ImageKit from 'imagekit-javascript';

export const imagekit = new ImageKit({
    publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY || '',
    urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT || '',
    authenticationEndpoint: import.meta.env.VITE_IMAGEKIT_AUTH_ENDPOINT || '',
});
