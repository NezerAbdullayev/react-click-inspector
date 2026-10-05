import { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { IdeType } from "../utils";

export type InspectorMode = 'copy' | 'vscode' | null;

export interface ISettingsModalProps {
  icon?: ReactNode;
  toggleBtnCss?: CSSProperties;
  modalCss?: CSSProperties;
}

export interface IReactClickInspector extends ISettingsModalProps {
  children: ReactNode;
  ignoredPaths?: string | string[];
  enabled?: boolean;
}

export interface IDevInspectorProvider {
  children: ReactNode;
  ignoredPaths?: string | string[];
  showPopup: () => void;
}



export interface DevInspectorContextType {
  mode: InspectorMode;
  IDEType: IdeType | undefined;
  setMode: Dispatch<SetStateAction<InspectorMode>>;
  setIDEType: Dispatch<SetStateAction<IdeType | undefined>>;
};
