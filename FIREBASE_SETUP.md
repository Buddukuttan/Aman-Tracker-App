# 🔥 Firebase Setup Instructions for Ka-Ching!

Follow these steps to set up your Firebase project and get the app running:

## 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Click **Add project** and name it "Ka-Ching" (or your preferred name).
3. (Optional) Disable Google Analytics for this project if you want a faster setup.
4. Click **Create project**.

## 2. Enable Authentication
1. In the left sidebar, click **Authentication**.
2. Click **Get started**.
3. Under the **Sign-in method** tab, click **Add new provider**.
4. Select **Google**.
5. Enable it, choose a project support email, and click **Save**.

## 3. Create a Firestore Database
1. In the left sidebar, click **Firestore Database**.
2. Click **Create database**.
3. Choose a location close to you.
4. Start in **Production mode**.
5. Click **Create**.
6. Go to the **Rules** tab and update them to allow authenticated users to read/write their own data:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /expenses/{expenseId} {
         allow read, write: if request.auth != null && request.resource.data.userId == request.auth.uid;
         allow read, delete: if request.auth != null && resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

## 4. Get Your Credentials
1. Click the **Settings (gear icon)** next to "Project Overview" in the sidebar and select **Project settings**.
2. Scroll down to the **Your apps** section.
3. Click the **Web icon (</>)** to register a new web app.
4. Name it "Ka-Ching PWA".
5. Copy the `firebaseConfig` object.
6. Open `src/lib/firebase.js` in this project and paste your credentials into the `firebaseConfig` constant.

## 5. Enable Firebase Hosting (Optional for deployment)
1. Install Firebase CLI: `npm install -g firebase-tools`
2. Login: `firebase login`
3. Initialize: `firebase init hosting`
4. Choose your project, set `dist` as the public directory, and configure as a single-page app (Yes).
5. Deploy: `npm run build && firebase deploy`
