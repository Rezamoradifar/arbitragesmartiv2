/** @type {import('next').NextConfig} */

// `@coinbase/cdp-sdk`, reachable through the Base Account connector that
// RainbowKit pulls in, lazily imports the optional `@x402/*` payment packages.
// They are not declared as hard dependencies and this app never touches that
// code path, so webpack's static analysis fails on imports that would never
// execute. Stubbing them keeps the build honest without installing payment
// SDKs we do not use.
const OPTIONAL_UNUSED_MODULES = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
];

// Note: `typescript.ignoreBuildErrors` is deliberately NOT set. The ABI is
// loaded from JSON so it stays in sync with the compiled contract, which costs
// wagmi its argument inference; the handful of affected call sites carry
// narrow, commented casts instead of suppressing type checking build-wide.
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      ...Object.fromEntries(OPTIONAL_UNUSED_MODULES.map((m) => [m, false])),
    };
    return config;
  },
};

module.exports = nextConfig;
