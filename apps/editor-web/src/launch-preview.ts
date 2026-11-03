import { applyOperations, type Snapshot } from '@design-workbench/m0-contract';

/** A launch paints a reversible preview; the saved document is untouched. */
export function launchPreviewSnapshot(base: Snapshot, backgroundColor: string): Snapshot {
  const next = structuredClone(base);
  next.theme.tokens['color.background'].value = backgroundColor;
  const channels = backgroundColor.slice(1).match(/../g)!.map((value) => parseInt(value, 16) / 255);
  const lightness = channels.reduce((sum, channel, index) => sum + (channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index]!, 0);
  next.theme.tokens['color.text'].value = lightness > .179 ? '#1c2533' : '#f3f1eb';
  return applyOperations(base, [{ op: 'update_theme', tokens: { 'color.background': next.theme.tokens['color.background'], 'color.text': next.theme.tokens['color.text'] } }]);
}
