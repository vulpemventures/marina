# 🧜‍♀️ Marina Wallet
Liquid Network browser extension


![mockup_marina-p-2000 2825524f](https://user-images.githubusercontent.com/3596602/163511145-3085879d-486c-42d1-880a-1f8ba3f98803.png)



## ⬇️ Install

Available on:

- Chrome Store https://chrome.google.com/webstore/detail/marina/nhanebedohgejbllffboeipobccgedhl
- Firefox Add-on - Coming soon

## Usage

Visit docs.vulpem.com: https://docs.vulpem.com/marina/introduction

## Development

Install dependencies.
```
yarn install
```

Run webpack bundler in watch mode.
```
yarn start
```

For manifest v3.
```
yarn start:v3
```

You can install the unpacked extension in `dist/v3` inside your browser. Chrome-based browsers support HMR.

## Build

```
yarn build
yarn web-ext:build
```

For manifest v3
```
yarn build:v3
yarn web-ext:build:v3
```

The packaged extension will appear in `web-ext-artifacts` directory.

## Tests

Install and run [nigiri](https://github.com/vulpemventures/nigiri).
```
nigiri start --liquid
```

Run websocat.
```
websocat -b ws-l:127.0.0.1:1234 tcp:127.0.0.1:50001
```

Run tests.
```
yarn test
```

Run tests with playwright.
```
npx playwright install
yarn test:playwright
```

## Responsible disclosure

At Vulpem, we consider the security of our Marina Wallet a top priority. But even putting top priority status and maximum effort, there is still possibility that vulnerabilities can exist. 

In case you discover a vulnerability, we would like to know about it immediately so we can take steps to address it as quickly as possible.  

If you discover a vulnerability, please e-mail your findings to marinawallet@vulpem.com
