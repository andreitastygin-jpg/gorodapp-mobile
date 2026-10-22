// M2 (2026-10-22): found on the iPhone simulator - the "no connection" screen
// had a second safe area (a white band of the status-bar height on top), because
// it wrapped itself in ScreenContainer while AppNavigator already does.
import { readFileSync } from 'fs';
import { join } from 'path';

const source = (path: string) => readFileSync(join(__dirname, '..', '..', path), 'utf8');

describe('one safe area for the whole app', () => {
  test('AppNavigator keeps the app below the status bar', () => {
    expect(source('navigation/AppNavigator.tsx')).toMatch(/<ScreenContainer>/);
  });

  test('screens shown inside it do not add a second one', () => {
    for (const file of ['components/AppWebView.tsx', 'screens/OfflineScreen.tsx']) {
      expect(source(file)).not.toMatch(/ScreenContainer|SafeAreaView/);
    }
  });
});
