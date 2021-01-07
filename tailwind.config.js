const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

module.exports = {
  // TODO: PostCSS plugin postcss-purgecss requires PostCSS 8
  // purge: {
  //   enabled: !isDev,
  //   content: ['./public/**/*.html', './src/**/*.tsx'],
  // },
  darkMode: false, // or 'media' or 'class'
  theme: {
    colors: {
      secondary: '#83d7bc',
      black: '#000000',
      grayNavBar: colors.gray[50],
      graySuperLight: colors.gray[200],
      grayLight: colors.gray[400],
      gray: colors.gray[500],
      grayDark: colors.gray[900],
      primary: '#56aeaa',
      red: colors.red[500],
      smokeLight: 'rgba(0, 0, 0, 0.3)',
      transparent: 'transparent',
      white: '#fefefe',
    },
    container: {
      padding: {
        DEFAULT: '2rem',
        sm: '4rem',
        lg: '6rem',
        xl: '12rem',
      },
    },
    extend: {
      borderRadius: {
        '4xl': '2rem',
      },
      borderWidth: {
        0.5: '0.5px',
      },
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
      gridTemplateRows: {
        // https://web.dev/one-line-layouts/#04.-pancake-stack:-grid-template-rows:-auto-1fr-auto
        pancakeStack: 'auto 1fr auto',
      },
      height: {
        // Popup screen height minus header
        popupContent: 'calc(100vh - 5rem)',
      },
      scale: {
        // Mirror transform with scaleX(-1). 1 is not used by Tailwind
        1: '-1',
      },
    },
  },
  variants: {
    extend: {},
  },
  plugins: [require('@tailwindcss/forms')],
};
