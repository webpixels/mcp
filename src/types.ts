/**
 * Component type classification
 */
export type ComponentType =
  | 'component'
  | 'section'
  | 'card'
  | 'screen'
  | 'layout'
  | 'page'
  | 'form'
  | 'chart'
  | 'partial';

/**
 * Content analysis hints - auto-generated from HTML analysis
 */
export interface ContentHints {
  has_images: boolean;
  has_icons: boolean;
  has_buttons: boolean;
  has_form: boolean;
  has_carousel: boolean;
  has_video: boolean;
  color_scheme: 'light' | 'dark' | 'mixed';
  layout_type: 'full-width' | 'contained' | 'split';
}

/**
 * Full component data structure for JSON storage
 */
export interface ComponentData {
  // Identification
  id: string;                    // UUID
  slug: string;                  // e.g., "section-hero-1b"
  name: string;                  // Human-readable name

  // Classification
  type: ComponentType;           // section, component, card, page, etc.
  category: string;              // Parent: sections, components, forms
  subcategory: string;           // Child: hero, features, pricing

  // AI-friendly metadata
  description: string;           // Detailed description for AI
  tags: string[];                // Searchable tags
  keywords: string[];            // Additional search terms
  use_cases: string[];           // When to use this component
  includes: string[];            // What sub-components it contains

  // Content analysis (auto-generated)
  content_hints: ContentHints;

  // HTML
  html: string;                  // Raw HTML content

  // Relationships
  dependencies: string[];        // Component slugs this uses
  used_by: string[];             // Component slugs that use this
  similar_to: string[];          // Similar components for suggestions

  // Status
  is_free: boolean;
  is_published: boolean;
  is_featured: boolean;
  is_new: boolean;               // Added in last 30 days

  // Timestamps
  created_at: string;
  updated_at: string;
}

/**
 * Category subcategory definition
 */
export interface Subcategory {
  name: string;
  slug: string;
  description?: string;
}

/**
 * Category definition
 */
export interface Category {
  slug: string;
  name: string;
  icon?: string;
  description?: string;
  is_published: boolean;
  items: Subcategory[];
}

/**
 * Full component catalog structure
 */
export interface ComponentCatalog {
  version: string;
  generated_at: string;
  categories: Category[];
  components: ComponentData[];
}

/**
 * Search filter options
 */
export interface SearchFilters {
  query?: string;
  type?: ComponentType;
  category?: string;
  subcategory?: string;
  is_free?: boolean;
  is_featured?: boolean;
  limit?: number;
}

/**
 * Page assembly options
 */
export interface AssemblePageOptions {
  layout?: string;
  includeAssets?: boolean;
}

/**
 * Component summary for search results (without HTML)
 */
export interface ComponentSummary {
  id: string;
  name: string;
  slug: string;
  type: ComponentType;
  category: string;
  subcategory: string;
  description: string;
  is_free: boolean;
  is_featured: boolean;
  tags: string[];
}
