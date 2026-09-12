/** @type {import('next').NextConfig} */

// `@coinbase/cdp-sdk`, reachable through the Base Account connector that
// RainbowKit pulls in, lazily imports the optional `@x402/*` payment packages.
// They are not declared as hard dependencies and this app never touches that
// code path, so webpack's static analysis fails on imports that would never
// execute. Stubbing them keeps the build honest without installing payment
// SDKs we do not use.
//
// `@metamask/sdk` is the same shape of problem from a different direction: it
// ships one bundle for web and React Native and imports AsyncStorage for the
// native case. In a browser that branch is dead code, but webpack resolves
// imports statically and warns on every build about a package this app has no
// reason to install.
const OPTIONAL_UNUSED_MODULES = [
  "@x402/core/client",
  "@x402/evm",
  "@x402/evm/exact/client",
  "@x402/evm/upto/client",
  "@x402/svm/exact/client",
  "@react-native-async-storage/async-storage",
  // WalletConnect's logger asks pino for a pretty-printer that only exists in
  // a development install. In production pino falls back to JSON on its own.
  "pino-pretty",
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

    // `viem/chains` is a barrel that defines every chain viem knows about, and
    // one of them (Tempo) reaches into `ox` code containing a computed
    // require(). Webpack cannot follow that statically and says so on every
    // build. This app imports exactly one chain and never evaluates that
    // module, so the warning describes a risk that does not exist here.
    //
    // Matched on the specific file rather than suppressed by category: a
    // computed require appearing anywhere else is still worth being told
    // about, and a blanket rule would hide it.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /node_modules\/ox\/_esm\/tempo\// },
    ];

    return config;
  },
};

module.exports = nextConfig;
