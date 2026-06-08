# PWA Builder Setup Checklist for Signal Hunt

## ✅ Fixed Issues

- [x] Corrected `start_url` from `/signal-hunt-app-live.vercel.app` to `/`
- [x] Updated icon paths to use relative URLs instead of absolute local paths
- [x] Fixed service worker registration in index.html
- [x] Fixed manifest.json link in index.html
- [x] Added app store metadata (screenshots, shortcuts)
- [x] Fixed categories field

## 📋 Remaining Steps Before PWA Builder Packaging

### 1. **Copy Icon Files to Public Folder**

Your icons are currently stored in your design files folder. You need to copy them to `frontend/public/`:

Required files:

```
frontend/public/
├── icon-192.png          (192x192, non-maskable)
├── icon-192-maskable.png (192x192, maskable format)
├── icon-512.png          (512x512, non-maskable)
└── icon-512-maskable.png (512x512, maskable format)
```

**Copy from:**
`c:/Users/user/Documents/DESIGN FILES/DESIGNS FOR CLIENTS/THE KREATOR/SIGNAL HUNT BRANDING/1x/1x/`

### 2. **Create Screenshots for App Store**

You need two screenshots:

- **screenshot-540.png**: 540x720 pixels (narrow/mobile format) - portrait
- **screenshot-1280.png**: 1280x720 pixels (wide/desktop format) - landscape

Save both to `frontend/public/` folder

Screenshot recommendations:

- Show the main hunt interface
- Highlight key features (prospect form, intelligence scores)
- Use your brand colors (#0b0f19 background, #8091f2 accents)

### 3. **Update Backend Configuration**

Ensure your `backend/.env` is properly configured:

```env
NODE_ENV=production
PORT=3001
# Add any API keys and credentials needed
# Make sure CORS allows your frontend domain
```

### 4. **Build and Deploy**

**Frontend Build:**

```bash
cd frontend
npm run build
```

**For Vercel Deployment:**

```bash
# Ensure vercel.json is configured
# Your frontend builds to dist/ folder
# Make sure backend is also deployed or accessible
```

### 5. **Test PWA Locally**

Before using PWA Builder:

```bash
# Build frontend
npm run build

# Install a simple HTTP server
npm install -g http-server

# Serve from dist folder (from frontend directory)
http-server dist
```

Then test in browser:

- Open DevTools → Application tab
- Check Manifest is loaded correctly
- Verify Service Worker is registered
- Look for any console errors

### 6. **Use PWA Builder**

Go to: https://www.pwabuilder.com/

**Steps:**

1. Enter your deployed URL (your Vercel app URL)
2. PWA Builder will scan your manifest and service worker
3. It will suggest improvements and validate your configuration
4. Download the generated files
5. Follow platform-specific instructions:
   - **Android APK**: Generate signed APK or upload to Google Play Console
   - **Windows**: Generate MSIX package
   - **macOS/iOS**: Use App Clips or Web App

### 7. **App Store Submission Requirements**

#### **Google Play Store** (Android)

- Create Google Play Developer account ($25 one-time)
- Sign your APK with proper certificates
- Prepare store listing with:
  - Screenshots (multiple)
  - Description
  - Privacy policy URL
  - Contact email
  - Category: Productivity/Business
- Follow their 2-3 day review process

#### **Apple App Store** (iOS)

- Create Apple Developer account ($99/year)
- Use PWA Builder's iOS web app wrapper
- Prepare app details:
  - Screenshots (5-7)
  - Description
  - Privacy policy
  - Support URL
- Follow their review guidelines (1-3 days typically)

#### **Microsoft Store** (Windows)

- Use Microsoft Partner Center
- Easier than Android/iOS
- Similar requirements for descriptions and screenshots

### 8. **Privacy Policy & Legal**

Create a privacy policy page and link it in:

- Your app (typically in footer)
- PWA Builder configuration
- Each app store listing

### 9. **Backend Requirements for Production**

Verify your backend is ready:

- [ ] HTTPS enabled (required for PWA)
- [ ] CORS properly configured for frontend domain
- [ ] Environment variables set correctly
- [ ] Database connections tested
- [ ] Error handling and logging in place
- [ ] API rate limiting if needed

### 10. **Manifest Validation**

Run this validation before PWA Builder:

Your manifest now includes:

- ✅ Valid `start_url` (/)
- ✅ Icons with maskable format
- ✅ Theme colors
- ✅ Display mode (standalone)
- ✅ Screenshots metadata
- ✅ Shortcuts for quick actions
- ✅ Description
- ✅ Categories

---

## 📱 App Store URLs (Once Published)

After successful publishing, you'll get:

- **Android**: `https://play.google.com/store/apps/details?id=...`
- **iOS**: `https://apps.apple.com/app/...`
- **Windows**: `https://www.microsoft.com/store/apps/...`

---

## 🐛 Troubleshooting Common PWA Builder Errors

| Error                            | Solution                                                                      |
| -------------------------------- | ----------------------------------------------------------------------------- |
| "Manifest not found"             | Ensure manifest is at `/manifest.json` and `<link rel="manifest">` is in HTML |
| "Invalid icons"                  | Icons must be in `/public/` folder, not local paths                           |
| "Service Worker not found"       | Ensure `/service-worker.js` is in root of `public/` folder                    |
| "HTTPS required"                 | All production PWAs must use HTTPS (Vercel provides this)                     |
| "Missing screenshots"            | Add screenshot images to `/public/` with correct dimensions                   |
| "Content Security Policy errors" | Check headers on your deployed site                                           |

---

## 🚀 Next Steps

1. Copy icon files to `frontend/public/`
2. Create screenshots (540x720 and 1280x720)
3. Test locally with `http-server`
4. Visit PWA Builder with your Vercel URL
5. Follow their APK generation process
6. Set up app store developer accounts
7. Submit for review

---

**Questions?** Let me know if you need help with any specific step!
