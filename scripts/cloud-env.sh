#!/bin/sh
# Execute com: . scripts/cloud-env.sh
VOZ_TOOLS_DIR=${VOZ_TOOLS_DIR:-/workspace/.toolchains}
export VOZ_TOOLS_DIR
export JAVA_HOME="$VOZ_TOOLS_DIR/jdk-21.0.13+9"
export ANDROID_HOME="$VOZ_TOOLS_DIR/android-sdk"
export ANDROID_USER_HOME="$VOZ_TOOLS_DIR/.android"
export ANDROID_SDK_HOME="$VOZ_TOOLS_DIR"
export GRADLE_USER_HOME="$VOZ_TOOLS_DIR/gradle-cache"
export npm_config_cache="$VOZ_TOOLS_DIR/npm-cache"
export PATH="$JAVA_HOME/bin:$ANDROID_HOME/platform-tools:$PATH"
