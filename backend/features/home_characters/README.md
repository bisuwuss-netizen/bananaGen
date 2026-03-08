# Home Characters Feature

This folder contains the standalone backend module for the lightweight home-page character interaction.

- `schemas.py`: typed payload contracts for the feature
- `service.py`: static feature configuration builder
- `router.py`: read-only API route consumed by the frontend feature folder

Only `backend/app_fastapi.py` should need to reference this module from outside the folder.
