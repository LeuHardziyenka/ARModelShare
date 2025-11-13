# AR Model Sharing Web Application

A complete AR-enabled 3D model sharing platform built with React, TypeScript, Firebase, and model-viewer.

## Features

- **User Authentication**: Email/password and Google sign-in via Firebase Auth
- **3D Model Upload**: Drag-and-drop upload for .glb/.gltf files with real-time progress tracking
- **Model Preview**: Interactive 3D preview with orbit controls using @google/model-viewer
- **AR Viewing**: Mobile-optimized AR viewer supporting WebXR, AR Quick Look, and Scene Viewer
- **Share Links**: Generate shareable links with customizable QR codes
- **QR Code Customization**: Customize colors, error correction levels, and download as PNG
- **Analytics Dashboard**: Track uploads, shares, views, and QR scans with charts
- **Validation Pipeline**: Simulated file integrity, format validation, and AR compatibility checks
- **Dark Mode**: Full dark mode support with theme toggle
- **Responsive Design**: Mobile-first design with beautiful UI components

## Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui components
- Wouter (routing)
- React Query (data fetching)
- @google/model-viewer (3D/AR rendering)
- react-qr-code (QR generation)
- html2canvas (QR download)
- Recharts (analytics)
- react-hot-toast (notifications)

### Backend
- Firebase Authentication
- Firebase Firestore (database)
- Firebase Storage (file storage)
- Express.js (minimal backend)

## Project Structure

```
client/
├── src/
│   ├── components/       # Reusable UI components
│   │   ├── ui/          # shadcn components
│   │   ├── ModelViewer.tsx
│   │   ├── FileUploader.tsx
│   │   ├── QRCodeGenerator.tsx
│   │   ├── ShareModal.tsx
│   │   ├── StatCard.tsx
│   │   ├── ModelCard.tsx
│   │   └── ...
│   ├── pages/           # Page components
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── Upload.tsx
│   │   ├── ShareManager.tsx
│   │   ├── Analytics.tsx
│   │   ├── ARViewer.tsx
│   │   └── *Container.tsx (connected versions)
│   ├── services/        # Firebase services
│   │   ├── auth.service.ts
│   │   ├── model.service.ts
│   │   ├── share.service.ts
│   │   ├── upload.service.ts
│   │   ├── validation.service.ts
│   │   ├── qr.service.ts
│   │   └── analytics.service.ts
│   ├── hooks/          # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── useModelUpload.ts
│   │   └── useShareLink.ts
│   ├── lib/            # Utilities
│   │   └── firebase.ts
│   └── types/          # TypeScript types
shared/
└── schema.ts          # Shared data models
```

## Firebase Setup

### Environment Variables

Required secrets (already configured):
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_PROJECT_ID`

### Firestore Collections

1. **models**
   - User's uploaded 3D models
   - Fields: userId, filename, fileSize, modelUrl, uploadedAt, validationStatus, validationIssues

2. **shared_links**
   - Shareable links with QR codes
   - Fields: userId, modelId, modelUrl, modelName, createdAt, expiresAt, isActive, qrOptions, views, scans

3. **activity**
   - Activity log for analytics
   - Fields: userId, type, description, timestamp, metadata

### Security Rules

Deploy the rules from `firestore.rules.example` to your Firebase project:

```bash
firebase deploy --only firestore:rules,storage:rules
```

Key security features:
- Users can only read/write their own models and share links
- Shared links are publicly readable when active and not expired
- Model files are publicly readable (required for AR viewing)
- File uploads restricted to authenticated users' own folders

## Data Models

### Model
```typescript
{
  id: string;
  userId: string;
  filename: string;
  fileSize: number;
  modelUrl: string;
  uploadedAt: number;
  validationStatus: 'processing' | 'ready' | 'failed';
  validationIssues?: string[];
}
```

### SharedLink
```typescript
{
  id: string;
  userId: string;
  modelId: string;
  modelUrl: string;
  modelName: string;
  createdAt: number;
  expiresAt: number;
  isActive: boolean;
  qrOptions: {
    fgColor: string;
    bgColor: string;
    level: 'L' | 'M' | 'Q' | 'H';
    logoUrl?: string;
  };
  views: number;
  scans: number;
}
```

## User Journeys

### Upload & Share Flow
1. User signs in with email or Google
2. Navigate to Upload page
3. Drag & drop .glb/.gltf file
4. Real-time progress tracking
5. Validation pipeline runs (file integrity → format → AR compatibility)
6. Model preview appears
7. Click "Share This Model"
8. Customize QR code colors and settings
9. Copy link, download QR, or get embed code

### Mobile AR Viewing
1. User scans QR code or clicks share link on mobile
2. AR Viewer page loads with model
3. Model displays in 3D with orbit controls
4. "View in AR" button triggers native AR mode
5. Model appears in real-world environment via WebXR/AR Quick Look

### Analytics Tracking
- Upload events logged automatically
- Share link creation tracked
- QR scans increment when ?source=qr parameter present
- Views increment when AR viewer accessed
- Charts show activity over 7/30/90 days
- Recent events timeline displays all activity

## AR Compatibility

The app uses @google/model-viewer which supports:
- **iOS**: AR Quick Look (built-in)
- **Android**: Scene Viewer (built-in) and WebXR
- **Desktop**: 3D preview with orbit controls

Recommended model format: GLB (optimized for AR)

## Design System

Following Material Design principles with:
- Primary color: Blue (hsl(217, 91%, 45%))
- Fonts: Inter (UI), JetBrains Mono (code/technical)
- Components: shadcn/ui with custom theming
- Spacing: Tailwind spacing scale (4, 8, 12, 16, 24px)
- Dark mode: Full support with system preference detection

## Future Enhancements

Outlined in the original spec but not yet implemented:

1. **Cloud Functions**
   - Server-side QR generation
   - Automated cleanup of expired links
   - Real-time access tracking webhooks

2. **Advanced Features**
   - Model collections and tagging
   - Collaborative viewing
   - Model annotations
   - Version history
   - Advanced analytics (heatmaps, device breakdown)

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

The app runs on port 5000 with Express backend and Vite frontend on the same server.

## Notes

- All file uploads go to Firebase Storage under `models/{userId}/{timestamp}_{filename}`
- Share links expire after 30 days by default (configurable)
- QR codes support error correction levels L (7%), M (15%), Q (25%), H (30%)
- Maximum file upload size: 100MB
- Supported formats: .glb, .gltf
- Model validation is simulated on the frontend for demo purposes
