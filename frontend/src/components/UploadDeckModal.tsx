import { useRef, useState } from "react";
import { useUploadApkg } from "../shared/hooks";

type Props = {
  onClose: () => void;
};

export default function UploadDeckModal({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [localError, setLocalError] = useState("");
  const [shuffleDeck, setShuffleDeck] = useState(false);

  const { uploadApkg, loading, error } = useUploadApkg();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError("");
    setFileName(file.name);

    // Read as ArrayBuffer and base64-encode for transport
    const reader = new FileReader();
    reader.onload = (ev) => {
      const arrayBuffer = ev.target?.result as ArrayBuffer;
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      uint8Array.forEach((byte) => (binary += String.fromCharCode(byte)));
      setFileContent(btoa(binary));
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!fileContent) {
      setLocalError("Please select an .apkg file.");
      return;
    }

    const result = await uploadApkg({
      variables: { fileContent, shuffle: shuffleDeck },
    });
    const count = result.data?.uploadApkg ?? 0;
    if (count === 0) {
      setLocalError("No decks were found in the file.");
      return;
    }
    onClose();
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="upload-modal-title"
      >
        <h2 id="upload-modal-title">Upload</h2>
        <p className="modal-subtitle">
          In Anki, navigate to the deck you want to upload, click the{" "}
          <strong>gear icon</strong>, then choose <strong>Export</strong> →{" "}
          <strong>Export as .apkg</strong>.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field field--checkbox">
            <input
              type="checkbox"
              checked={shuffleDeck}
              onChange={(e) => setShuffleDeck(e.target.checked)}
            />
            <span>Shuffle card order</span>
          </label>

          <div className="file-field">
            <input
              ref={inputRef}
              type="file"
              accept=".apkg"
              id="anki-file"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => inputRef.current?.click()}
            >
              {fileName ? "Change File" : "Choose .apkg File"}
            </button>
            {fileName && <span className="file-name">{fileName}</span>}
          </div>

          {(localError || error) && (
            <p className="error-text">{localError || error?.message}</p>
          )}

          <div className="modal-actions">
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={loading || !fileContent}
            >
              {loading ? "Importing..." : "Import"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

