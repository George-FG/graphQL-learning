import { useState } from "react";
import { useMutation, useQuery } from "@apollo/client/react";
import { useAuthBootstrap } from "../context/AuthBootstrap";
import { DELETE_DECK_MUTATION } from "../graphql/mutations";
import { MY_DECKS_QUERY } from "../graphql/queries";
import FlashcardViewer from "../components/FlashcardViewer";
import type { Mutation, MutationDeleteDeckArgs, Query } from "@generated/generated";

type MyDecksResponse = Pick<Query, "myDecks">;
type DeleteDeckResponse = Pick<Mutation, "deleteDeck">;

type ActiveDeck = { id: string; name: string; cardCount: number };

export default function LandingPage() {
  const { isLoggedIn } = useAuthBootstrap();
  const [activeDeck, setActiveDeck] = useState<ActiveDeck | null>(null);

  const { data: decksData, loading: decksLoading } = useQuery<MyDecksResponse>(
    MY_DECKS_QUERY,
    { skip: !isLoggedIn, fetchPolicy: "cache-and-network" }
  );

  const [deleteDeck] = useMutation<DeleteDeckResponse, MutationDeleteDeckArgs>(
    DELETE_DECK_MUTATION,
    { refetchQueries: [{ query: MY_DECKS_QUERY }] }
  );

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
          {decks.map((deck) => (
            <li key={deck.id} className="deck-item">
              <button
                className="deck-item-btn"
                onClick={() => setActiveDeck({ id: deck.id, name: deck.name, cardCount: deck.cardCount })}
              >
                <span className="deck-name">{deck.name}</span>
                <span className="deck-meta">{deck.cardCount} cards</span>
              </button>
              <button
                className="deck-delete-btn"
                onClick={(e) => handleDeleteDeck(deck.id, e)}
                aria-label={`Delete ${deck.name}`}
                title="Delete deck"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {activeDeck && (
        <FlashcardViewer
          deckId={activeDeck.id}
          deckName={activeDeck.name}
          totalCards={activeDeck.cardCount}
          onClose={() => setActiveDeck(null)}
        />
      )}
    </div>
  );
}

