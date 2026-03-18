"use client";

import { PageHeader } from "@raven/ui";
import { ModelCatalog } from "./components/model-catalog";

const ModelsPage = () => (
  <div>
    <PageHeader
      description="All models supported by Raven across providers."
      title="Models"
    />
    <ModelCatalog />
  </div>
);

export default ModelsPage;
