import { expect, it } from 'vitest';
import { useStudio } from './store';
it('website demo models contain only code-hosting contribution calendars', () => {
  useStudio.getState().loadDemo();
  const { bundle } = useStudio.getState();
  expect(bundle.sources.map(s => s.id)).toEqual(['github', 'gitee', 'gitlab']);
  expect(bundle.sources.every(s => s.metric === 'contributions' && s.sample)).toBe(true);
  expect(bundle.sources[2].client).toContain('Beta');
});
