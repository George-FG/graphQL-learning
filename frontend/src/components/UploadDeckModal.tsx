import { useRef, useState } from "react";
import { useMutation } from "@apollo/client/react";
import { UPLOAD_DECK_MUTATION } from "../graphql/mutations";
import { MY_DECKS_QUERY } from "../graphql/queries";
import type { Mutation, MutationUploadDeckArgs } from "@generated/generated";

type UploadDeckResponse = Pick<Mutation, "uploadDeck">;

type Props = {
  onClose: () => void;
};

export default function UploadDeckModal({ onClose }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [deckName, setDeckName] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileContent, setFileContent] = useState("");
  const [localError, setLocalError] = useState("");
  const [shuffleDeck, setShuffleDeck] = useState(false);

  const [uploadDeck, { loading, error }] = useMutation<
    UploadDeckResponse,
    MutationUploadDeckArgs
  >(UPLOAD_DECK_MUTATION, {
    refetchQueries: [{ query: MY_DECKS_QUERY }],
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLocalError("");
    setFileName(file.name);

    // Auto-fill deck name from filename (strip extension)
    if (!deckName) {
      setDeckName(file.name.replace(/\.[^.]+$/, ""));
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setFileContent(ev.target?.result as string);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError("");

    if (!fileContent) {
      setLocalError("Please select a .txt file.");
      return;
    }

    const trimmedName = deckName.trim();
    if (!trimmedName) {
      setLocalError("Please enter a deck name.");
      return;
    }

    await uploadDeck({ variables: { name: trimmedName, fileContent, shuffle: shuffleDeck } });
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
        <h2 id="upload-modal-title">Upload Anki Deck</h2>
        <p className="modal-subtitle">
          Upload a tab-separated .txt export from Anki.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Deck Name</span>
            <input
              type="text"
              value={deckName}
              onChange={(e) => setDeckName(e.target.value)}
              placeholder="e.g. Respiratory Physiology"
              required
            />
          </label>

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
              accept=".txt"
              id="anki-file"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
            <button
              type="button"
              className="secondary-button"
              onClick={() => inputRef.current?.click()}
            >
              {fileName ? "Change File" : "Choose .txt File"}
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
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
