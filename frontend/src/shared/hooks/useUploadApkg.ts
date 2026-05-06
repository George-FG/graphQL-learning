import { useMutation } from "@apollo/client/react";
import { UPLOAD_APKG_MUTATION } from "../../graphql/mutations";
import { BROWSE_QUERY } from "../../graphql/queries";
import type { Mutation, MutationUploadApkgArgs } from "@generated/generated";

type UploadApkgResponse = Pick<Mutation, "uploadApkg">;

export function useUploadApkg() {
  const [uploadApkg, { loading, error }] = useMutation<UploadApkgResponse, MutationUploadApkgArgs>(
    UPLOAD_APKG_MUTATION,
    {
      refetchQueries: [{ query: BROWSE_QUERY, variables: { parentSetId: null } }],
    }
  );
  return { uploadApkg, loading, error };
}
