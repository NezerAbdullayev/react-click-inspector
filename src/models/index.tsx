import { CSSProperties, Dispatch, SetStateAction } from "react";
import { IdeType } from "../utils";


export interface ISettingsModalProps {
  icon?: React.ReactNode;
  toggleBtnCss?: CSSProperties;
  modalCss?: CSSProperties;

}

export interface IReactClickInspector extends ISettingsModalProps {
  children: React.ReactNode;
  ignoredPaths?: string | string[];
}

export interface IDevInspectorProvider extends IReactClickInspector {
  showPopup: () => void;
}



export interface DevInspectorContextType {
  logOnly: boolean;
  visbTool: boolean;
  openInVSCode: boolean;
  openInWebStorm: boolean;
  IDEType: IdeType | undefined;
  setLogOnly: Dispatch<SetStateAction<boolean>>;
  setVisbTool: Dispatch<SetStateAction<boolean>>;
  setOpenInVSCode: Dispatch<SetStateAction<boolean>>;
  setOpenInWebStorm: Dispatch<SetStateAction<boolean>>;
  setIDEType: Dispatch<SetStateAction<IdeType | undefined>>;
};