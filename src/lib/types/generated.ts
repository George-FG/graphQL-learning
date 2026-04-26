import { GraphQLResolveInfo } from 'graphql';
export type Maybe<T> = T | undefined;
export type InputMaybe<T> = T | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
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

export type Mutation = {
  __typename?: 'Mutation';
  deleteDeck: Scalars['Boolean']['output'];
  deleteDeckSet: Scalars['Boolean']['output'];
  login: AuthResult;
  logout: Scalars['Boolean']['output'];
  refreshSession: AuthResult;
  signUp: AuthResult;
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


export type MutationSignUpArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationUploadApkgArgs = {
  fileContent: Scalars['String']['input'];
  shuffle?: InputMaybe<Scalars['Boolean']['input']>;
};

export type Query = {
  __typename?: 'Query';
  browse: BrowseResult;
  deck?: Maybe<Deck>;
  getUserByID: User;
  me?: Maybe<User>;
  myDecks: Array<Deck>;
  quizQuestions: QuizPage;
  quizQuestionsForSet: QuizPage;
};


export type QueryBrowseArgs = {
  parentSetId?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryDeckArgs = {
  id: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryGetUserByIdArgs = {
  ID: Scalars['ID']['input'];
};


export type QueryQuizQuestionsArgs = {
  deckId: Scalars['ID']['input'];
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
};


export type QueryQuizQuestionsForSetArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  offset?: InputMaybe<Scalars['Int']['input']>;
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



export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = Record<PropertyKey, never>, TParent = Record<PropertyKey, never>, TContext = Record<PropertyKey, never>, TArgs = Record<PropertyKey, never>> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;





/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = {
  AuthResult: ResolverTypeWrapper<AuthResult>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  BrowseResult: ResolverTypeWrapper<BrowseResult>;
  Card: ResolverTypeWrapper<Card>;
  Deck: ResolverTypeWrapper<Deck>;
  DeckSet: ResolverTypeWrapper<DeckSet>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  QuizOption: ResolverTypeWrapper<QuizOption>;
  QuizPage: ResolverTypeWrapper<QuizPage>;
  QuizQuestion: ResolverTypeWrapper<QuizQuestion>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AuthResult: AuthResult;
  Boolean: Scalars['Boolean']['output'];
  BrowseResult: BrowseResult;
  Card: Card;
  Deck: Deck;
  DeckSet: DeckSet;
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  QuizOption: QuizOption;
  QuizPage: QuizPage;
  QuizQuestion: QuizQuestion;
  String: Scalars['String']['output'];
  User: User;
};

export type AuthResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuthResult'] = ResolversParentTypes['AuthResult']> = {
  User?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type BrowseResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['BrowseResult'] = ResolversParentTypes['BrowseResult']> = {
  decks?: Resolver<Array<ResolversTypes['Deck']>, ParentType, ContextType>;
  sets?: Resolver<Array<ResolversTypes['DeckSet']>, ParentType, ContextType>;
};

export type CardResolvers<ContextType = any, ParentType extends ResolversParentTypes['Card'] = ResolversParentTypes['Card']> = {
  back?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  front?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  position?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type DeckResolvers<ContextType = any, ParentType extends ResolversParentTypes['Deck'] = ResolversParentTypes['Deck']> = {
  cardCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  cards?: Resolver<Array<ResolversTypes['Card']>, ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type DeckSetResolvers<ContextType = any, ParentType extends ResolversParentTypes['DeckSet'] = ResolversParentTypes['DeckSet']> = {
  childSetCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  deckCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  parentId?: Resolver<Maybe<ResolversTypes['ID']>, ParentType, ContextType>;
  totalCardCount?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  deleteDeck?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteDeckArgs, 'id'>>;
  deleteDeckSet?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationDeleteDeckSetArgs, 'id'>>;
  login?: Resolver<ResolversTypes['AuthResult'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'password' | 'username'>>;
  logout?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  refreshSession?: Resolver<ResolversTypes['AuthResult'], ParentType, ContextType>;
  signUp?: Resolver<ResolversTypes['AuthResult'], ParentType, ContextType, RequireFields<MutationSignUpArgs, 'password' | 'username'>>;
  uploadApkg?: Resolver<ResolversTypes['Int'], ParentType, ContextType, RequireFields<MutationUploadApkgArgs, 'fileContent'>>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  browse?: Resolver<ResolversTypes['BrowseResult'], ParentType, ContextType, Partial<QueryBrowseArgs>>;
  deck?: Resolver<Maybe<ResolversTypes['Deck']>, ParentType, ContextType, RequireFields<QueryDeckArgs, 'id'>>;
  getUserByID?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<QueryGetUserByIdArgs, 'ID'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  myDecks?: Resolver<Array<ResolversTypes['Deck']>, ParentType, ContextType>;
  quizQuestions?: Resolver<ResolversTypes['QuizPage'], ParentType, ContextType, RequireFields<QueryQuizQuestionsArgs, 'deckId'>>;
  quizQuestionsForSet?: Resolver<ResolversTypes['QuizPage'], ParentType, ContextType, RequireFields<QueryQuizQuestionsForSetArgs, 'setId'>>;
};

export type QuizOptionResolvers<ContextType = any, ParentType extends ResolversParentTypes['QuizOption'] = ResolversParentTypes['QuizOption']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type QuizPageResolvers<ContextType = any, ParentType extends ResolversParentTypes['QuizPage'] = ResolversParentTypes['QuizPage']> = {
  questions?: Resolver<Array<ResolversTypes['QuizQuestion']>, ParentType, ContextType>;
  totalCards?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
};

export type QuizQuestionResolvers<ContextType = any, ParentType extends ResolversParentTypes['QuizQuestion'] = ResolversParentTypes['QuizQuestion']> = {
  cardId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  correctOptionId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  front?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  options?: Resolver<Array<ResolversTypes['QuizOption']>, ParentType, ContextType>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  ID?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AuthResult?: AuthResultResolvers<ContextType>;
  BrowseResult?: BrowseResultResolvers<ContextType>;
  Card?: CardResolvers<ContextType>;
  Deck?: DeckResolvers<ContextType>;
  DeckSet?: DeckSetResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  QuizOption?: QuizOptionResolvers<ContextType>;
  QuizPage?: QuizPageResolvers<ContextType>;
  QuizQuestion?: QuizQuestionResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

