# Peak Performance Growth Portal

A robust, full-stack application designed to track performance, manage tasks, and drive personal growth.

## Core Features
- **Data Persistence**: Offline-first architecture with automatic background synchronization to Firebase Firestore and automated data backups to Google Drive.
- **Robust Synchronization**: Integrated a retry mechanism using exponential backoff that automatically detects and resolves network interruptions to guarantee high data reliability.
- **Resilient Engineering**: Real-time error handling with non-intrusive UI feedback ensuring consistent and persistent state management.

## Setup Instructions
Configure standard Firebase credentials via `firebase-applet-config.json`. Ensure the environment variables align with `.env.example` configurations.
