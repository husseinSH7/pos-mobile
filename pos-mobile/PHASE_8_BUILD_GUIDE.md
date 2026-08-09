# Phase 8 Build Guide

## Prerequisites

Before building for production, ensure you have:

1. **EAS CLI installed**
   ```bash
   npm install -g eas-cli
   ```

2. **Expo account**
   - Sign up at https://expo.dev
   - Run `eas login` to authenticate

3. **Dependencies installed**
   ```bash
   npm install
   ```

4. **Backend API running**
   - Ensure your restaurant_POS backend is accessible
   - Update API_URL in app.json if needed

## Build Configuration

### Development Build
For testing on physical devices during development:
```bash
npm run build:dev
```

### Preview Build
For internal testing before production:
```bash
npm run build:preview
```

### Production Build
For app store submission:
```bash
npm run build:prod
```

## Platform-Specific Setup

### iOS Setup

1. **Apple Developer Account**
   - Enroll in Apple Developer Program ($99/year)
   - Create App ID in Apple Developer Portal
   - Update bundle identifier in app.json: `com.restaurantpos.mobile`

2. **Configure EAS for iOS**
   ```bash
   eas build:configure
   ```
   - Follow prompts for iOS configuration
   - Provide Apple credentials when asked

3. **Update eas.json**
   - Replace placeholder values with your actual:
     - `appleId`: Your Apple ID email
     - `ascAppId`: App Store Connect App ID
     - `appleTeamId`: Your Apple Team ID

### Android Setup

1. **Google Play Console Account**
   - Create Google Play Developer account ($25 one-time)
   - Create app in Google Play Console
   - Note your package name: `com.restaurantpos.mobile`

2. **Configure EAS for Android**
   ```bash
   eas build:configure
   ```
   - Follow prompts for Android configuration

3. **Service Account (for automated uploads)**
   - Create service account in Google Cloud Console
   - Download JSON key file
   - Save as `google-service-account.json` in project root
   - Update eas.json with correct path

## Testing Before Production

### 1. Test on Simulator/Emulator
```bash
# iOS
npm run ios

# Android
npm run android
```

### 2. Test on Physical Device (Development Build)
```bash
# Build development build
npm run build:dev

# Install on device via QR code from EAS
```

### 3. Key Test Scenarios
- [ ] Login with PIN
- [ ] Create order (dine-in, takeout, delivery)
- [ ] Add items to cart with modifiers
- [ ] Process payment (cash, card)
- [ ] Print receipt
- [ ] Table status updates
- [ ] Kitchen ticket creation and updates
- [ ] Offline mode - create order without internet
- [ ] Offline sync - reconnect and verify sync
- [ ] Push notifications
- [ ] Barcode scanning (if camera available)
- [ ] App backgrounding and foregrounding
- [ ] Memory usage during extended use

## Production Build Process

### Step 1: Update Version Numbers
Update `app.json`:
```json
{
  "expo": {
    "version": "1.0.0",
    "ios": {
      "buildNumber": "1"
    },
    "android": {
      "versionCode": 1
    }
  }
}
```

### Step 2: Build for iOS
```bash
eas build --platform ios --profile production
```

### Step 3: Build for Android
```bash
eas build --platform android --profile production
```

### Step 4: Submit to App Stores

#### iOS App Store
```bash
eas submit --platform ios --profile production
```

#### Google Play Store
```bash
eas submit --platform android --profile production
```

## Post-Build Checklist

### App Store Connect (iOS)
- [ ] Upload screenshots (5-8 required)
- [ ] Set app category: Business
- [ ] Add age rating: 4+
- [ ] Provide privacy policy URL
- [ ] Add support URL
- [ ] Review and submit for review

### Google Play Console (Android)
- [ ] Upload screenshots (at least 2)
- [ ] Add store listing (short description, full description)
- [ ] Set content rating: Everyone
- [ ] Provide privacy policy URL
- [ ] Add content rating questionnaire
- [ ] Set pricing and distribution
- [ ] Review and release

## Troubleshooting

### Build Failures
- Check EAS build logs in Expo dashboard
- Ensure all dependencies are compatible
- Verify native module versions match Expo SDK version

### Permission Issues
- iOS: Check Info.plist permissions in app.json
- Android: Verify permissions in app.json

### API Connection Issues
- Verify API_URL is correct for production
- Check CORS settings on backend
- Ensure SSL certificates are valid

### Notification Issues
- Verify push notification keys are configured
- Check notification permissions on device
- Test with Expo notification tool

## Next Steps

After successful build and submission:

1. **Monitor App Store Review**
   - iOS: Typically 1-3 days
   - Android: Typically 1-2 days

2. **Prepare Launch**
   - Set up analytics (Firebase Analytics, etc.)
   - Configure crash reporting (Sentry)
   - Prepare support documentation

3. **Post-Launch**
   - Monitor crash reports
   - Gather user feedback
   - Plan for updates and improvements

## Additional Resources

- [EAS Build Documentation](https://docs.expo.dev/build/introduction/)
- [Expo Notifications](https://docs.expo.dev/versions/latest/sdk/notifications/)
- [React Native Permissions](https://github.com/zoontek/react-native-permissions)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Console Help](https://support.google.com/googleplay/android-developer)
