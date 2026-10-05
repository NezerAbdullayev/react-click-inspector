import { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";

export type InspectorMode = 'copy' | 'vscode' | 'webstorm' | null;

export interface ISettingsModalProps {
  icon?: ReactNode;
  toggleBtnCss?: CSSProperties;
  modalCss?: CSSProperties;
}

export interface IReactClickInspector extends ISettingsModalProps {
  children: ReactNode;
  ignoredPaths?: string | string[];
  enabled?: boolean;
  openInEditorPath?: string;
}

export interface IDevInspectorProvider {
  children: ReactNode;
  ignoredPaths?: string | string[];
  openInEditorPath?: string;
  showPopup: (message?: string) => void;
}



export interface DevInspectorContextType {
  mode: InspectorMode;
  setMode: Dispatch<SetStateAction<InspectorMode>>;
};
