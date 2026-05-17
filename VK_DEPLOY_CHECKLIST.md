## VK redeploy checklist

1. Deploy the backend first.
2. Make sure the backend environment includes `VK_MINI_APP_SECRET`.
3. Keep `BOT_TOKEN` and `ADMIN_ID` configured so moderation notifications continue to work.
4. Cloudinary variables are now optional for ad images:
   `VITE_CLOUDINARY_CLOUD_NAME`
   `VITE_CLOUDINARY_UPLOAD_PRESET`
5. If Cloudinary is not configured, the client uses Firebase Storage fallback.
6. Rebuild the client before publishing to VK Hosting:
   `npm run build`
7. For Vercel deploy the `client` app as before.
8. For VK Hosting you can use the prepared `client/dist` bundle or zip it again after build.
