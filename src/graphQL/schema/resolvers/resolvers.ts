export const resolvers = {
  Query: { helloWorld: () => "hello Andrew", getPersonByID: (_: unknown, args: { ID: string }) => { return { ID: args.ID, Name: "George", NumFish: 1000 } }
  }
};
