# DST Admin product constraints

The backend's `docs/product-usage-scenarios.md` is the deployment and product
baseline. The dominant user has one 2 vCPU / 4 GiB All-in-One host, one Room,
and Master plus Caves. Keep that path direct and uncluttered.

Only expose fleet-oriented scope controls when multiple Runtime targets exist.
Multi All-in-One management, one Controller with Agents, and Rooms split across
machines must remain available as progressive extensions of the same Room and
Runtime UI. Controller-only settings must be labeled as such and must not look
like they change with the selected Runtime target.

## Public documentation and local data

Keep published docs focused on installation, supported behavior, operation, and
compatibility. Put development diaries, discussions, machine-specific service
notes, and private research in ignored `.local-docs/`. Never commit real configs,
credentials, player records, saves, or build artifacts. Preserve existing local
data when removing it from Git tracking. Deployment documentation belongs in the
backend repository; its packages include the official frontend.
