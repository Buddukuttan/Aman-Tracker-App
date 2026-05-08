# 🚀 Hosting Ka-Ching!

Your app is fully configured and ready to be hosted. Choose your preferred platform below:

---

## 1. Vercel (Recommended for ease of use)
1. Push this entire project to a **GitHub repository**.
2. Go to [vercel.com](https://vercel.com) and Log In.
3. Click **"Add New"** -> **"Project"**.
4. Select your repository.
5. In the "Build & Output Settings", ensure:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Click **Deploy**.
7. Your app will be live at `https://your-project.vercel.app`.

---

## 2. Netlify (Simple & Reliable)
1. Push this project to GitHub.
2. Go to [netlify.com](https://netlify.com) and Log In.
3. Click **"Add new site"** -> **"Import from Git"**.
4. Connect to your GitHub and select the repository.
5. Set the following:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
6. Click **"Deploy site"**.

---

## 3. Firebase Hosting
1. Install CLI: `npm install -g firebase-tools`
2. Run `firebase login`.
3. Run `firebase use --add aman-tracker-app`.
4. Run `npm run build`.
5. Run `firebase deploy`.

---

## ⚠️ MANDATORY: Firestore Setup
No matter where you host, you **must** do this for the Dashboard to work:
1. Go to your **Firebase Console**.
2. Open **Firestore Database** -> **Indexes** tab.
3. Click **Create Index**.
4. Collection ID: `expenses`
5. Fields:
   - `userId` (Ascending)
   - `timestamp` (Descending)
6. Click **Save**.

## ⚠️ Authentication Setup
1. In Firebase Console, go to **Authentication** -> **Settings** -> **Authorized Domains**.
2. Add your new Vercel or Netlify domain (e.g., `ka-ching.vercel.app`) to the list. If you don't do this, the Google Login will fail.
