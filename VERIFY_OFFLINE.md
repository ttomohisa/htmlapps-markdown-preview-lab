# Offline verification

1. Run `build-standalone.bat`.
2. Disconnect the computer from the network.
3. Open `dist/index.html`.
4. Confirm editing, preview switching, compare mode, compatibility checks, LocalStorage restore, file open, and file save.
5. Open browser DevTools and confirm no runtime network requests are required.

The CSP should contain `connect-src 'none'`.
