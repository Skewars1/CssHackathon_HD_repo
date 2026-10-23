<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

# AGENTS.md

- Buyer phones are SHA-256 hashed in the browser (src/lib/surecod.ts); raw phones, names, and addresses are never sent or stored — the database only knows account_id + phone_hash.
- All writes go through security-definer RPCs (place_order, resolve_parcel); tables are read-only to clients via RLS, so scoring rules live in SQL, not the UI.
- Reason → point values are duplicated in resolve_parcel (source of truth) and src/lib/surecod.ts (display); change both together.
