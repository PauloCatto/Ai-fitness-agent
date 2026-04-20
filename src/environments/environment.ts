export const environment = {
  production: false,
  geminiApiKey: 'YOUR_GEMINI_API_KEY', // Replace with your key from https://aistudio.google.com
  useMockAi: true, // Set to false when you have a real Gemini API key
  firebase: {
    apiKey: 'YOUR_FIREBASE_API_KEY',
    authDomain: 'YOUR_PROJECT.firebaseapp.com',
    projectId: 'YOUR_PROJECT_ID',
    storageBucket: 'YOUR_PROJECT.appspot.com',
    messagingSenderId: 'YOUR_SENDER_ID',
    appId: 'YOUR_APP_ID',
  },
};
