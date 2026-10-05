import { IExtensionSettings, isExtensionSettings } from './settings';

export type InspectorMode = 'copy' | 'vscode' | 'webstorm' | null;
export type ActiveMode = Exclude<InspectorMode, null>;
export type FailReason = 'no-fiber' | 'no-source' | 'all-ignored' | 'editor-request-failed';

export interface IPageStatus {
  hasReact: boolean;
  hasSourceInfo: boolean;
  mode: InspectorMode;
}

export const MESSAGE_SOURCE = 'rci';

export type BridgeToPage =
  | { source: typeof MESSAGE_SOURCE; type: 'set-mode'; mode: InspectorMode }
  | { source: typeof MESSAGE_SOURCE; type: 'settings'; settings: IExtensionSettings }
  | { source: typeof MESSAGE_SOURCE; type: 'ping' };

export type PageToBridge =
  | ({ source: typeof MESSAGE_SOURCE; type: 'status' } & IPageStatus)
  | { source: typeof MESSAGE_SOURCE; type: 'result'; ok: true; mode: ActiveMode; filePath: string; line: number }
  | { source: typeof MESSAGE_SOURCE; type: 'result'; ok: false; mode: ActiveMode; reason: FailReason };

export type RuntimeRequest =
  | { type: 'set-mode'; mode: InspectorMode }
  | { type: 'get-status' };

export type RuntimeResponse = IPageStatus;

export type RuntimeEvent = { type: 'status' } & IPageStatus;

export const ACTIVE_MODES: readonly ActiveMode[] = ['copy', 'vscode', 'webstorm'];

export const FAIL_REASONS: readonly FailReason[] = [
  'no-fiber',
  'no-source',
  'all-ignored',
  'editor-request-failed',
];

export const DEFAULT_PAGE_STATUS: IPageStatus = {
  hasReact: false,
  hasSourceInfo: false,
  mode: null,
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const isActiveMode = (value: unknown): value is ActiveMode =>
  typeof value === 'string' && (ACTIVE_MODES as readonly string[]).includes(value);

export const isInspectorMode = (value: unknown): value is InspectorMode =>
  value === null || isActiveMode(value);

export const isFailReason = (value: unknown): value is FailReason =>
  typeof value === 'string' && (FAIL_REASONS as readonly string[]).includes(value);

export const isPageStatus = (value: unknown): value is IPageStatus =>
  isRecord(value) &&
  typeof value.hasReact === 'boolean' &&
  typeof value.hasSourceInfo === 'boolean' &&
  isInspectorMode(value.mode);

export const isBridgeToPage = (data: unknown): data is BridgeToPage => {
  if (!isRecord(data) || data.source !== MESSAGE_SOURCE) return false;

  switch (data.type) {
    case 'set-mode':
      return isInspectorMode(data.mode);
    case 'settings':
      return isExtensionSettings(data.settings);
    case 'ping':
      return true;
    default:
      return false;
  }
};

export const isPageToBridge = (data: unknown): data is PageToBridge => {
  if (!isRecord(data) || data.source !== MESSAGE_SOURCE) return false;

  switch (data.type) {
    case 'status':
      return isPageStatus(data);
    case 'result':
      if (!isActiveMode(data.mode)) return false;
      if (data.ok === true) {
        return (
          typeof data.filePath === 'string' &&
          data.filePath.length > 0 &&
          typeof data.line === 'number' &&
          Number.isInteger(data.line) &&
          data.line > 0
        );
      }
      return data.ok === false && isFailReason(data.reason);
    default:
      return false;
  }
};

export const isRuntimeRequest = (message: unknown): message is RuntimeRequest => {
  if (!isRecord(message)) return false;

  switch (message.type) {
    case 'set-mode':
      return isInspectorMode(message.mode);
    case 'get-status':
      return true;
    default:
      return false;
  }
};

export const isRuntimeEvent = (message: unknown): message is RuntimeEvent =>
  isRecord(message) && message.type === 'status' && isPageStatus(message);
