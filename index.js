/**
 * @format
 */

// 必须放在最顶部：@react-navigation/stack（JS 版）依赖 gesture-handler
import 'react-native-gesture-handler';

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

AppRegistry.registerComponent(appName, () => App);
