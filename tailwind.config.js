const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

// Bug: NODE_ENV always 'production'
// https://github.com/parcel-bundler/parcel/issues/4550
// https://github.com/parcel-bundler/parcel/issues/5029
console.log('process.env.NODE_ENV: ', process.env.NODE_ENV);

const isDev = process.env['npm_lifecycle_event'] === 'watch:html';

module.exports = {
  purge: {
    enabled: !isDev,
    content: ['./public/**/*.html', './src/**/*.tsx'],
  },
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      transparent: 'transparent',
      primary: '#56aeaa',
      secondary: '#83d7bc',
      white: '#fefefe',
      black: '#000000',
      red: colors.red[500],
      grayLight: colors.gray[400],
      gray: colors.gray[500],
      grayDark: colors.gray[900],
    },
    container: {
      padding: {
        DEFAULT: '2rem',
        sm: '4rem',
        lg: '6rem',
        xl: '12rem',
        '2xl': '6rem',
      },
    },
    extend: {
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
};
