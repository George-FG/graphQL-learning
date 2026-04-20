import type { GraphQLResolveInfo } from 'graphql';
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

export type Connection = {
  __typename?: 'Connection';
  duration?: Maybe<Scalars['Int']['output']>;
  fromId: Scalars['ID']['output'];
  id: Scalars['ID']['output'];
  routeId?: Maybe<Scalars['String']['output']>;
  routeName?: Maybe<Scalars['String']['output']>;
  toId: Scalars['ID']['output'];
  transportType?: Maybe<Scalars['String']['output']>;
};

export type JourneyGraph = {
  __typename?: 'JourneyGraph';
  edges: Array<Connection>;
  end: Location;
  nodes: Array<Location>;
  route: JourneyRoute;
  start: Location;
};

export type JourneyRoute = {
  __typename?: 'JourneyRoute';
  edges: Array<Connection>;
  nodes: Array<Location>;
  totalDuration?: Maybe<Scalars['Int']['output']>;
};

export type Location = {
  __typename?: 'Location';
  id: Scalars['ID']['output'];
  lat?: Maybe<Scalars['Float']['output']>;
  lng?: Maybe<Scalars['Float']['output']>;
  name: Scalars['String']['output'];
  type?: Maybe<Scalars['String']['output']>;
};

export type Mutation = {
  __typename?: 'Mutation';
  login: AuthResult;
  logout: Scalars['Boolean']['output'];
  refreshSession: AuthResult;
  signUp: AuthResult;
};


export type MutationLoginArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};


export type MutationSignUpArgs = {
  password: Scalars['String']['input'];
  username: Scalars['String']['input'];
};

export type Query = {
  __typename?: 'Query';
  getUserByID: User;
  journeyGraph: JourneyGraph;
  me?: Maybe<User>;
  searchLocations: Array<Location>;
};


export type QueryGetUserByIdArgs = {
  ID: Scalars['ID']['input'];
};


export type QueryJourneyGraphArgs = {
  endId: Scalars['ID']['input'];
  startId: Scalars['ID']['input'];
};


export type QuerySearchLocationsArgs = {
  query: Scalars['String']['input'];
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
  Connection: ResolverTypeWrapper<Connection>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  ID: ResolverTypeWrapper<Scalars['ID']['output']>;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  JourneyGraph: ResolverTypeWrapper<JourneyGraph>;
  JourneyRoute: ResolverTypeWrapper<JourneyRoute>;
  Location: ResolverTypeWrapper<Location>;
  Mutation: ResolverTypeWrapper<Record<PropertyKey, never>>;
  Query: ResolverTypeWrapper<Record<PropertyKey, never>>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  User: ResolverTypeWrapper<User>;
};

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = {
  AuthResult: AuthResult;
  Boolean: Scalars['Boolean']['output'];
  Connection: Connection;
  Float: Scalars['Float']['output'];
  ID: Scalars['ID']['output'];
  Int: Scalars['Int']['output'];
  JourneyGraph: JourneyGraph;
  JourneyRoute: JourneyRoute;
  Location: Location;
  Mutation: Record<PropertyKey, never>;
  Query: Record<PropertyKey, never>;
  String: Scalars['String']['output'];
  User: User;
};

export type AuthResultResolvers<ContextType = any, ParentType extends ResolversParentTypes['AuthResult'] = ResolversParentTypes['AuthResult']> = {
  User?: Resolver<ResolversTypes['User'], ParentType, ContextType>;
  accessToken?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type ConnectionResolvers<ContextType = any, ParentType extends ResolversParentTypes['Connection'] = ResolversParentTypes['Connection']> = {
  duration?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
  fromId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  routeId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  routeName?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  toId?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  transportType?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type JourneyGraphResolvers<ContextType = any, ParentType extends ResolversParentTypes['JourneyGraph'] = ResolversParentTypes['JourneyGraph']> = {
  edges?: Resolver<Array<ResolversTypes['Connection']>, ParentType, ContextType>;
  end?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Location']>, ParentType, ContextType>;
  route?: Resolver<ResolversTypes['JourneyRoute'], ParentType, ContextType>;
  start?: Resolver<ResolversTypes['Location'], ParentType, ContextType>;
};

export type JourneyRouteResolvers<ContextType = any, ParentType extends ResolversParentTypes['JourneyRoute'] = ResolversParentTypes['JourneyRoute']> = {
  edges?: Resolver<Array<ResolversTypes['Connection']>, ParentType, ContextType>;
  nodes?: Resolver<Array<ResolversTypes['Location']>, ParentType, ContextType>;
  totalDuration?: Resolver<Maybe<ResolversTypes['Int']>, ParentType, ContextType>;
};

export type LocationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Location'] = ResolversParentTypes['Location']> = {
  id?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  lat?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  lng?: Resolver<Maybe<ResolversTypes['Float']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  type?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
};

export type MutationResolvers<ContextType = any, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = {
  login?: Resolver<ResolversTypes['AuthResult'], ParentType, ContextType, RequireFields<MutationLoginArgs, 'password' | 'username'>>;
  logout?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  refreshSession?: Resolver<ResolversTypes['AuthResult'], ParentType, ContextType>;
  signUp?: Resolver<ResolversTypes['AuthResult'], ParentType, ContextType, RequireFields<MutationSignUpArgs, 'password' | 'username'>>;
};

export type QueryResolvers<ContextType = any, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = {
  getUserByID?: Resolver<ResolversTypes['User'], ParentType, ContextType, RequireFields<QueryGetUserByIdArgs, 'ID'>>;
  journeyGraph?: Resolver<ResolversTypes['JourneyGraph'], ParentType, ContextType, RequireFields<QueryJourneyGraphArgs, 'endId' | 'startId'>>;
  me?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  searchLocations?: Resolver<Array<ResolversTypes['Location']>, ParentType, ContextType, RequireFields<QuerySearchLocationsArgs, 'query'>>;
};

export type UserResolvers<ContextType = any, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = {
  ID?: Resolver<ResolversTypes['ID'], ParentType, ContextType>;
  username?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
};

export type Resolvers<ContextType = any> = {
  AuthResult?: AuthResultResolvers<ContextType>;
  Connection?: ConnectionResolvers<ContextType>;
  JourneyGraph?: JourneyGraphResolvers<ContextType>;
  JourneyRoute?: JourneyRouteResolvers<ContextType>;
  Location?: LocationResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
};

