type Props = {
  isHtmlMode: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  backgroundFileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBackgroundFileChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export function HtmlFileInputs({
  isHtmlMode,
  fileInputRef,
  backgroundFileInputRef,
  onFileChange,
  onBackgroundFileChange,
}: Props) {
  if (!isHtmlMode) {
    return null;
  }

  return (
    <>
      <input
        type="file"
        ref={fileInputRef as React.RefObject<HTMLInputElement>}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={onFileChange}
      />
      <input
        type="file"
        ref={backgroundFileInputRef as React.RefObject<HTMLInputElement>}
        style={{ display: 'none' }}
        accept="image/*"
        onChange={onBackgroundFileChange}
      />
    </>
  );
}
