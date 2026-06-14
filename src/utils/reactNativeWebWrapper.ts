// @ts-ignore
import * as RNWeb from 'react-native-web';

// Re-export all standard React Native Web interfaces and components
// @ts-ignore
export * from 'react-native-web';

// Add stubs for native-only APIs that mobile packages expect
export const TurboModuleRegistry = {
  get(name: string) {
    console.log(`[TurboModuleRegistry] Requested native module on web: ${name}`);
    return null;
  },
  getEnforcing(name: string) {
    console.log(`[TurboModuleRegistry] Enforced native module on web: ${name}`);
    return null;
  }
};

export default RNWeb;
