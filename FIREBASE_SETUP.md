# 🔥 Hosting Ka-Ching!

Your app is now fully configured with your Firebase credentials and ready to go!

## Option 1: Firebase Hosting (Recommended)
This is the best way since you're already using Firebase for Auth and DB.
1. Install CLI: `npm install -g firebase-tools`
2. Run: `npm run build`
3. Run: `firebase deploy`
4. **Done!** Your app will be live at `https://aman-tracker-app.web.app`

## Option 2: Vercel (Easiest / One-Click)
If you find the CLI too complex, Vercel is a great alternative:
1. Push this code to a **GitHub repository**.
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
3. Click **"Add New"** -> **"Project"**.
4. Import your repository.
5. Click **"Deploy"**.
6. Vercel will give you a free `vercel.app` URL and automatically update every time you push code.

## ⚠️ Important Firestore Note
Regardless of where you host, you **must** create a composite index in your Firebase Console for the Dashboard to work:
1. Go to **Firestore** -> **Indexes** tab.
2. Collection: `expenses`
3. Fields: `userId` (Ascending) and `timestamp` (Descending).
4. Click **Create Index**.

## ⚠️ PWA Warning
For the "Add to Home Screen" feature to work, the website **must** be served over HTTPS (both Firebase and Vercel do this automatically).
