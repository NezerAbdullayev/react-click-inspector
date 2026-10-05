export type IdeType = 'vsCode' | 'webstorm' | undefined;

export const getVSCodeLink = (filePath: string, lineNumber: number, IDEType?: IdeType): string => {
  const normalizedPath = filePath.replace(/\\/g, '/');

  if (IDEType === 'webstorm') {
    return `jetbrains://webstorm/navigate/reference?file=${encodeURIComponent(
      normalizedPath,
    )}&line=${lineNumber}`;
  }

  return `vscode://file/${normalizedPath}:${lineNumber}:1`;
};

export const getOpenInEditorUrl = (
  origin: string,
  endpointPath: string,
  filePath: string,
  line: number,
): string => `${origin}${endpointPath}?file=${encodeURIComponent(`${filePath}:${line}:1`)}`;
