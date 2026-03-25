package data

type ModelCategory string

const (
	ModelCategoryFlagship  ModelCategory = "flagship"
	ModelCategoryBalanced  ModelCategory = "balanced"
	ModelCategoryFast      ModelCategory = "fast"
	ModelCategoryReasoning ModelCategory = "reasoning"
	ModelCategoryEmbedding ModelCategory = "embedding"
)

type ModelDefinition struct {
	ID            string        `json:"id"`
	Slug          string        `json:"slug"`
	Name          string        `json:"name"`
	Provider      string        `json:"provider"`
	Category      ModelCategory `json:"category"`
	Description   string        `json:"description"`
	ContextWindow int           `json:"contextWindow"`
	MaxOutput     int           `json:"maxOutput"`
	InputPrice    float64       `json:"inputPrice"`
	OutputPrice   float64       `json:"outputPrice"`
	Capabilities  []string      `json:"capabilities"`
}

var ModelCategories = map[ModelCategory]struct {
	Label       string
	Description string
}{
	ModelCategoryFlagship:  {"Flagship", "Most capable models for complex tasks"},
	ModelCategoryBalanced:  {"Balanced", "Great balance of speed, quality, and cost"},
	ModelCategoryFast:      {"Fast", "Optimized for speed and low cost"},
	ModelCategoryReasoning: {"Reasoning", "Extended thinking for complex problem solving"},
	ModelCategoryEmbedding: {"Embedding", "Convert text to vector representations"},
}

var CapabilityLabels = map[string]string{
	"chat":             "Chat",
	"embedding":        "Embedding",
	"function_calling": "Function Calling",
	"reasoning":        "Reasoning",
	"streaming":        "Streaming",
	"vision":           "Vision",
}
