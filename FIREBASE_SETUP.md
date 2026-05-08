# 🚀 Hosting & Troubleshooting Ka-Ching!

Your app is fully configured and ready to be hosted.

---

## 1. Hosting Options

### Option A: Netlify / Vercel (Easiest)
1. Push this code to a **GitHub repository**.
2. Connect the repository to Netlify or Vercel.
3. Build Settings:
   - **Build Command:** `npm run build`
   - **Publish Directory:** `dist`
4. **CRITICAL:** Add your new domain (e.g., `aman-tracker-app.netlify.app`) to the **Authorized Domains** list in your Firebase Console (Authentication -> Settings -> Authorized Domains).

### Option B: Firebase Hosting
1. Install CLI: `npm install -g firebase-tools`
2. Run `firebase login` and `firebase use --add aman-tracker-app`.
3. Run `npm run build` and `firebase deploy`.

---

## 2. ⚠️ MANDATORY Firestore Setup
The Dashboard **will not work** until you create this index:
1. Go to your **Firebase Console**.
2. Open **Firestore Database** -> **Indexes** tab.
3. Click **Create Index**.
4. Collection ID: `expenses`
5. Fields:
   - `userId` (Ascending)
   - `timestamp` (Descending)
6. Click **Save**. (Wait 5 minutes for it to build).

---

## 3. 🛠 Troubleshooting "It doesn't work"

### "Login fails" or "Authorized Domain error"
- **Fix:** Go to Firebase Console -> Authentication -> Settings -> Authorized Domains.
- Add `aman-tracker-app.netlify.app` to the list.

### "Dashboard is empty" or "Showing error"
- **Fix:** Ensure you created the **Composite Index** mentioned in Step 2.
- Check the browser console (Inspect Element) for any error links.

### "PWA icon not showing"
- **Fix:** On iPhone, you must use **Safari** to "Add to Home Screen".
- Chrome/Firefox on iOS do not support full PWA installation.
