# Katelins Workout Log

Choose Workout A, B, or C and confirm the workout date. Edit the prefilled weight and reps for each set, or seconds for planks, then tap ✓. Changes save as you go. History shows dated sessions with at least one completed set. Progress shows session totals and each exercise’s best set and best set from the latest session.

The starter plan uses two sets per movement. Use the lightest comfortable machine setting and enter its actual weight in the log. For bodyweight reps, leave the pounds field at zero. Take a rest day between strength sessions.

## Run on your computer

With Python 3 installed, open a terminal in this folder and run:

```sh
python3 -m http.server 8016 --bind 127.0.0.1
```

Open http://localhost:8016/ in your browser.

## Install on your phone

Upload the contents of this folder to a static web host that provides HTTPS. Use the same HTTPS URL each time. The app requires no backend, paid subscription, or database. Open that link on your phone.

- iPhone with Safari. Open Share, tap Add to Home Screen, turn on Open as Web App if shown, then tap Add.
- Android with Chrome. Open the three-dot menu and select Install app, or choose Add to Home screen and then Install if shown.

Open the installed app while online once so it can cache the files for offline workouts.

## Keep a backup

Logs stay in browser storage on the device and under the address you opened. They are never sent to the host. Browser storage has a quota and can be cleared or evicted. Private browsing can discard it when you close the session. Logs do not sync across browsers, devices, or URLs.

Use Export workout data and keep the JSON file somewhere you can retrieve it. Restore backup replaces the current logs with the contents of that file after confirmation. Export before switching devices, browsers, or hosting addresses.

Katelin’s backups have their own app identifier. Restore accepts backups exported from this app. The deployment is a standalone static site with no server-side storage.
