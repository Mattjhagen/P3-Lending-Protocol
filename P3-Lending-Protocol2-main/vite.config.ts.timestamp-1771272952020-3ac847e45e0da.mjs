// vite.config.ts
import { defineConfig, loadEnv } from "file:///Users/matt/Desktop/P3-Lending-Protocol2-main/node_modules/vite/dist/node/index.js";
import react from "file:///Users/matt/Desktop/P3-Lending-Protocol2-main/node_modules/@vitejs/plugin-react/dist/index.js";
import { nodePolyfills } from "file:///Users/matt/Desktop/P3-Lending-Protocol2-main/node_modules/vite-plugin-node-polyfills/dist/index.js";
var findKey = (obj, target) => {
  const key = Object.keys(obj).find((k) => k.toLowerCase() === target.toLowerCase());
  return key ? obj[key] : void 0;
};
var vite_config_default = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const processEnv = process.env;
  const apiKey = findKey(env, "API_KEY") || findKey(processEnv, "API_KEY") || findKey(env, "GEMINI_API_KEY") || findKey(processEnv, "GEMINI_API_KEY") || findKey(env, "VITE_API_KEY") || "";
  const coinGeckoKey = findKey(env, "COINGECKO_API_KEY") || findKey(processEnv, "COINGECKO_API_KEY") || findKey(env, "COINGECKO_API") || findKey(processEnv, "COINGECKO_API") || "";
  console.log(`
--- P3 PROTOCOL CONFIGURATION ---`);
  if (apiKey) {
    console.log(`\u2705 API Key Loaded: ${apiKey.substring(0, 4)}... (Length: ${apiKey.length})`);
  } else {
    console.warn("\u26A0\uFE0F  API Key MISSING (Gemini AI features will be disabled)");
  }
  console.log(`---------------------------------
`);
  return {
    plugins: [
      react(),
      nodePolyfills({
        // Whether to polyfill `node:` protocol imports.
        protocolImports: true
      })
    ],
    resolve: {
      alias: {
        // No manual aliases needed with the plugin
      }
    },
    define: {
      // Securely inject the keys during build
      "process.env.API_KEY": JSON.stringify(apiKey),
      "process.env.COINGECKO_API_KEY": JSON.stringify(coinGeckoKey),
      // Ensure global is available
      "global": "window"
    },
    build: {
      outDir: "dist",
      commonjsOptions: {
        transformMixedEsModules: true
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWF0dC9EZXNrdG9wL1AzLUxlbmRpbmctUHJvdG9jb2wyLW1haW5cIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9tYXR0L0Rlc2t0b3AvUDMtTGVuZGluZy1Qcm90b2NvbDItbWFpbi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWF0dC9EZXNrdG9wL1AzLUxlbmRpbmctUHJvdG9jb2wyLW1haW4vdml0ZS5jb25maWcudHNcIjtcbmltcG9ydCB7IGRlZmluZUNvbmZpZywgbG9hZEVudiB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0JztcbmltcG9ydCB7IG5vZGVQb2x5ZmlsbHMgfSBmcm9tICd2aXRlLXBsdWdpbi1ub2RlLXBvbHlmaWxscyc7XG5cbi8vIEhlbHBlciB0byBmaW5kIGEga2V5IGNhc2UtaW5zZW5zaXRpdmVseSBpbiBhbiBvYmplY3RcbmNvbnN0IGZpbmRLZXkgPSAob2JqOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmc+LCB0YXJnZXQ6IHN0cmluZykgPT4ge1xuICBjb25zdCBrZXkgPSBPYmplY3Qua2V5cyhvYmopLmZpbmQoayA9PiBrLnRvTG93ZXJDYXNlKCkgPT09IHRhcmdldC50b0xvd2VyQ2FzZSgpKTtcbiAgcmV0dXJuIGtleSA/IG9ialtrZXldIDogdW5kZWZpbmVkO1xufTtcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgLy8gTG9hZCBlbnYgZmlsZSBiYXNlZCBvbiBgbW9kZWAgaW4gdGhlIGN1cnJlbnQgd29ya2luZyBkaXJlY3RvcnkuXG4gIGNvbnN0IGVudiA9IGxvYWRFbnYobW9kZSwgKHByb2Nlc3MgYXMgYW55KS5jd2QoKSwgJycpO1xuICBjb25zdCBwcm9jZXNzRW52ID0gcHJvY2Vzcy5lbnY7XG5cbiAgLy8gUk9CVVNUIEtFWSBMT0FESU5HOiBDaGVjayB2YXJpb3VzIG5hbWVzIEFORCBjYXNlLWluc2Vuc2l0aXZlIHZhcmlhdGlvbnNcbiAgY29uc3QgYXBpS2V5ID1cbiAgICBmaW5kS2V5KGVudiwgJ0FQSV9LRVknKSB8fFxuICAgIGZpbmRLZXkocHJvY2Vzc0VudiwgJ0FQSV9LRVknKSB8fFxuICAgIGZpbmRLZXkoZW52LCAnR0VNSU5JX0FQSV9LRVknKSB8fFxuICAgIGZpbmRLZXkocHJvY2Vzc0VudiwgJ0dFTUlOSV9BUElfS0VZJykgfHxcbiAgICBmaW5kS2V5KGVudiwgJ1ZJVEVfQVBJX0tFWScpIHx8XG4gICAgJyc7XG5cbiAgY29uc3QgY29pbkdlY2tvS2V5ID1cbiAgICBmaW5kS2V5KGVudiwgJ0NPSU5HRUNLT19BUElfS0VZJykgfHxcbiAgICBmaW5kS2V5KHByb2Nlc3NFbnYsICdDT0lOR0VDS09fQVBJX0tFWScpIHx8XG4gICAgZmluZEtleShlbnYsICdDT0lOR0VDS09fQVBJJykgfHxcbiAgICBmaW5kS2V5KHByb2Nlc3NFbnYsICdDT0lOR0VDS09fQVBJJykgfHxcbiAgICAnJztcblxuICAvLyBEZWJ1Z2dpbmcgbG9ncyBkdXJpbmcgYnVpbGQvc3RhcnQgKHZpc2libGUgaW4gdGVybWluYWwpXG4gIGNvbnNvbGUubG9nKGBcXG4tLS0gUDMgUFJPVE9DT0wgQ09ORklHVVJBVElPTiAtLS1gKTtcbiAgaWYgKGFwaUtleSkge1xuICAgIGNvbnNvbGUubG9nKGBcdTI3MDUgQVBJIEtleSBMb2FkZWQ6ICR7YXBpS2V5LnN1YnN0cmluZygwLCA0KX0uLi4gKExlbmd0aDogJHthcGlLZXkubGVuZ3RofSlgKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLndhcm4oXCJcdTI2QTBcdUZFMEYgIEFQSSBLZXkgTUlTU0lORyAoR2VtaW5pIEFJIGZlYXR1cmVzIHdpbGwgYmUgZGlzYWJsZWQpXCIpO1xuICB9XG4gIGNvbnNvbGUubG9nKGAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cXG5gKTtcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICBub2RlUG9seWZpbGxzKHtcbiAgICAgICAgLy8gV2hldGhlciB0byBwb2x5ZmlsbCBgbm9kZTpgIHByb3RvY29sIGltcG9ydHMuXG4gICAgICAgIHByb3RvY29sSW1wb3J0czogdHJ1ZSxcbiAgICAgIH0pLFxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgLy8gTm8gbWFudWFsIGFsaWFzZXMgbmVlZGVkIHdpdGggdGhlIHBsdWdpblxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgLy8gU2VjdXJlbHkgaW5qZWN0IHRoZSBrZXlzIGR1cmluZyBidWlsZFxuICAgICAgJ3Byb2Nlc3MuZW52LkFQSV9LRVknOiBKU09OLnN0cmluZ2lmeShhcGlLZXkpLFxuICAgICAgJ3Byb2Nlc3MuZW52LkNPSU5HRUNLT19BUElfS0VZJzogSlNPTi5zdHJpbmdpZnkoY29pbkdlY2tvS2V5KSxcbiAgICAgIC8vIEVuc3VyZSBnbG9iYWwgaXMgYXZhaWxhYmxlXG4gICAgICAnZ2xvYmFsJzogJ3dpbmRvdycsXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgICBjb21tb25qc09wdGlvbnM6IHtcbiAgICAgICAgdHJhbnNmb3JtTWl4ZWRFc01vZHVsZXM6IHRydWUsXG4gICAgICB9LFxuICAgIH1cbiAgfTtcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUNBLFNBQVMsY0FBYyxlQUFlO0FBQ3RDLE9BQU8sV0FBVztBQUNsQixTQUFTLHFCQUFxQjtBQUc5QixJQUFNLFVBQVUsQ0FBQyxLQUE2QixXQUFtQjtBQUMvRCxRQUFNLE1BQU0sT0FBTyxLQUFLLEdBQUcsRUFBRSxLQUFLLE9BQUssRUFBRSxZQUFZLE1BQU0sT0FBTyxZQUFZLENBQUM7QUFDL0UsU0FBTyxNQUFNLElBQUksR0FBRyxJQUFJO0FBQzFCO0FBR0EsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFFeEMsUUFBTSxNQUFNLFFBQVEsTUFBTyxRQUFnQixJQUFJLEdBQUcsRUFBRTtBQUNwRCxRQUFNLGFBQWEsUUFBUTtBQUczQixRQUFNLFNBQ0osUUFBUSxLQUFLLFNBQVMsS0FDdEIsUUFBUSxZQUFZLFNBQVMsS0FDN0IsUUFBUSxLQUFLLGdCQUFnQixLQUM3QixRQUFRLFlBQVksZ0JBQWdCLEtBQ3BDLFFBQVEsS0FBSyxjQUFjLEtBQzNCO0FBRUYsUUFBTSxlQUNKLFFBQVEsS0FBSyxtQkFBbUIsS0FDaEMsUUFBUSxZQUFZLG1CQUFtQixLQUN2QyxRQUFRLEtBQUssZUFBZSxLQUM1QixRQUFRLFlBQVksZUFBZSxLQUNuQztBQUdGLFVBQVEsSUFBSTtBQUFBLGtDQUFxQztBQUNqRCxNQUFJLFFBQVE7QUFDVixZQUFRLElBQUksMEJBQXFCLE9BQU8sVUFBVSxHQUFHLENBQUMsQ0FBQyxnQkFBZ0IsT0FBTyxNQUFNLEdBQUc7QUFBQSxFQUN6RixPQUFPO0FBQ0wsWUFBUSxLQUFLLHFFQUEyRDtBQUFBLEVBQzFFO0FBQ0EsVUFBUSxJQUFJO0FBQUEsQ0FBcUM7QUFFakQsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sY0FBYztBQUFBO0FBQUEsUUFFWixpQkFBaUI7QUFBQSxNQUNuQixDQUFDO0FBQUEsSUFDSDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBO0FBQUEsTUFFUDtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQTtBQUFBLE1BRU4sdUJBQXVCLEtBQUssVUFBVSxNQUFNO0FBQUEsTUFDNUMsaUNBQWlDLEtBQUssVUFBVSxZQUFZO0FBQUE7QUFBQSxNQUU1RCxVQUFVO0FBQUEsSUFDWjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsUUFBUTtBQUFBLE1BQ1IsaUJBQWlCO0FBQUEsUUFDZix5QkFBeUI7QUFBQSxNQUMzQjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
