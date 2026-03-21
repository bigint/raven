"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";

export const useUpdateProfile = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string }) => {
      const promise = api.put("/v1/user/profile", data);
      toast.promise(promise, {
        error: (err) => err.message,
        loading: "Updating profile...",
        success: "Profile updated successfully"
      });
      return promise;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["session"] });
    }
  });
};
