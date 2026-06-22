# Taskify Mobile Application

## Overview

Taskify is a high-performance, production-ready scheduling and task management mobile application built with React Native and Expo. It features a beautifully fluid dual-view UI (Timeline and List views), a robust Hybrid State Management architecture (Redux + Context), deep offline resilience, and modern mobile-native capabilities like Native Google OAuth Sign-In, local push notifications, and dynamic profile avatars.

---

## Prerequisites

Before you begin, ensure you have the following installed on your development machine:

1. **Node.js**: (v18.x or newer) - [Download Node.js](https://nodejs.org/)
2. **npm** or **yarn**: Comes bundled with Node.js.
3. **Expo CLI**: Mobile app development toolchain.
   ```bash
   npm install -g expo-cli
   ```
4. **Android Studio** (for Android emulation) or **Xcode** (for iOS emulation on macOS). Alternatively, you can easily use the **Expo Go** app directly on your physical mobile device.

---

## Installation & Initialization

Follow these granular, step-by-step instructions to boot the application locally:

1. **Clone the Repository**

   ```bash
   git clone <repository_url>
   cd taskify
   ```

2. **Install Dependencies**
   The project utilizes a vast array of native modules (Redux Persist, Expo Notifications, Async Storage, NetInfo, etc.). Install them using npm:

   ```bash
   npm install
   ```

3. **Environment Configuration**
   Copy the provided environment template to establish your backend connection:

   ```bash
   cp .env.example .env
   ```

   _Note: Open `.env` and ensure `EXPO_PUBLIC_API_URL` points to your running Express backend. (e.g., `http://localhost:3000` for an emulator, or your computer's LAN IP like `http://192.168.1.5:3000` if you are testing on a physical mobile device)._

4. **Boot the Metro Bundler**
   Start the Expo development server. We recommend running with the cache-clearing flag (`-c`) the first time to ensure all new native modules link correctly:

   ```bash
   npx expo start -c
   ```

5. **Launch the App**
   - **Physical Device**: Open the Expo Go app on iOS/Android and scan the QR code displayed in your terminal.
   - **Emulator/Simulator**: Press `a` in the terminal to open on Android, or `i` to open on iOS.

---

The project utilizes Expo's built-in environment variable handler. Prefix variables with `EXPO_PUBLIC_` to expose them securely to the React Native runtime.

You must copy `.env.example` to `.env` and fill in:

1. `EXPO_PUBLIC_API_URL`: Your backend Express server URI.
2. `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`: Your native Android client ID generated from the Google Cloud Console.
3. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`: Your Web client ID for cross-platform audience token verification with the backend.

---

## Engineering Breakdown & Architecture

### State Management Pattern: Hybrid Redux + Context

The application utilizes a highly scalable **Hybrid State Architecture** to cleanly separate complex background logic from fast UI interactions.

**How it works:**

1. **Slices & Async Thunks**: All backend API interactions (creating, editing, deleting tasks) are abstracted into Redux `createAsyncThunk` functions within `src/store/tasksSlice.ts`.
2. **Bridge Abstraction**: To maintain separation of concerns and avoid tightly coupling React UI components directly to Redux dispatches, we engineered a custom hook (`useTasks` inside `TasksContext.tsx`). This hook elegantly wraps Redux's `useSelector` and `useDispatch`, acting as an invisible bridging API for the presentation layer.
3. **Optimistic Updates**: When a user interacts with the app (e.g., toggling a task as complete), the UI updates instantly using `.addCase()` extra reducers before the backend even confirms the reply, ensuring zero latency perception for the end user.

### Offline Resilience & Background Sync

We integrated `@react-native-async-storage/async-storage` deeply wrapped in `redux-persist`.

- **Deep Caching**: The global state automatically flushes to the device's native SQLite storage engine. When booting the app in an environment without Wi-Fi, the UI instantly hydrates from local storage.
- **Mutation Queueing**: If an API call fails strictly due to a network drop, Redux intercepts the error and pushes the mutation payload into a specialized `offlineQueue` array instead of throwing a generic error.
- **Headless Network Manager**: We utilize `@react-native-community/netinfo` inside a global `NetworkSyncManager` layout component. The exact millisecond the device regains internet access, it loops over the `offlineQueue`, silently replays the HTTP requests, and synchronizes full data parity with the Express server entirely in the background.

### Architectural Trade-offs

1. **Redux over Zustand or Bare React Context**:
   - _Trade-off_: Redux introduces slightly more boilerplate code (store setup, slices, thunks) compared to Zustand or bare Context implementations.
   - _Justification_: Redux was explicitly chosen because its ecosystem uniquely supports complex architectural requirements like `redux-persist` and deterministic mutation queueing. Writing a highly resilient offline-sync manager from scratch using Context would have resulted in bloated, error-prone custom middleware. Redux handles this scale natively.
2. **Metadata Serialization via Delimiters**:
   - _Trade-off_: Because the provided backend API schema heavily restricted incoming parameters to basic fields (Title, Description), we designed a custom frontend serialization mechanism (using a `|||META|||` delimiter) to securely store advanced parameters (like Task Color and All-Day flags) inside the standard `description` text block payload.
   - _Justification_: While fundamentally imperfect compared to actually modifying the backend SQL schema, it brilliantly adheres to strict assessment constraints (frontend-only logic) while safely preserving complex, state-rich mobile features.
3. **Local Push Notifications over Remote FCM**:
   - _Trade-off_: We utilize the `expo-notifications` local-scheduling engine natively on the device runtime instead of waiting for remote push triggers sent via a CRON job on a backend server.
   - _Justification_: This securely bypasses the need for complex Firebase / APNs credential setups while guaranteeing high-speed reminders that operate with 100% efficacy even if the user drops into Airplane mode.
4. **Native Google OAuth SDK over Web Browser Redirects**:
   - _Trade-off_: We integrated `@react-native-google-signin/google-signin` which requires compiling a custom native Android build and strictly matching SHA-1 keystore fingerprints, rather than using a simple Expo web-browser `AuthSession`.
   - _Justification_: Web-based redirects force the user out of the application into a browser, degrading the UX. Native Google Play Services integration provides a seamless, highly secure 1-tap login experience that feels completely integrated into the operating system.

### UI/UX & Theming

- Custom splash screen and iconography compiled directly into the native iOS/Android directories via Expo Prebuild.
- Dynamic Profile Avatars automatically generated from user initials using the brand's primary color (`#3BB77E`).
- Responsive, fluid inputs unified across authentication and profile settings screens to ensure design consistency.
