"use client";

import { Badge, Button, Input, Modal, Textarea } from "@raven/ui";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { type FormEvent, useState } from "react";
import type { Prompt } from "../hooks/use-prompts";
import {
  promptQueryOptions,
  useActivateVersion,
  useCreateVersion
} from "../hooks/use-prompts";

interface PromptDetailProps {
  prompt: Prompt;
  open: boolean;
  onClose: () => void;
}

const PromptDetail = ({ prompt, open, onClose }: PromptDetailProps) => {
  const { data: detail } = useQuery(promptQueryOptions(prompt.id));
  const activateMutation = useActivateVersion();
  const createVersionMutation = useCreateVersion();

  const [showNewVersion, setShowNewVersion] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newModel, setNewModel] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const versions = detail?.versions ?? [];

  const handleActivate = async (versionId: string) => {
    await activateMutation.mutateAsync({
      promptId: prompt.id,
      versionId
    });
  };

  const handleCreateVersion = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!newContent.trim()) {
      setFormError("Content is required");
      return;
    }

    try {
      await createVersionMutation.mutateAsync({
        content: newContent.trim(),
        model: newModel.trim() || undefined,
        promptId: prompt.id
      });
      setShowNewVersion(false);
      setNewContent("");
      setNewModel("");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const handleClose = () => {
    setShowNewVersion(false);
    setNewContent("");
    setNewModel("");
    setFormError(null);
    onClose();
  };

  return (
    <Modal onClose={handleClose} open={open} title={prompt.name}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground">
            Versions ({versions.length})
          </h3>
          <Button
            onClick={() => setShowNewVersion((v) => !v)}
            size="sm"
            variant={showNewVersion ? "secondary" : "primary"}
          >
            <Plus className="size-4" />
            New Version
          </Button>
        </div>

        {showNewVersion && (
          <form
            className="space-y-3 rounded-md border border-border p-3"
            onSubmit={handleCreateVersion}
          >
            {formError && (
              <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {formError}
              </div>
            )}
            <Textarea
              className="font-mono"
              description={"Use {{variable}} for template variables"}
              id="new-version-content"
              label="Content"
              onChange={(e) => setNewContent(e.target.value)}
              placeholder="Enter prompt template..."
              rows={6}
              value={newContent}
            />
            <Input
              id="new-version-model"
              label="Model (optional)"
              onChange={(e) => setNewModel(e.target.value)}
              placeholder="e.g. gpt-4o"
              value={newModel}
            />
            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowNewVersion(false)}
                type="button"
                variant="secondary"
              >
                Cancel
              </Button>
              <Button disabled={createVersionMutation.isPending} type="submit">
                {createVersionMutation.isPending
                  ? "Creating..."
                  : "Create Version"}
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {versions.map((version) => (
            <div
              className="rounded-md border border-border p-3 space-y-2"
              key={version.id}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">
                    Version #{version.version}
                  </span>
                  {version.isActive && <Badge variant="success">Active</Badge>}
                  {version.model && (
                    <span className="font-mono text-xs text-muted-foreground">
                      {version.model}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {new Date(version.createdAt).toLocaleDateString("en-US", {
                      day: "numeric",
                      month: "short",
                      year: "numeric"
                    })}
                  </span>
                  {!version.isActive && (
                    <Button
                      disabled={activateMutation.isPending}
                      onClick={() => handleActivate(version.id)}
                      size="sm"
                      variant="secondary"
                    >
                      Activate
                    </Button>
                  )}
                </div>
              </div>
              <pre className="whitespace-pre-wrap rounded-md bg-muted p-3 font-mono text-sm">
                {version.content}
              </pre>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};

export { PromptDetail };
