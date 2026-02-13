import { defineConfig } from "vite";
import fs from 'fs';
import path from 'path';

export default defineConfig({
  base: '/arJSMarkerBasedBIM/',
  server: {
    https: {
      key: fs.readFileSync(path.resolve(__dirname, './certs/cert.key')),
      cert: fs.readFileSync(path.resolve(__dirname, './certs/cert.crt')),
    },
    host: '0.0.0.0',
  },
});