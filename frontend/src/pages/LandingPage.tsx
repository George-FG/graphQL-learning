import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useApolloClient } from "@apollo/client/react";
import { useAuthBootstrap } from "../context/AuthBootstrap";
import { DELETE_DECK_MUTATION } from "../graphql/mutations";
import { MY_DECKS_QUERY } from "../graphql/queries";
import FlashcardViewer from "../components/FlashcardViewer";
import ExamMode from "../components/ExamMode";
import type { Mutation, MutationDeleteDeckArgs, Query } from "@generated/generated";

type MyDecksResponse = Pick<Query, "myDecks">;
type DeleteDeckResponse = Pick<Mutation, "deleteDeck">;

type ActiveDeck = { id: string; name: string; cardCount: number };
type Mode = "flashcard" | "exam";

export default function LandingPage() {
  const { isLoggedIn } = useAuthBootstrap();
  const [activeDeck, setActiveDeck] = useState<ActiveDeck | null>(null);
  const [mode, setMode] = useState<Mode>("flashcard");

  const { data: decksData, loading: decksLoading } = useQuery<MyDecksResponse>(
    MY_DECKS_QUERY,
    { skip: !isLoggedIn, fetchPolicy: "cache-and-network" }
  );

  const apollo = useApolloClient();

  const [deleteDeck] = useMutation<DeleteDeckResponse, MutationDeleteDeckArgs>(
    DELETE_DECK_MUTATION,
    {
      refetchQueries: [{ query: MY_DECKS_QUERY }],
      update(cache, _result, { variables }) {
        const deckId = variables?.id;
        if (!deckId) return;
        // Evict normalised Deck object (removes it from all queries that reference it)
        cache.evict({ id: cache.identify({ __typename: "Deck", id: deckId }) });
        // Evict paginated deck card queries for this deck
        cache.evict({ id: "ROOT_QUERY", fieldName: "deck" });
        // Evict all cached quiz question batches (loaded on-demand, safe to purge)
        cache.evict({ id: "ROOT_QUERY", fieldName: "quizQuestions" });
        cache.gc();
      },
    }
  );

  const openDeck = (deck: ActiveDeck, m: Mode) => {
    setMode(m);
    setActiveDeck(deck);
  };

  const handleDeleteDeck = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this deck?")) return;
    await deleteDeck({ variables: { id } });
  };

  const decks = decksData?.myDecks ?? [];

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
        <h2>Your Decks</h2>
      </div>

      {decksLoading && decks.length === 0 ? (
        <p className="decks-empty">Loading decks…</p>
      ) : decks.length === 0 ? (
        <p className="decks-empty">
          No decks yet. Use &ldquo;Upload Deck&rdquo; in the header to add one.
        </p>
      ) : (
        <ul className="deck-list">
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

