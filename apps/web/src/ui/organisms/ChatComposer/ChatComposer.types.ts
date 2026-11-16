export type ChatComposerProps = {
  isBusy: boolean;
  onSend: (text: string) => void;
  onStop: () => void;
};
