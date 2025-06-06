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
