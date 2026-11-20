// Entry of the planner chunk (dynamic import from the /raumplaner/ page script only).
import { createRoot } from 'react-dom/client';
import { Planer } from './Planer.tsx';

export function startePlaner(host: HTMLElement, opt: { webgl: boolean; leicht: boolean }): () => void {
  const root = createRoot(host);
  root.render(<Planer webgl={opt.webgl} leicht={opt.leicht} />);
  return () => root.unmount();
}
