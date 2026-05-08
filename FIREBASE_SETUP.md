# 🔥 Firebase Setup & Hosting Instructions for Ka-Ching!

Follow these steps to set up your Firebase project and host the app:

## 1. Create a Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/).
2. Create a new project (e.g., "Ka-Ching").

## 2. Enable Authentication
1. Click **Authentication** -> **Get started**.
2. Enable **Google** sign-in provider.

## 3. Create a Firestore Database
1. Click **Firestore Database** -> **Create database**.
2. Start in **Production mode**.
3. Update your **Rules** to:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /expenses/{expenseId} {
         allow read, write: if request.auth != null && request.resource.data.userId == request.auth.uid;
         allow read, delete: if request.auth != null && resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

## 4. ⚠️ CRITICAL: Create Firestore Index
The Dashboard requires a composite index to sort your expenses by date.
1. Go to the **Indexes** tab in Firestore.
2. Click **Add Index**.
3. Collection ID: `expenses`
4. Fields to index:
   - `userId`: **Ascending**
   - `timestamp`: **Descending**
5. Query scope: **Collection**
6. Click **Create Index** (this may take a few minutes).

## 5. Get Credentials
1. Go to **Project Settings** -> **General**.
2. Scroll to **Your apps** and add a **Web app**.
3. Copy the `firebaseConfig` object and paste it into `src/lib/firebase.js`.

## 6. Deployment
Ensure you have the Firebase CLI installed (`npm install -g firebase-tools`).
```bash
npm run build
firebase login
firebase init hosting # Select your project, dist folder, and SPA
firebase deploy
```

Once deployed, your app will be live at:
**https://your-project-id.web.app**
