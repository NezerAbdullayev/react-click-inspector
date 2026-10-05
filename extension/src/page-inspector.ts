import { createPageInspector, IPageInspector } from './page/inspector';

interface IInspectorWindow extends Window {
  __rciPageInspector?: IPageInspector;
}

const inspectorWindow = window as IInspectorWindow;

if (!inspectorWindow.__rciPageInspector) {
  inspectorWindow.__rciPageInspector = createPageInspector(inspectorWindow);
}
