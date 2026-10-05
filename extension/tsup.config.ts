import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { defineConfig, Options } from 'tsup';

const outDir = 'extension/dist';

const copyStaticFiles = () => {
  mkdirSync(outDir, { recursive: true });
  cpSync('extension/manifest.json', `${outDir}/manifest.json`);
  cpSync('extension/src/popup/popup.html', `${outDir}/popup.html`);
  cpSync('extension/src/popup/popup.css', `${outDir}/popup.css`);
  cpSync('extension/public', outDir, { recursive: true });
};

const shared: Options = {
  outDir,
  tsconfig: 'extension/tsconfig.json',
  platform: 'browser',
  target: 'chrome111',
  splitting: false,
  sourcemap: false,
  dts: false,
  clean: false,
  outExtension: () => ({ js: '.js' }),
};

export default defineConfig(() => {
  rmSync(outDir, { recursive: true, force: true });

  return [
    {
      ...shared,
      entry: { background: 'extension/src/background.ts' },
      format: 'esm',
    },
    {
      ...shared,
      entry: {
        'content-bridge': 'extension/src/content-bridge.ts',
        'page-inspector': 'extension/src/page-inspector.ts',
        popup: 'extension/src/popup/popup.ts',
      },
      format: 'iife',
      onSuccess: async () => copyStaticFiles(),
    },
  ];
});
