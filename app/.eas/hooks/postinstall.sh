#!/bin/bash

# Fix Firebase modular headers issue
if [ -f "ios/Podfile" ]; then
  echo "Fixing Firebase modular headers in Podfile..."
  
  # Add use_modular_headers! after platform line
  sed -i '' '/platform :ios/a\
use_modular_headers!
' ios/Podfile

  # Also add specific modular headers for Firebase pods
  cat >> ios/Podfile << 'EOF'

# Firebase modular headers fix
post_install do |installer|
  installer.pods_project.targets.each do |target|
    target.build_configurations.each do |config|
      config.build_settings['BUILD_LIBRARY_FOR_DISTRIBUTION'] = 'YES'
    end
    
    if target.name == 'FirebaseAuth' || target.name == 'FirebaseCoreInternal'
      target.build_configurations.each do |config|
        config.build_settings['DEFINES_MODULE'] = 'YES'
      end
    end
  end
end
EOF

  echo "Podfile updated successfully"
fi