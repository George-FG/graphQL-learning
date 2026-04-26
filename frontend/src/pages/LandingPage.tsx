import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuthBootstrap } from "../context/AuthBootstrap";
import { DELETE_DECK_MUTATION, DELETE_SET_MUTATION } from "../graphql/mutations";
import { BROWSE_QUERY } from "../graphql/queries";
import FlashcardViewer from "../components/FlashcardViewer";
import ExamMode from "../components/ExamMode";
import type { Mutation, MutationDeleteDeckArgs, MutationDeleteDeckSetArgs, Query } from "@generated/generated";

type BrowseResponse = Pick<Query, "browse">;
type DeleteDeckResponse = Pick<Mutation, "deleteDeck">;
type DeleteSetResponse = Pick<Mutation, "deleteDeckSet">;

type ActiveDeck = { id: string; name: string; cardCount: number };
type Mode = "flashcard" | "exam";
type BreadcrumbEntry = { id: string | null; name: string };

export default function LandingPage() {
  const { isLoggedIn } = useAuthBootstrap();
  const [activeDeck, setActiveDeck] = useState<ActiveDeck | null>(null);
  const [mode, setMode] = useState<Mode>("flashcard");
  const [currentSetId, setCurrentSetId] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbEntry[]>([
    { id: null, name: "Home" },
  ]);

  const { data: browseData, loading: browseLoading } = useQuery<BrowseResponse>(
    BROWSE_QUERY,
    {
      variables: { parentSetId: currentSetId },
      skip: !isLoggedIn,
      fetchPolicy: "cache-and-network",
    }
  );

  const [deleteDeck] = useMutation<DeleteDeckResponse, MutationDeleteDeckArgs>(
    DELETE_DECK_MUTATION
  );

  const [deleteSet] = useMutation<DeleteSetResponse, MutationDeleteDeckSetArgs>(
    DELETE_SET_MUTATION
  );

  const enterSet = (set: { id: string; name: string }) => {
    setCurrentSetId(set.id);
    setBreadcrumb((prev) => [...prev, { id: set.id, name: set.name }]);
    setActiveDeck(null);
  };

  const navigateToBreadcrumb = (index: number) => {
    const next = breadcrumb.slice(0, index + 1);
    setBreadcrumb(next);
    setCurrentSetId(next[next.length - 1].id);
    setActiveDeck(null);
  };

  const handleDeleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this deck?")) return;
    await deleteDeck({
      variables: { id },
      refetchQueries: [{ query: BROWSE_QUERY, variables: { parentSetId: currentSetId } }],
    });
  };

  const handleDeleteSet = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this set and everything inside it?")) return;
    await deleteSet({
      variables: { id },
      refetchQueries: [{ query: BROWSE_QUERY, variables: { parentSetId: currentSetId } }],
    });
  };

  const openDeck = (deck: ActiveDeck, m: Mode) => {
    setMode(m);
    setActiveDeck(deck);
  };

  const sets = browseData?.browse.sets ?? [];
  const decks = browseData?.browse.decks ?? [];
  const isEmpty = sets.length === 0 && decks.length === 0;

  if (!isLoggedIn) {
    return (
      <div className="home-empty landing-welcome">
        <h2>Welcome to Fish App</h2>
        <p>Log in or sign up to start studying your Anki decks.</p>
      </div>
    );
  }

  return (
    <div className="decks-page">
      <div className="decks-header">
        {/* Breadcrumb navigation */}
        <nav className="breadcrumb" aria-label="Set navigation">
          {breadcrumb.map((entry, i) => (
            <span key={i} className="breadcrumb-item">
              {i < breadcrumb.length - 1 ? (
                <>
                  <button
                    className="breadcrumb-link"
                    onClick={() => navigateToBreadcrumb(i)}
                  >
                    {entry.name}
                  </button>
                  <span className="breadcrumb-sep"> › </span>
                </>
              ) : (
                <span className="breadcrumb-current">{entry.name}</span>
              )}
            </span>
          ))}
        </nav>
      </div>

      {browseLoading && isEmpty ? (
        <p className="decks-empty">Loading…</p>
      ) : isEmpty ? (
        <p className="decks-empty">
          {currentSetId
            ? "This set is empty."
            : "No sets yet. Use \"Upload Deck\" in the header to add one."}
        </p>
      ) : (
        <ul className="deck-list">
          {/* Child sets */}
          {sets.map((set) => (
            <li
              key={set.id}
              className="deck-item deck-item--actions deck-item--set"
              onClick={() => enterSet(set)}
              style={{ cursor: "pointer" }}
            >
              <div className="deck-item-info">
                <span className="deck-name">📁 {set.name}</span>
                <span className="deck-meta">
                  {set.childSetCount > 0 && `${set.childSetCount} set${set.childSetCount !== 1 ? "s" : ""}`}
                  {set.childSetCount > 0 && set.deckCount > 0 && " · "}
                  {set.deckCount > 0 && `${set.deckCount} deck${set.deckCount !== 1 ? "s" : ""}`}
                  {set.childSetCount === 0 && set.deckCount === 0 && "Empty"}
                </span>
              </div>
              <div className="deck-item-buttons">
                <button
                  className="deck-delete-btn"
                  onClick={(e) => handleDeleteSet(set.id, e)}
                  aria-label={`Delete set ${set.name}`}
                  title="Delete set"
                >
                  ✕
                </button>
              </div>
            </li>
          ))}

          {/* Decks at current level */}
          {decks.map((deck) => {
            const d = { id: deck.id, name: deck.name, cardCount: deck.cardCount };
            return (
              <li key={deck.id} className="deck-item deck-item--actions">
                <div className="deck-item-info">
                  <span className="deck-name">{deck.name}</span>
                  <span className="deck-meta">{deck.cardCount} cards</span>
                </div>
                <div className="deck-item-buttons">
                  <button
                    className="deck-action-btn deck-action-btn--study"
                    onClick={() => openDeck(d, "flashcard")}
                    title="Study flashcards"
                  >
                    Study
                  </button>
                  <button
                    className="deck-action-btn deck-action-btn--exam"
                    onClick={() => openDeck(d, "exam")}
                    title="Exam mode"
                  >
                    Exam
                  </button>
                  <button
                    className="deck-delete-btn"
                    onClick={(e) => handleDeleteDeck(deck.id, e)}
                    aria-label={`Delete ${deck.name}`}
                    title="Delete deck"
                  >
                    ✕
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activeDeck && mode === "flashcard" && (
        <FlashcardViewer
          deckId={activeDeck.id}
          deckName={activeDeck.name}
          totalCards={activeDeck.cardCount}
          onClose={() => setActiveDeck(null)}
        />
      )}

      {activeDeck && mode === "exam" && (
        <ExamMode
          deckId={activeDeck.id}
          deckName={activeDeck.name}
          totalCards={activeDeck.cardCount}
          onClose={() => setActiveDeck(null)}
        />
      )}
    </div>
  );
}

