import { useState } from 'react';
import { LibraryButton } from './fixtures/LibraryButton';

export const App = () => {
  const [count, setCount] = useState(0);
  const [libraryClicks, setLibraryClicks] = useState(0);

  return (
    <main>
      <h1>React Click Inspector fixture</h1>
      <button type="button" data-testid="counter-button" onClick={() => setCount(value => value + 1)}>
        Count: {count}
      </button>
      <p>
        <a href="#docs" data-testid="docs-link">
          Docs
        </a>
      </p>
      <LibraryButton testId="library-button" onClick={() => setLibraryClicks(value => value + 1)}>
        Library clicks: {libraryClicks}
      </LibraryButton>
    </main>
  );
};
