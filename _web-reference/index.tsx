import { AppRegistry } from 'react-native';
import App from './App';
import './index.css';

// Register the react-native app with registerComponent
AppRegistry.registerComponent('Main', () => App);

const rootTag = document.getElementById('root');
if (rootTag) {
  AppRegistry.runApplication('Main', {
    initialProps: {},
    rootTag,
  });
}
