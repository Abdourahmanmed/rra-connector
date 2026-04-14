# Next.js template

This is a Next.js template with shadcn/ui.

## Environment variables

Create `apps/web/.env.local` and define the backend API origin:

```bash
NEXT_PUBLIC_API_URL=http://localhost:4000
```

`NEXT_PUBLIC_API_BASE_URL` is still supported as a fallback for backward compatibility, but `NEXT_PUBLIC_API_URL` is the preferred source of truth.

## Adding components

To add components to your app, run the following command:

```bash
npx shadcn@latest add button
```

This will place the ui components in the `components` directory.

## Using components

To use the components in your app, import them as follows:

```tsx
import { Button } from "@/components/ui/button";
```
