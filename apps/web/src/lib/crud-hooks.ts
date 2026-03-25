import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

interface CrudHookOptions {
  readonly endpoint: string;
  readonly queryKey: string[];
  readonly labels: {
    readonly singular: string;
    readonly plural: string;
  };
}

/**
 * Factory that produces `useCreate`, `useUpdate`, and `useDelete` mutation hooks
 * for a standard REST resource.
 *
 * @typeParam T          - The entity type returned by the API.
 * @typeParam TCreate    - The payload accepted by the create mutation.
 * @typeParam TUpdate    - The payload accepted by the update mutation.
 *                         Must include `id: string`. The id is stripped from the
 *                         body before sending. Two shapes are supported:
 *                           1. `{ id, ...rest }` — rest is sent as the body.
 *                           2. `{ id, data }` — if a `data` key exists and the
 *                              only other key is `id`, `data` is sent as the body.
 */
export function createCrudHooks<
  T,
  TCreate = Partial<T>,
  TUpdate extends { id: string } = { id: string } & Partial<T>
>(opts: CrudHookOptions) {
  const { endpoint, queryKey, labels } = opts;

  const useCreate = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (input: TCreate) => {
        const promise = api.post<T>(endpoint, input);
        toast.promise(promise, {
          error: (err) => err.message,
          loading: `Creating ${labels.singular}...`,
          success: `${labels.singular} created`
        });
        return promise;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      }
    });
  };

  const useUpdate = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (payload: TUpdate) => {
        const { id, ...rest } = payload as { id: string } & Record<
          string,
          unknown
        >;

        // Support the `{ id, data }` shape used by some resources (e.g. keys).
        // When the only remaining key is `data`, unwrap it so the API receives
        // the inner object directly.
        const keys = Object.keys(rest);
        const body = keys.length === 1 && keys[0] === "data" ? rest.data : rest;

        const promise = api.put<T>(`${endpoint}/${id}`, body);
        toast.promise(promise, {
          error: (err) => err.message,
          loading: `Updating ${labels.singular}...`,
          success: `${labels.singular} updated`
        });
        return promise;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      }
    });
  };

  const useDelete = () => {
    const queryClient = useQueryClient();

    return useMutation({
      mutationFn: (id: string) => {
        const promise = api.delete(`${endpoint}/${id}`);
        toast.promise(promise, {
          error: (err) => err.message,
          loading: `Deleting ${labels.singular}...`,
          success: `${labels.singular} deleted`
        });
        return promise;
      },
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey });
      }
    });
  };

  return { useCreate, useDelete, useUpdate };
}
