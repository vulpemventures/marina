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
      transparent: 'transparent',
      primary: '#56aeaa',
      secondary: '#83d7bc',
      white: '#fefefe',
      black: '#000000',
      red: colors.red[500],
      grayNavBar: colors.gray[50],
      graySuperLight: colors.gray[200],
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
      },
    },
    extend: {
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
