#!/bin/bash
# One-time iOS project setup after `npx cap add ios`. Run from the repo root on the Mac: bash native/setup-ios.sh
# Adds the two Health permission texts to Info.plist. The HealthKit capability itself is added in Xcode
# (App target > Signing & Capabilities > + Capability > HealthKit).
set -e
cd "$(dirname "$0")/.."
PLIST=ios/App/App/Info.plist
[ -f "$PLIST" ] || { echo "Run 'npx cap add ios' first ($PLIST not found)"; exit 1; }
PB=/usr/libexec/PlistBuddy
setkey() { $PB -c "Set :$1 $2" "$PLIST" 2>/dev/null || $PB -c "Add :$1 string $2" "$PLIST"; }
setkey NSHealthShareUsageDescription "Liftprint reads your workouts, steps, sleep and heart rate so your training log, recovery and coach reflect your whole day."
setkey NSHealthUpdateUsageDescription "Liftprint does not write to Health. This permission is only requested if you turn on saving workouts in a future version."
setkey NSCameraUsageDescription "Liftprint uses the camera to scan barcodes and take meal and progress photos."
setkey NSPhotoLibraryUsageDescription "Liftprint lets you pick meal, progress and screenshot photos from your library."
# iPhone: portrait only (the app is designed for one orientation)
$PB -c "Delete :UISupportedInterfaceOrientations" "$PLIST" 2>/dev/null || true
$PB -c "Add :UISupportedInterfaceOrientations array" "$PLIST"
$PB -c "Add :UISupportedInterfaceOrientations:0 string UIInterfaceOrientationPortrait" "$PLIST"
setkey CFBundleDisplayName "Liftprint"
echo "Info.plist updated. Now add the HealthKit capability in Xcode."
