#!/bin/bash

# Define directories
DIST_DIR="dist/chrome"

# Clean up previous build
echo "Cleaning up $DIST_DIR..."
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# Copy source files
echo "Copying source files..."
cp -r src "$DIST_DIR/"
cp -r assets "$DIST_DIR/"

# Copy optional files
[ -f LICENSE ] && cp LICENSE "$DIST_DIR/"
[ -f README.md ] && cp README.md "$DIST_DIR/"

# Copy and rename manifest
echo "Setting up manifest..."
cp manifest.chrome.json "$DIST_DIR/manifest.json"

# Create zip bundle
echo "Creating zip bundle..."
ZIP_NAME="smart-bookmarks-chrome.zip"
(cd "$DIST_DIR" && zip -q -r "../$ZIP_NAME" .)

echo "Chrome extension built successfully in $DIST_DIR"
echo "Zip bundle: dist/$ZIP_NAME"
