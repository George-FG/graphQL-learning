import { useEffect, useRef, useState } from "react";
import { useLazyQuery } from "@apollo/client/react";
import { DECK_QUERY } from "../../graphql/queries";
import type { Query, QueryDeckArgs, Card } from "@generated/generated";

const PAGE_SIZE = 10;
const PREFETCH_AT = 3;

type CardSlice = Pick<Card, "id" | "front" | "back" | "position">;
type DeckResponse = Pick<Query, "deck">;

export function useFlashcardDeck(deckId: string, totalCards: number) {
  const [cards, setCards] = useState<CardSlice[]>([]);
  const [index, setIndex] = useState(0);
  const fetchedOffsets = useRef(new Set<number>());

  const [fetchCards, { data: fetchedData }] = useLazyQuery<DeckResponse, QueryDeckArgs>(DECK_QUERY, {
    fetchPolicy: "network-only",
  });

  useEffect(() => {
    const incoming = fetchedData?.deck?.cards ?? [];
    if (incoming.length === 0) return;
    setCards((prev) => {
      const positions = new Set(prev.map((c) => c.position));
      const fresh = incoming.filter((c) => !positions.has(c.position));
      if (fresh.length === 0) return prev;
      return [...prev, ...fresh].sort((a, b) => a.position - b.position);
    });
  }, [fetchedData]);

  const fetch = (offset: number) => {
    if (fetchedOffsets.current.has(offset)) return;
    if (offset >= totalCards) return;
    fetchedOffsets.current.add(offset);
    void fetchCards({ variables: { id: deckId, offset, limit: PAGE_SIZE } });
  };

  useEffect(() => {
    fetchedOffsets.current = new Set();
    setCards([]);
    setIndex(0);
    fetch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  useEffect(() => {
    const bufferEnd = cards.length;
    if (index >= bufferEnd - PREFETCH_AT) {
      fetch(bufferEnd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, cards.length]);

  return { cards, index, setIndex };
}
