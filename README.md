# HealthGuard CHV — Prototype

AI-enabled mobile-first web app for Community Health Volunteers (CHVs) in rural districts.

## Features
1. **Symptom-Based Diagnostic Assistant**: Conversational AI (Gemini 1.5 Pro) trained on WHO IMCI guidelines.
2. **Malnutrition Detection**: Computer Vision (Gemini Vision) to classify SAM/MAM from photos.
3. **Outbreak Alert System**: Real-time monitoring and threshold-based alerting for disease spikes.

## Setup Instructions (Low-Resource Context)

### 1. Environment Configuration
- Ensure `GEMINI_API_KEY` is set in your environment.
- Firebase is pre-configured via `firebase-applet-config.json`.

### 2. Deployment for CHVs
- **PWA Support**: The app is built as a Progressive Web App. CHVs can "Add to Home Screen" on Android for offline-first access.
- **Offline Mode**: Firebase Firestore persistence is enabled. Data captured offline will sync automatically when a 2G/3G connection is restored.
- **Language**: Default is English. Local language support can be added by updating the `IMCI_SYSTEM_PROMPT` in `src/services/gemini.ts`.

### 3. Data Privacy
- All patient records are anonymized.
- No real names or PII are stored in Firestore.
- Access is restricted via Firebase Security Rules.

## Technical Stack
- **Frontend**: React 18, Tailwind CSS, Lucide Icons.
- **Backend**: Firebase (Firestore, Auth).
- **AI**: Google Gemini 1.5 Pro (Diagnostics & Vision).
- **Charts**: Recharts for outbreak visualization.

## Deployment Note
In a production environment, the Outbreak Detection logic should be moved to **Firebase Cloud Functions** for server-side reliability. This prototype implements it client-side for demonstration.
