import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import type {
  ComponentData,
  ComponentType,
  Category,
  ComponentCatalog,
  SearchFilters,
  ComponentSummary,
} from './types.js';

// Import the bundled component data
import componentCatalog from './data/components.json' with { type: 'json' };

export class WebPixelsServer {
  private server: Server;
  private catalog: ComponentCatalog;
  private componentsBySlug: Map<string, ComponentData>;
  private componentsById: Map<string, ComponentData>;
  private categoriesBySlug: Map<string, Category>;

  constructor() {
    this.server = new Server(
      {
        name: 'webpixels',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    // Load and index the catalog
    this.catalog = componentCatalog as ComponentCatalog;
    this.componentsBySlug = new Map();
    this.componentsById = new Map();
    this.categoriesBySlug = new Map();

    this.indexData();
    this.setupHandlers();
  }

  /**
   * Index the catalog data for fast lookups
   */
  private indexData(): void {
    // Index components
    for (const component of this.catalog.components) {
      this.componentsBySlug.set(component.slug, component);
      this.componentsById.set(component.id, component);
    }

    // Index categories
    for (const category of this.catalog.categories) {
      this.categoriesBySlug.set(category.slug, category);
    }
  }

  private setupHandlers(): void {
    this.setupToolHandlers();
    this.setupResourceHandlers();
  }

  // ============ Tool Handlers ============

  private setupToolHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'search_components',
          description:
            'Search Bootstrap components by name, category, type, or description. Use this to find components that match specific criteria.',
          inputSchema: {
            type: 'object' as const,
            properties: {
              query: {
                type: 'string',
                description: 'Search query (matches name, description, tags)',
              },
              type: {
                type: 'string',
                enum: ['component', 'section', 'card', 'screen', 'layout', 'page', 'form', 'chart'],
                description: 'Filter by component type',
              },
              category: {
                type: 'string',
                description: "Category or subcategory slug (e.g., 'sections', 'hero', 'pricing')",
              },
              is_free: {
                type: 'boolean',
                description: 'Filter for free components only',
              },
              limit: {
                type: 'number',
                description: 'Maximum number of results to return (default: 20)',
              },
            },
          },
        },
        {
          name: 'get_component',
          description:
            'Get the HTML code and metadata for a specific component by ID (UUID) or slug.',
          inputSchema: {
            type: 'object' as const,
            properties: {
              id: {
                type: 'string',
                description: 'Component UUID or slug (e.g., "section-hero-1")',
              },
            },
            required: ['id'],
          },
        },
        {
          name: 'list_categories',
          description:
            'List all component categories with component counts. Useful for understanding what types of components are available.',
          inputSchema: {
            type: 'object' as const,
            properties: {
              type: {
                type: 'string',
                description: 'Filter categories by component type',
              },
            },
          },
        },
        {
          name: 'assemble_page',
          description:
            'Assemble multiple components into a complete HTML page. Provide component IDs/slugs in the order they should appear.',
          inputSchema: {
            type: 'object' as const,
            properties: {
              components: {
                type: 'array',
                items: { type: 'string' },
                description: 'Array of component IDs or slugs in display order',
              },
              layout: {
                type: 'string',
                description: 'Optional layout component ID to wrap the content',
              },
              includeAssets: {
                type: 'boolean',
                description:
                  'Include CSS/JS links in a full HTML document (default: true)',
              },
            },
            required: ['components'],
          },
        },
        {
          name: 'get_component_dependencies',
          description:
            'Get the dependency tree for a component. Shows what other components it uses or what components use it.',
          inputSchema: {
            type: 'object' as const,
            properties: {
              id: {
                type: 'string',
                description: 'Component UUID or slug',
              },
              direction: {
                type: 'string',
                enum: ['dependencies', 'dependents', 'both'],
                description:
                  'Direction: "dependencies" (what this uses), "dependents" (what uses this), or "both"',
              },
            },
            required: ['id'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_components':
          return this.handleSearchComponents(args as Record<string, unknown>);
        case 'get_component':
          return this.handleGetComponent(args as Record<string, unknown>);
        case 'list_categories':
          return this.handleListCategories(args as Record<string, unknown>);
        case 'assemble_page':
          return this.handleAssemblePage(args as Record<string, unknown>);
        case 'get_component_dependencies':
          return this.handleGetDependencies(args as Record<string, unknown>);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  /**
   * Get component by ID or slug
   */
  private getComponent(idOrSlug: string): ComponentData | undefined {
    return this.componentsById.get(idOrSlug) || this.componentsBySlug.get(idOrSlug);
  }

  /**
   * Search components with filters
   */
  private searchComponents(filters: SearchFilters): ComponentData[] {
    let results = this.catalog.components.filter(c => c.is_published);

    // Filter by type
    if (filters.type) {
      results = results.filter(c => c.type === filters.type);
    }

    // Filter by category or subcategory
    if (filters.category) {
      results = results.filter(c =>
        c.category === filters.category || c.subcategory === filters.category
      );
    }

    // Filter by is_free
    if (filters.is_free !== undefined) {
      results = results.filter(c => c.is_free === filters.is_free);
    }

    // Filter by is_featured
    if (filters.is_featured !== undefined) {
      results = results.filter(c => c.is_featured === filters.is_featured);
    }

    // Text search
    if (filters.query) {
      const query = filters.query.toLowerCase();
      results = results.filter(c => {
        const searchText = [
          c.name,
          c.slug,
          c.description || '',
          c.category,
          c.subcategory,
          ...c.tags,
          ...c.keywords,
          ...c.use_cases,
        ].join(' ').toLowerCase();

        return searchText.includes(query);
      });
    }

    // Apply limit
    if (filters.limit && filters.limit > 0) {
      results = results.slice(0, filters.limit);
    }

    return results;
  }

  /**
   * Format component for summary output (without HTML)
   */
  private formatComponentSummary(component: ComponentData): ComponentSummary {
    return {
      id: component.id,
      name: component.name,
      slug: component.slug,
      type: component.type,
      category: component.category,
      subcategory: component.subcategory,
      description: component.description,
      is_free: component.is_free,
      is_featured: component.is_featured,
      tags: component.tags,
    };
  }

  private async handleSearchComponents(args: Record<string, unknown>) {
    const results = this.searchComponents({
      query: args.query as string | undefined,
      type: args.type as ComponentType | undefined,
      category: args.category as string | undefined,
      is_free: args.is_free as boolean | undefined,
      limit: (args.limit as number) || 20,
    });

    const formatted = results.map(c => this.formatComponentSummary(c));

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              count: results.length,
              components: formatted,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleGetComponent(args: Record<string, unknown>) {
    const id = args.id as string;
    const component = this.getComponent(id);

    if (!component) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: `Component not found: ${id}` }),
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(
            {
              id: component.id,
              name: component.name,
              slug: component.slug,
              type: component.type,
              category: component.category,
              subcategory: component.subcategory,
              description: component.description,
              is_free: component.is_free,
              is_featured: component.is_featured,
              tags: component.tags,
              keywords: component.keywords,
              use_cases: component.use_cases,
              includes: component.includes,
              content_hints: component.content_hints,
              dependencies: component.dependencies,
              used_by: component.used_by,
              html: component.html,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleListCategories(_args: Record<string, unknown>) {
    // Calculate stats for each category
    const categoryStats = new Map<string, { count: number; freeCount: number }>();

    for (const component of this.catalog.components) {
      if (!component.is_published) continue;

      const key = component.category;
      if (!categoryStats.has(key)) {
        categoryStats.set(key, { count: 0, freeCount: 0 });
      }

      const stat = categoryStats.get(key)!;
      stat.count++;
      if (component.is_free) {
        stat.freeCount++;
      }
    }

    const result = this.catalog.categories
      .filter(cat => cat.is_published)
      .map(cat => {
        const stat = categoryStats.get(cat.slug);
        return {
          slug: cat.slug,
          name: cat.name,
          icon: cat.icon,
          componentCount: stat?.count || 0,
          freeCount: stat?.freeCount || 0,
          subcategories: cat.items.map(item => ({
            slug: item.slug,
            name: item.name,
          })),
        };
      });

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ categories: result }, null, 2),
        },
      ],
    };
  }

  private async handleAssemblePage(args: Record<string, unknown>) {
    const componentIds = args.components as string[];
    const includeAssets = args.includeAssets !== false;

    if (!componentIds || componentIds.length === 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: 'No components provided' }),
          },
        ],
        isError: true,
      };
    }

    // Validate all components exist
    const missing: string[] = [];
    for (const id of componentIds) {
      if (!this.getComponent(id)) {
        missing.push(id);
      }
    }

    if (missing.length > 0) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              error: 'Components not found',
              missing,
            }),
          },
        ],
        isError: true,
      };
    }

    // Assemble the page
    const parts: string[] = [];
    for (const id of componentIds) {
      const component = this.getComponent(id);
      if (component) {
        parts.push(component.html);
      }
    }

    const body = parts.join('\n\n');

    // If includeAssets is true, wrap in full HTML document
    let html: string;
    if (includeAssets) {
      html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WebPixels Page</title>
  <!-- Bootstrap CSS -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <!-- Bootstrap Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
  <!-- WebPixels CSS -->
  <link href="https://cdn.jsdelivr.net/npm/@webpixels/css@latest/dist/index.css" rel="stylesheet">
</head>
<body>
${body}
  <!-- Bootstrap JS -->
  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
</body>
</html>`;
    } else {
      html = body;
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: html,
        },
      ],
    };
  }

  private async handleGetDependencies(args: Record<string, unknown>) {
    const id = args.id as string;
    const direction = (args.direction as string) || 'both';
    const component = this.getComponent(id);

    if (!component) {
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({ error: `Component not found: ${id}` }),
          },
        ],
        isError: true,
      };
    }

    const result: Record<string, unknown> = {
      component: {
        id: component.id,
        slug: component.slug,
        name: component.name,
      },
    };

    if (direction === 'dependencies' || direction === 'both') {
      const deps = component.dependencies
        .map(slug => this.componentsBySlug.get(slug))
        .filter((c): c is ComponentData => c !== undefined);
      result.dependencies = deps.map(c => this.formatComponentSummary(c));
    }

    if (direction === 'dependents' || direction === 'both') {
      const deps = component.used_by
        .map(slug => this.componentsBySlug.get(slug))
        .filter((c): c is ComponentData => c !== undefined);
      result.dependents = deps.map(c => this.formatComponentSummary(c));
    }

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  // ============ Resource Handlers ============

  private setupResourceHandlers(): void {
    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      const resources = [
        {
          uri: 'component://catalog',
          name: 'Component Catalog',
          description: 'Full catalog of all available components',
          mimeType: 'application/json',
        },
      ];

      // Add category resources
      for (const cat of this.catalog.categories) {
        if (cat.is_published) {
          resources.push({
            uri: `category://${cat.slug}`,
            name: `${cat.name} Category`,
            description: `All components in the ${cat.name} category`,
            mimeType: 'application/json',
          });
        }
      }

      return { resources };
    });

    // Read resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      // Parse URI
      const [protocol, path] = uri.split('://');

      if (protocol === 'component' && path === 'catalog') {
        return this.handleCatalogResource();
      }

      if (protocol === 'category') {
        return this.handleCategoryResource(path);
      }

      if (protocol === 'component') {
        return this.handleComponentResource(path);
      }

      throw new Error(`Unknown resource: ${uri}`);
    });
  }

  private async handleCatalogResource() {
    const formatted = this.catalog.components
      .filter(c => c.is_published)
      .map(c => this.formatComponentSummary(c));

    return {
      contents: [
        {
          uri: 'component://catalog',
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              totalCount: formatted.length,
              components: formatted,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleCategoryResource(slug: string) {
    const category = this.categoriesBySlug.get(slug);
    const components = this.catalog.components.filter(
      c => c.is_published && (c.category === slug || c.subcategory === slug)
    );

    const formatted = components.map(c => this.formatComponentSummary(c));

    return {
      contents: [
        {
          uri: `category://${slug}`,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              category: category
                ? {
                    slug: category.slug,
                    name: category.name,
                    description: category.description,
                  }
                : null,
              count: formatted.length,
              components: formatted,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  private async handleComponentResource(idOrSlug: string) {
    const component = this.getComponent(idOrSlug);

    if (!component) {
      throw new Error(`Component not found: ${idOrSlug}`);
    }

    return {
      contents: [
        {
          uri: `component://${idOrSlug}`,
          mimeType: 'application/json',
          text: JSON.stringify(
            {
              id: component.id,
              name: component.name,
              slug: component.slug,
              type: component.type,
              category: component.category,
              subcategory: component.subcategory,
              description: component.description,
              is_free: component.is_free,
              is_featured: component.is_featured,
              tags: component.tags,
              keywords: component.keywords,
              use_cases: component.use_cases,
              includes: component.includes,
              content_hints: component.content_hints,
              dependencies: component.dependencies,
              used_by: component.used_by,
              html: component.html,
            },
            null,
            2
          ),
        },
      ],
    };
  }

  // ============ Start Server ============

  async start(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('WebPixels MCP server running on stdio');
  }
}
