/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */


// Blue theme
const tintColorLight = '#1976D2';
const tintColorDark = '#90caf9';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#1976D2',
    tabIconDefault: '#90caf9',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#90caf9',
    tabIconDefault: '#1976D2',
    tabIconSelected: tintColorDark,
  },
};
