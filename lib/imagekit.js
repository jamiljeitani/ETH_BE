const ImageKit = require("imagekit");

let imagekit = null;

// Initialize ImageKit only if all required environment variables are present
if (process.env.IMAGEKIT_PUBLIC_KEY && process.env.IMAGEKIT_PRIVATE_KEY && process.env.IMAGEKIT_URL_ENDPOINT) {
    imagekit = new ImageKit({
        publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
        privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
        urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT,
    });
} else {
    console.warn('[ImageKit] Skipping initialization - missing environment variables');
}

module.exports = { imagekit };
