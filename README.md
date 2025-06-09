In this example, the `ReactClickInspector` component is imported and wrapped around the root of the application (e.g., in `App.tsx` or `main.tsx`). This ensures that all click events within the entire application are tracked.

You can also use the `ignoredPaths` prop to exclude specific paths or folders from being inspected. This is useful when you don’t want to log clicks within shared components or libraries.

### Example usage:

```tsx
import React from "react";
import ReactClickInspector from "react-click-inspector";
import App from "./App";
//ignoredPaths =string || string[]
const Root = () => (
  <ReactClickInspector ignoredPaths={["fe-common", "common/myLibrary"]}>
    <App />
  </ReactClickInspector>
);

export default Root;
```

## 🖼 Screenshot

![Click Inspector Demo](./image.png)
Below the screenshot, you can see two buttons rendered in the UI:

- The **first button** copies the file path of the clicked element to the clipboard.
- The **second button** opens the corresponding file and line number directly in **VS Code**.

> ⚠️ Note: Support for **WebStorm** and other IDEs will be added in upcoming versions.
