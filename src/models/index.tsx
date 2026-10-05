import { CSSProperties, Dispatch, ReactNode, SetStateAction } from "react";
import { IdeType } from "../utils";


export interface ISettingsModalProps {
  icon?: ReactNode;
  toggleBtnCss?: CSSProperties;
  modalCss?: CSSProperties;
}

export interface IReactClickInspector extends ISettingsModalProps {
  children: ReactNode;
  ignoredPaths?: string | string[];
}

export interface IDevInspectorProvider {
  children: ReactNode;
  ignoredPaths?: string | string[];
  showPopup: () => void;
}



export interface DevInspectorContextType {
  logOnly: boolean;
  openInVSCode: boolean;
  IDEType: IdeType | undefined;
  setLogOnly: Dispatch<SetStateAction<boolean>>;
  setOpenInVSCode: Dispatch<SetStateAction<boolean>>;
  setIDEType: Dispatch<SetStateAction<IdeType | undefined>>;
};
