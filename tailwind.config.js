const defaultTheme = require('tailwindcss/defaultTheme');
const colors = require('tailwindcss/colors');

module.exports = {
  // TODO: PostCSS plugin postcss-purgecss requires PostCSS 8
  purge: {
    enabled: true,
    content: [
        './**/*.html',
        './**/*.tsx',
        './**/*.js'
    ]
  },
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
      boxShadow: (theme) => ({
        innerBtnBorder: `inset 0 0 0 3px ${theme('colors.primary')}`,
      }),
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
        // Hack for Select Asset screen
        25.75: '25.75rem',
        // Hack for seed-reveal screen
        8.6: '8.6rem',
      },
      inset: {
        13: '3.25rem',
      },
      minHeight: {
        80: '80%',
      },
      scale: {
        // Mirror transform with scaleX(-1). 1 is not used by Tailwind
        1: '-1',
      },
    },
  },
  plugins: [require('@tailwindcss/forms'), require('@tailwindcss/line-clamp')],
};
