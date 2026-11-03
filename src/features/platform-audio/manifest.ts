// Local CC0 assets. Original filenames, creator links and licenses: /audio/platform/licenses/.
export const MUSIC = {
  hub: '/audio/platform/schmoovin.ogg',
  setup: '/audio/platform/quaint-questions.ogg',
  entry: '/audio/platform/schmoovin.ogg',
} as const;
export const EFFECTS = {
  hover: { file: 'hover.ogg', gain: .24 },
  click: { file: 'click.ogg', gain: .65 },
  avatar: { file: 'avatar.ogg', gain: .65 },
  panel: { file: 'panel.ogg', gain: .5 },
  choice: { file: 'choice.ogg', gain: .65 },
  launch: { file: 'launch.ogg', gain: .55 },
  locked: { file: 'locked.ogg', gain: .45 },
  success: { file: 'success.ogg', gain: .6 },
} as const;
export type SoundEvent = keyof typeof EFFECTS;
export type MusicContext = keyof typeof MUSIC;
