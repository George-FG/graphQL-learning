export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type AggregatedAnswer = {
  __typename?: 'AggregatedAnswer';
  cardId?: Maybe<Scalars['ID']['output']>;
  deckId?: Maybe<Scalars['ID']['output']>;
  deckName?: Maybe<Scalars['String']['output']>;
  front: Scalars['String']['output'];
  selectedOptionId?: Maybe<Scalars['ID']['output']>;
  sessionDate: Scalars['String']['output'];
  timeSecs: Scalars['Int']['output'];
  wasCorrect: Scalars['Boolean']['output'];
};

export type AuthResult = {
  __typename?: 'AuthResult';
  User: User;
  accessToken: Scalars['String']['output'];
};

export type BrowseResult = {
  __typename?: 'BrowseResult';
  decks: Array<Deck>;
  sets: Array<DeckSet>;
};

export type Card = {
  __typename?: 'Card';
  back: Scalars['String']['output'];
  front: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  position: Scalars['Int']['output'];
};

export type Deck = {
  __typename?: 'Deck';
  cardCount: Scalars['Int']['output'];
  cards: Array<Card>;
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
};

export type DeckSet = {
  __typename?: 'DeckSet';
  childSetCount: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  deckCount: Scalars['Int']['output'];
  id: Scalars['ID']['output'];
  name: Scalars['String']['output'];
  parentId?: Maybe<Scalars['ID']['output']>;
  totalCardCount: Scalars['Int']['output'];
};

export type ExamAggregate = {
  __typename?: 'ExamAggregate';
  answers: Array<AggregatedAnswer>;
  avgTimeSecs: Scalars['Float']['output'];
  correctCount: Scalars['Int']['output'];
  pctCorrect: Scalars['Float']['output'];
  sessionCount: Scalars['Int']['output'];
  totalAnswered: Scalars['Int']['output'];
};

export type ExamAnswerDetail = {
  __typename?: 'ExamAnswerDetail';
  cardId?: Maybe<Scalars['ID']['output']>;
  front: Scalars['String']['output'];
  selectedOptionId?: Maybe<Scalars['ID']['output']>;
  timeSecs: Scalars['Int']['output'];
  wasCorrect: Scalars['Boolean']['output'];
};

export type ExamSessionDetail = {
  __typename?: 'ExamSessionDetail';
  answeredCount: Scalars['Int']['output'];
  answers: Array<ExamAnswerDetail>;
  avgTimeSecs: Scalars['Float']['output'];
  correctCount: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isRandom: Scalars['Boolean']['output'];
  pctCorrect: Scalars['Float']['output'];
  sourceName: Scalars['String']['output'];
  totalCards: Scalars['Int']['output'];
};

export type ExamSessionSummary = {
  __typename?: 'ExamSessionSummary';
  answeredCount: Scalars['Int']['output'];
  avgTimeSecs: Scalars['Float']['output'];
  correctCount: Scalars['Int']['output'];
  createdAt: Scalars['String']['output'];
  id: Scalars['ID']['output'];
  isRandom: Scalars['Boolean']['output'];
  pctCorrect: Scalars['Float']['output'];
  sourceName: Scalars['String']['output'];
  totalCards: Scalars['Int']['output'];
};

export type Mutation = {
  __typename?: 'Mutation';
  deleteDeck: Scalars['Boolean']['output'];
  deleteDeckSet: Scalars['Boolean']['output'];
  login: AuthResult;
  logout: Scalars['Boolean']['output'];
  recordExamAnswer: Scalars['Boolean']['output'];
  refreshSession: AuthResult;
  signUp: AuthResult;
  startExamSession: Scalars['ID']['output'];
  uploadApkg: Scalars['Int']['output'];
};


export type MutationDeleteDeckArgs = {
  id: Scalars['ID']['input'];
};


export type MutationDeleteDeckSetArgs = {
  id: Scalars['ID']['input'];
};


export type MutationLoginArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationRecordExamAnswerArgs = {
  cardId: Scalars['ID']['input'];
  front: Scalars['String']['input'];
  selectedOptionId?: InputMaybe<Scalars['ID']['input']>;
  sessionId: Scalars['ID']['input'];
  timeSecs: Scalars['Int']['input'];
  wasCorrect: Scalars['Boolean']['input'];
};


export type MutationSignUpArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationStartExamSessionArgs = {
  deckId?: InputMaybe<Scalars['ID']['input']>;
  seed?: InputMaybe<Scalars['Int']['input']>;
  setId?: InputMaybe<Scalars['ID']['input']>;
  totalCards: Scalars['Int']['input'];
};


export type MutationUploadApkgArgs = {
  fileContent: Scalars['String']['input'];
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Query = {
  __typename?: 'Query';
  browse: BrowseResult;
  cardQuestion?: Maybe<QuizQuestion>;
  deck?: Maybe<Deck>;
  examAggregate: ExamAggregate;
  examHistory: Array<ExamSessionSummary>;
  examSessionDetail?: Maybe<ExamSessionDetail>;
  getUserByID: User;
  me?: Maybe<User>;
  myDecks: Array<Deck>;
  quizQuestions: QuizPage;
  quizQuestionsForSet: QuizPage;
};


export type QueryBrowseArgs = {
  parentSetId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryCardQuestionArgs = {
  cardId: Scalars['ID']['input'];
};


export type QueryDeckArgs = {
  id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryExamAggregateArgs = {
  deckId?: InputMaybe<Scalars['ID']['input']>;
  period?: InputMaybe<Scalars['String']['input']>;
  setId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryExamHistoryArgs = {
  deckId?: InputMaybe<Scalars['ID']['input']>;
  period?: InputMaybe<Scalars['String']['input']>;
  setId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryExamSessionDetailArgs = {
  id: Scalars['ID']['input'];
};


export type QueryGetUserByIdArgs = {
  ID: Scalars['ID']['input'];
};


export type QueryQuizQuestionsArgs = {
  deckId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  seed?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQuizQuestionsForSetArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
  seed?: InputMaybe<Scalars['Int']['input']>;
  setId: Scalars['ID']['input'];
};

export type QuizOption = {
  __typename?: 'QuizOption';
  id: Scalars['ID']['output'];
  text: Scalars['String']['output'];
};

export type QuizPage = {
  __typename?: 'QuizPage';
  questions: Array<QuizQuestion>;
  totalCards: Scalars['Int']['output'];
};

export type QuizQuestion = {
  __typename?: 'QuizQuestion';
  cardId: Scalars['ID']['output'];
  correctOptionId: Scalars['ID']['output'];
  front: Scalars['String']['output'];
  options: Array<QuizOption>;
};

export type User = {
  __typename?: 'User';
  ID: Scalars['ID']['output'];
  username: Scalars['String']['output'];
};
