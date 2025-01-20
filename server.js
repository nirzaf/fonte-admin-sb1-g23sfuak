const express = require('express');
const cors = require('cors');
const ImageKit = require('imagekit');

const app = express();
app.use(cors());
app.use(express.json());

const imagekit = new ImageKit({
    publicKey: process.env.VITE_IMAGEKIT_PUBLIC_KEY,
    privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
    urlEndpoint: process.env.VITE_IMAGEKIT_URL_ENDPOINT
});

app.get('/auth', (req, res) => {
    try {
        const authenticationParameters = imagekit.getAuthenticationParameters();
        res.json(authenticationParameters);
    } catch (err) {
        console.error('ImageKit auth error:', err);
        res.status(500).json({ error: 'Failed to generate authentication parameters' });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
