import { h } from 'vue';
import DefaultTheme from 'vitepress/theme';

export default {
  ...DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout);
  },
};
