const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '../node_modules/expo-router/build/utils/splash.js');
if (!fs.existsSync(file)) {
  process.exit(0);
  return;
}

let content = fs.readFileSync(file, 'utf8');

// Evitar aplicar dos veces
if (content.includes('internalPreventAutoHideAsync !== \'function\'')) {
  process.exit(0);
  return;
}

content = content.replace(
  `async function _internal_preventAutoHideAsync() {
    if (!SplashModule) {
        return false;
    }
    if (!_initializedErrorHandler) {`,
  `async function _internal_preventAutoHideAsync() {
    if (!SplashModule) {
        return false;
    }
    if (typeof SplashModule.internalPreventAutoHideAsync !== 'function') {
        return false;
    }
    if (!_initializedErrorHandler) {`
);

content = content.replace(
  `async function _internal_maybeHideAsync() {
    if (!SplashModule) {
        return false;
    }
    return SplashModule.internalMaybeHideAsync();
}`,
  `async function _internal_maybeHideAsync() {
    if (!SplashModule) {
        return false;
    }
    if (typeof SplashModule.internalMaybeHideAsync !== 'function') {
        return false;
    }
    return SplashModule.internalMaybeHideAsync();
}`
);

fs.writeFileSync(file, content);
console.log('Applied expo-router splash screen fix for Expo Go');
