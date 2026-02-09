# Webpixels MCP Server

MCP server for Webpixels Bootstrap 5 components. This server enables AI assistants like Claude to search, retrieve, and assemble Bootstrap UI components from the Webpixels library.

## Installation

### Via npx (Recommended)

Add to your Claude desktop configuration (`~/.config/claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "webpixels": {
      "command": "npx",
      "args": ["-y", "@webpixels/mcp"]
    }
  }
}
```

### Via Global Install

```bash
npm install -g @webpixels/mcp
```

Then add to your configuration:

```json
{
  "mcpServers": {
    "webpixels": {
      "command": "webpixels-mcp"
    }
  }
}
```

## Available Tools

### `search_components`

Search Bootstrap components by name, category, type, or description.

**Parameters:**
- `query` (string): Search query (matches name, description, tags)
- `type` (string): Filter by component type (component, section, card, screen, layout, page, form, chart)
- `category` (string): Category or subcategory slug (e.g., 'sections', 'hero', 'pricing')
- `is_free` (boolean): Filter for free components only
- `limit` (number): Maximum number of results (default: 20)

### `get_component`

Get the HTML code and metadata for a specific component.

**Parameters:**
- `id` (string, required): Component UUID or slug (e.g., "section-hero-1")

### `list_categories`

List all component categories with component counts.

**Parameters:**
- `type` (string): Filter categories by component type

### `assemble_page`

Assemble multiple components into a complete HTML page.

**Parameters:**
- `components` (array, required): Array of component IDs or slugs in display order
- `layout` (string): Optional layout component ID to wrap the content
- `includeAssets` (boolean): Include CSS/JS links in a full HTML document (default: true)

### `get_component_dependencies`

Get the dependency tree for a component.

**Parameters:**
- `id` (string, required): Component UUID or slug
- `direction` (string): "dependencies" (what this uses), "dependents" (what uses this), or "both"

## Component Categories

The library includes components across several categories:

- **Components**: Banners, Cards, Dropdowns, Headers, Modals, Navbars, Sidebars, Tables, etc.
- **Forms**: Form groups, textareas, form layouts, form examples
- **Sections**: Headers, Hero, Features, CTA, Pricing, FAQ, Team, Testimonials, Contact, Gallery, Logos, Blog, Footers
- **Layouts**: Horizontal, Sidebar, Columns
- **Pages**: Landings, Dashboard, CRUD, Settings, Auth, Profile, Messaging, etc.

## Example Usage

```
User: I need a hero section for a SaaS landing page

Claude: [Uses search_components with query "hero saas"]
        [Returns matching hero sections]

User: Show me the code for section-hero-1

Claude: [Uses get_component with id "section-hero-1"]
        [Returns HTML and metadata]

User: Create a page with a hero and pricing section

Claude: [Uses assemble_page with components ["section-hero-1", "section-pricing-1"]]
        [Returns complete HTML page]
```

## Development

### Build

```bash
npm install
npm run build
```

### Run locally

```bash
npm start
```

### Generate component data

The component data is generated from the Webpixels library's compiled HTML snippets:

```bash
# From the library repository

# Option 1: Generate snippets first, then MCP data
npm run snippets
npm run mcp:generate

# Option 2: All-in-one command
npm run mcp:generate:full
```

The script reads compiled HTML from `library/snippets/` (not raw `.njk` files) to ensure all template includes are resolved.

## License

MIT

## Links

- [Webpixels](https://webpixels.io)
- [Webpixels CSS](https://github.com/webpixels/css)
- [Bootstrap](https://getbootstrap.com)
- [MCP Protocol](https://modelcontextprotocol.io)
