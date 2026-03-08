# Home Characters Feature

This folder contains the standalone homepage interaction module.

- `api/`: feature-scoped API client calls
- `components/`: scene and panel components
- `data/`: local fallback config
- `hooks/`: feature-only hooks
- `types.ts`: local contracts for this feature

The homepage should only import from this folder and avoid embedding the feature logic inline.
