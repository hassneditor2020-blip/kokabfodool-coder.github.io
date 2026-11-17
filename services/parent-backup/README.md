# Kokab Fodool parent backups

The Android account section is enabled by a Firebase project owned by Kokab Fodool. The released default config is empty. All local settings, offline play, and the file picker remain available with this config.

Enable Email/Password authentication and create a Firestore database in the project's selected region. From this directory, deploy only the checked-in Firestore rules to that project. Confirm that the project app key can reach Firebase Authentication and Firestore from the Android WebView. Add the project's public `projectId` and API-restricted Firebase `apiKey` to `assets/parent-backup-config.json` before building the Android package. Keep service-account keys and management tokens outside the public repository.

The account screen is for a parent or guardian. Before enabling production, update the Arabic and English privacy pages to describe the provider, parent email, explicit progress backup, retention, and account deletion. A successful sign-in with a verified email is required for online reads and writes. Each slot holds numeric game scores and a format version. Names, ages, profile IDs, and details of unfinished rounds remain in local storage. Repeated saves merge by best score, and every remote write uses a precondition based on the last read.

Run the access tests from this directory using Java and the Firebase CLI.

```sh
firebase emulators:exec --project demo-fudool-settings --only auth,firestore "python3 test_access.py"
```

Verify delivery of a real confirmation email and one backup and restore on two Android devices using a test parent account before rolling out the configured app. [Firebase firewalls and rules](https://firebase.google.com/docs/firestore/security/get-started) · [Firebase API keys](https://firebase.google.com/docs/projects/api-keys)
