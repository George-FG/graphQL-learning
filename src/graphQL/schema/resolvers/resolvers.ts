import { prisma } from "../../../lib/prisma";

export const resolvers = {
  Query: {
    getUserByID: async (_: unknown, args: { ID: string }) => {
      const user = await prisma.user.findUnique({
        where: {
          id: BigInt(args.ID),
        },
      });

      if (!user) return null;

      return {
        ID: user.id.toString(),
        Name: user.name,
        NumFish: user.numFish,
      };
    },
  },
};