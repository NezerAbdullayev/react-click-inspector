import type { ServerResponse } from 'node:http';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig, Plugin } from 'vite';
import { FIXTURE_HOST, FIXTURE_PORT, LAST_OPEN_PATH, OPEN_IN_EDITOR_PATH } from '../constants';

export interface ILastOpenResponse {
  file: string | null;
}

const send = (res: ServerResponse, contentType: string, body: string) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'no-store');
  res.end(body);
};

const openInEditorRecorder = (): Plugin => {
  let lastOpenedFile: string | null = null;

  return {
    name: 'rci-open-in-editor-recorder',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = new URL(req.url ?? '/', 'http://localhost');

        if (url.pathname === OPEN_IN_EDITOR_PATH) {
          lastOpenedFile = url.searchParams.get('file');
          send(res, 'text/plain', 'ok');
          return;
        }

        if (url.pathname === LAST_OPEN_PATH) {
          if (req.method === 'DELETE') lastOpenedFile = null;
          const response: ILastOpenResponse = { file: lastOpenedFile };
          send(res, 'application/json', JSON.stringify(response));
          return;
        }

        next();
      });
    },
  };
};

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  plugins: [openInEditorRecorder(), react()],
  esbuild: { jsxDev: true },
  clearScreen: false,
  server: {
    host: FIXTURE_HOST,
    port: FIXTURE_PORT,
    strictPort: true,
    open: false,
    hmr: false,
  },
});
